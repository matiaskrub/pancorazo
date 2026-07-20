<?php
/**
 * Script de Recálculo de ELO Real - Pancorazo
 * Reconstruye el historial de ELO y los puntos current_elo de todos los equipos,
 * ignorando torneos Pichanga y partidos amistosos (0 cambio ELO).
 */

define('BYPASS_AUTH', true);
require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");

try {
    $pdo->beginTransaction();

    // 1. Asegurar que torneos nombrados "Pichanga" tengan tournament_type/level = 'pichanga'
    $pdo->exec("UPDATE tournaments SET tournament_type = 'pichanga', tournament_level = 'pichanga' WHERE LOWER(name) LIKE '%pichanga%'");

    // 2. Obtener todos los equipos activos y registrar su ELO original para comparar
    $stmtTeams = $pdo->query("SELECT id, name, current_elo FROM teams");
    $teamsList = $stmtTeams->fetchAll(PDO::FETCH_ASSOC);
    
    $eloMap = [];
    $initialEloMap = [];
    foreach ($teamsList as $t) {
        $eloMap[$t['id']] = 1200.0; // ELO base inicial
        $initialEloMap[$t['id']] = [
            'name' => $t['name'],
            'old_elo' => (float)$t['current_elo']
        ];
    }

    // 3. Limpiar tabla elo_history
    $pdo->exec("DELETE FROM elo_history");

    // 4. Obtener partidos finalizados en orden cronológico
    $sqlMatches = "SELECT m.*, 
                          tr.tournament_type, tr.tournament_level, tr.name as tournament_name
                   FROM matches m
                   LEFT JOIN tournaments tr ON m.tournament_id = tr.id
                   WHERE m.deleted_at IS NULL
                     AND m.status IN ('Played', 'Walkover', 'COMPLETED', 'PLAYED', 'WALKOVER')
                   ORDER BY COALESCE(m.played_at, '2000-01-01 00:00:00') ASC, m.id ASC";
    
    $matchesStmt = $pdo->query($sqlMatches);
    $matches = $matchesStmt->fetchAll(PDO::FETCH_ASSOC);

    $processedMatchesCount = 0;
    $officialMatchesCount = 0;
    $pichangaMatchesCount = 0;

    $historyInsertStmt = $pdo->prepare("
        INSERT INTO elo_history (team_id, match_id, old_elo, new_elo, diff, reason, recorded_at)
        VALUES (:team_id, :match_id, :old_elo, :new_elo, :diff, :reason, :recorded_at)
    ");

    foreach ($matches as $m) {
        $processedMatchesCount++;
        $homeId = $m['team_home_id'];
        $awayId = $m['team_away_id'];

        if (!$homeId || !$awayId) continue;

        if (!isset($eloMap[$homeId])) $eloMap[$homeId] = 1200.0;
        if (!isset($eloMap[$awayId])) $eloMap[$awayId] = 1200.0;

        $diffHome = 0;
        $diffAway = 0;

        // Verificar si es partido con ELO fijado por Admin (Walkover manual)
        if ($m['admin_elo_home'] !== null && $m['admin_elo_away'] !== null) {
            $diffHome = (int)$m['admin_elo_home'];
            $diffAway = (int)$m['admin_elo_away'];
            $officialMatchesCount++;
        } else {
            // Determinar K según torneo
            $tType = strtolower($m['tournament_type'] ?? $m['tournament_level'] ?? '');
            $k = 0;

            if ($m['tournament_id']) {
                if ($tType === 'barrio') {
                    $k = 20;
                } elseif ($tType === 'ascenso') {
                    $k = 30;
                } elseif ($tType === 'oro') {
                    $k = 40;
                } elseif ($tType === 'pichanga') {
                    $k = 0;
                } else {
                    // Por defecto torneos no pichanga = Barrio (K=20)
                    $k = 20;
                }
            } else {
                // Partido sin torneo = Pichanga / Amistoso = K=0
                $k = 0;
            }

            if ($k > 0 && $m['score_home'] !== null && $m['score_away'] !== null) {
                $officialMatchesCount++;
                $eloHome = $eloMap[$homeId];
                $eloAway = $eloMap[$awayId];

                $We = 1 / (pow(10, -($eloHome - $eloAway) / 400) + 1);
                $W = 0.5;
                if ((int)$m['score_home'] > (int)$m['score_away']) $W = 1;
                if ((int)$m['score_home'] < (int)$m['score_away']) $W = 0;

                $G = 1;
                $diffHome = (int)round($k * $G * ($W - $We));
                $diffAway = -$diffHome;
            } else {
                $pichangaMatchesCount++;
                $diffHome = 0;
                $diffAway = 0;
            }
        }

        // Registrar en elo_history si hubo variación de ELO
        if ($diffHome !== 0 || $diffAway !== 0) {
            $oldHome = $eloMap[$homeId];
            $newHome = $oldHome + $diffHome;
            $eloMap[$homeId] = $newHome;

            $oldAway = $eloMap[$awayId];
            $newAway = $oldAway + $diffAway;
            $eloMap[$awayId] = $newAway;

            $recordedAt = $m['played_at'] ?: date('Y-m-d H:i:s');
            $reasonHome = $m['admin_reason'] ?? ($m['tournament_name'] ?: 'Torneo Oficial');

            // Insert Local
            $historyInsertStmt->execute([
                ':team_id' => $homeId,
                ':match_id' => $m['id'],
                ':old_elo' => $oldHome,
                ':new_elo' => $newHome,
                ':diff' => $diffHome,
                ':reason' => $reasonHome,
                ':recorded_at' => $recordedAt
            ]);

            // Insert Visita
            $historyInsertStmt->execute([
                ':team_id' => $awayId,
                ':match_id' => $m['id'],
                ':old_elo' => $oldAway,
                ':new_elo' => $newAway,
                ':diff' => $diffAway,
                ':reason' => $reasonHome,
                ':recorded_at' => $recordedAt
            ]);
        }
    }

    // 5. Actualizar la tabla `teams` con el nuevo `current_elo`
    $updateTeamEloStmt = $pdo->prepare("UPDATE teams SET current_elo = :elo WHERE id = :id");
    foreach ($eloMap as $teamId => $newElo) {
        $updateTeamEloStmt->execute([
            ':elo' => $newElo,
            ':id' => $teamId
        ]);
    }

    $pdo->commit();

    // Construir resumen
    $summary = [];
    foreach ($initialEloMap as $teamId => $info) {
        $newElo = $eloMap[$teamId] ?? 1200;
        $summary[] = [
            'id' => (int)$teamId,
            'name' => $info['name'],
            'old_elo' => round($info['old_elo'], 1),
            'new_elo' => round($newElo, 1),
            'diff' => round($newElo - $info['old_elo'], 1)
        ];
    }

    usort($summary, function($a, $b) {
        return $b['new_elo'] <=> $a['new_elo'];
    });

    sendResponse([
        "status" => "success",
        "message" => "Recálculo de ELO histórico completado exitosamente",
        "processed_matches" => $processedMatchesCount,
        "official_matches" => $officialMatchesCount,
        "pichanga_matches" => $pichangaMatchesCount,
        "teams" => $summary
    ]);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse([
        "status" => "error",
        "message" => "Error al recalcular ELO: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], 500);
}
?>
