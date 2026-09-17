<?php
require_once 'db.php';
require_once 'OfficialRankingHelper.php';
require_once 'StandingsHelper.php';
require_once 'Engine/EngineFactory.php';

// Verificar autenticación de administrador
try {
    $currentUser = checkAuth(['SUPER_ADMIN', 'ADMIN']);
} catch (Exception $e) {
    sendResponse(["error" => "No autorizado. Inicie sesión como administrador."], 401);
}

$tournamentId = 0;
if (isset($_GET['id'])) {
    $tournamentId = (int)$_GET['id'];
} elseif (isset($_GET['tournament_id'])) {
    $tournamentId = (int)$_GET['tournament_id'];
}

if ($tournamentId <= 0) {
    sendResponse(["error" => "ID de torneo inválido o no especificado"], 400);
}

try {
    $pdo->beginTransaction();

    // 1. Obtener información del torneo
    $stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
    $stmt->execute([$tournamentId]);
    $tournament = $stmt->fetch();

    if (!$tournament) {
        throw new Exception("Torneo no encontrado");
    }

    $tournamentLevel = $tournament['tournament_level'] ?? $tournament['tournament_type'] ?? 'barrio';

    // 2. Generar/actualizar la tabla de clasificaciones (standings) actual
    $standings = updateTournamentStandings($pdo, $tournamentId);
    if (empty($standings)) {
        throw new Exception("No hay participantes o partidos registrados para calcular clasificaciones.");
    }

    // 3. Auto-calcular Goleadores (GF máximo)
    $maxGf = 0;
    foreach ($standings as $s) {
        $gf = (int)($s['gf'] ?? 0);
        if ($gf > $maxGf) {
            $maxGf = $gf;
        }
    }
    $topScorers = [];
    if ($maxGf > 0) {
        foreach ($standings as $s) {
            if ((int)($s['gf'] ?? 0) === $maxGf) {
                $topScorers[] = (int)$s['team_id'];
            }
        }
    }

    // 4. Auto-calcular Mejor Defensa (GC mínimo)
    $minGc = null;
    foreach ($standings as $s) {
        $gc = (int)($s['gc'] ?? 0);
        if ($minGc === null || $gc < $minGc) {
            $minGc = $gc;
        }
    }
    $bestDefenses = [];
    if ($minGc !== null) {
        foreach ($standings as $s) {
            if ((int)($s['gc'] ?? 0) === $minGc) {
                $bestDefenses[] = (int)$s['team_id'];
            }
        }
    }

    // 5. Auto-calcular Fair Play (Menor fair_play_score)
    $minFp = null;
    foreach ($standings as $s) {
        $fp = (int)($s['fair_play_score'] ?? 0);
        if ($minFp === null || $fp < $minFp) {
            $minFp = $fp;
        }
    }
    $fairPlays = [];
    if ($minFp !== null) {
        foreach ($standings as $s) {
            if ((int)($s['fair_play_score'] ?? 0) === $minFp) {
                $fairPlays[] = (int)$s['team_id'];
            }
        }
    }

    $topScorerStr = implode(',', $topScorers);
    $bestDefenseStr = implode(',', $bestDefenses);
    $fairPlayStr = implode(',', $fairPlays);

    // 6. Actualizar las columnas en la tabla `tournaments`
    $stmtUpdateT = $pdo->prepare("UPDATE tournaments SET 
        status = 'closed',
        end_date = IFNULL(end_date, NOW()),
        top_scorer_team_id = ?,
        best_defense_team_id = ?,
        fair_play_team_id = ?
        WHERE id = ?");
    $stmtUpdateT->execute([
        $topScorerStr !== '' ? $topScorerStr : null,
        $bestDefenseStr !== '' ? $bestDefenseStr : null,
        $fairPlayStr !== '' ? $fairPlayStr : null,
        $tournamentId
    ]);

    // 7. Revertir puntos y legados de historial previo del ranking en este torneo
    $stmtHistory = $pdo->prepare("SELECT team_id, points_earned FROM official_ranking_history WHERE tournament_id = ?");
    $stmtHistory->execute([$tournamentId]);
    $historyRecords = $stmtHistory->fetchAll();

    $stmtUpdateTeam = $pdo->prepare("UPDATE teams SET 
        official_ranking_points = GREATEST(0.00, official_ranking_points - :points),
        official_legacy_count = GREATEST(0, official_legacy_count - 1)
        WHERE id = :team_id");

    foreach ($historyRecords as $record) {
        $stmtUpdateTeam->execute([
            ':points' => $record['points_earned'],
            ':team_id' => $record['team_id']
        ]);
    }

    // 8. Borrar historial anterior del torneo en official_ranking_history
    $stmtDeleteHistory = $pdo->prepare("DELETE FROM official_ranking_history WHERE tournament_id = ?");
    $stmtDeleteHistory->execute([$tournamentId]);

    // 9. Reconstruir/Obtener el podio registrado
    $stmtPodiums = $pdo->prepare("SELECT position, team_id FROM tournament_podiums WHERE tournament_id = ?");
    $stmtPodiums->execute([$tournamentId]);
    $podiumRows = $stmtPodiums->fetchAll();
    $podium = [];
    foreach ($podiumRows as $p) {
        $podium[$p['position']] = $p['team_id'];
    }

    // Si el podio está vacío en la BD (por ejemplo, porque el cierre falló antes de registrar el podio),
    // intentamos obtener las sugerencias del motor del torneo
    if (empty($podium)) {
        $engine = EngineFactory::getEngine($pdo, $tournamentId);
        $autoPodium = $engine->getPodium();
        if (!empty($autoPodium)) {
            foreach ($autoPodium as $p) {
                if (is_array($p) && isset($p['team_id'])) {
                    $teamId = $p['team_id'];
                    $pos = $p['position'] ?? 1;
                } else {
                    $teamId = $p;
                    $pos = count($podium) + 1;
                }
                $podium[$pos] = $teamId;
            }
        } else {
            // Fallback total: usar los primeros equipos de la tabla de posiciones
            foreach ($standings as $i => $s) {
                $podium[$i + 1] = $s['team_id'];
            }
        }

        // Guardar el podio autocalculado en la BD
        $pdo->prepare("DELETE FROM tournament_podiums WHERE tournament_id = ?")->execute([$tournamentId]);
        $stmtInsertPod = $pdo->prepare("INSERT INTO tournament_podiums (tournament_id, team_id, position) VALUES (?, ?, ?)");
        foreach ($podium as $pos => $tid) {
            if (!empty($tid)) {
                $stmtInsertPod->execute([$tournamentId, $tid, (int)$pos]);
            }
        }
    }

    // 10. Volver a procesar el ranking oficial con las nuevas estadísticas corregidas
    $stats = [
        'top_scorer_team_id' => $topScorers,
        'best_defense_team_id' => $bestDefenses,
        'fair_play_team_id' => $fairPlays
    ];

    processOfficialRanking($pdo, $tournamentId, $stats, $tournamentLevel, $podium);

    // Obtener los nuevos registros calculados para retornar
    $stmtNewHistory = $pdo->prepare("SELECT team_id, base_points, points_earned, multipliers_summary FROM official_ranking_history WHERE tournament_id = ?");
    $stmtNewHistory->execute([$tournamentId]);
    $newHistory = $stmtNewHistory->fetchAll();

    if ($pdo->inTransaction()) {
        $pdo->commit();
    }

    sendResponse([
        "status" => "success",
        "message" => "Torneo desarmado, estadísticas corregidas automáticamente y ranking recalculado con éxito.",
        "details" => [
            "top_scorers" => $topScorers,
            "best_defenses" => $bestDefenses,
            "fair_plays" => $fairPlays,
            "recalculated_teams_count" => count($newHistory),
            "new_calculations" => $newHistory
        ]
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse([
        "error" => "Error al desarmar y recalcular el torneo: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], 500);
}
?>
