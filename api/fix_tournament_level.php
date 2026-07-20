<?php
/**
 * Script administrativo temporal para corregir el tipo de un torneo cerrado de 'barrio' a 'ascenso'
 * y recalcular los puntos oficiales del ranking.
 * 
 * INSTRUCCIONES DE USO:
 * 1. Subir este archivo a la carpeta `api/` en el servidor de producción.
 * 2. Acceder a: https://pancorazo.cl/api/fix_tournament_level.php
 * 3. Seleccionar el torneo a corregir y hacer clic en "Cambiar a Ascenso y Recalcular".
 * 4. ELIMINAR este archivo inmediatamente después de usarlo.
 */

// Desactivar checkAuth de db.php temporalmente para permitir ejecución directa
define('BYPASS_AUTH', true);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/OfficialRankingHelper.php';

// Respuesta predeterminada a HTML para interfaz legible en el navegador
header("Content-Type: text/html; charset=UTF-8");

echo "<!DOCTYPE html>
<html>
<head>
    <title>Corrector de Nivel de Torneo y Recálculo - Pancorazo</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1000px; margin: 40px auto; padding: 0 20px; color: #e2e8f0; background: #0f172a; }
        h1, h2, h3 { color: #f8fafc; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; }
        h1 { border-bottom: 2px solid #ffd900; padding-bottom: 15px; margin-bottom: 30px; }
        .card { background: #1e293b; padding: 25px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
        .success { border-left: 5px solid #10b981; }
        .error-card { border-left: 5px solid #ef4444; background: #451a1a; border-color: #7f1d1d; }
        .warning-card { border-left: 5px solid #f59e0b; background: #45301a; border-color: #78350f; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; background: #0f172a; border-radius: 6px; overflow: hidden; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #334155; }
        th { background-color: #1e293b; color: #94a3b8; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        td { font-size: 0.9rem; }
        .badge { display: inline-block; padding: 4px 8px; font-size: 0.75rem; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
        .badge-jo { background-color: #10b981; color: #ffffff; }
        .badge-no-jo { background-color: #64748b; color: #ffffff; }
        .badge-level { background-color: #ffd900; color: #000000; }
        .btn { display: inline-block; background: #ffd900; color: #000000; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: 700; font-size: 0.85rem; border: none; cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
        .btn:hover { background: #e6c400; transform: translateY(-1px); }
        .btn-secondary { background: #475569; color: #ffffff; }
        .btn-secondary:hover { background: #334155; }
        .alert-danger { color: #fca5a5; font-weight: bold; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <h1>Corrector de Nivel de Torneo y Recálculo</h1>";

// OBTENER ACCIONES
$tournamentId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$run = isset($_GET['run']) && $_GET['run'] === 'true';

if (isset($_GET['recalculate_elo']) && $_GET['recalculate_elo'] === 'true') {
    try {
        $pdo->beginTransaction();

        $stmtTeams = $pdo->query("SELECT id, name, current_elo FROM teams");
        $teamsList = $stmtTeams->fetchAll();
        
        $eloMap = [];
        $initialEloMap = [];
        foreach ($teamsList as $t) {
            $eloMap[$t['id']] = 1200;
            $initialEloMap[$t['id']] = [
                'name' => $t['name'],
                'old_elo' => (float)$t['current_elo']
            ];
        }

        $pdo->exec("DELETE FROM elo_history");

        $sqlMatches = "SELECT m.*, 
                              tr.tournament_type, tr.tournament_level, tr.name as tournament_name
                       FROM matches m
                       LEFT JOIN tournaments tr ON m.tournament_id = tr.id
                       WHERE m.deleted_at IS NULL
                         AND m.status IN ('Played', 'Walkover', 'COMPLETED', 'PLAYED', 'WALKOVER')
                       ORDER BY COALESCE(m.played_at, '2000-01-01 00:00:00') ASC, m.id ASC";
        
        $matchesStmt = $pdo->query($sqlMatches);
        $matches = $matchesStmt->fetchAll();

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

            if (!isset($eloMap[$homeId])) $eloMap[$homeId] = 1200;
            if (!isset($eloMap[$awayId])) $eloMap[$awayId] = 1200;

            $diffHome = 0;
            $diffAway = 0;

            if ($m['admin_elo_home'] !== null && $m['admin_elo_away'] !== null) {
                $diffHome = (int)$m['admin_elo_home'];
                $diffAway = (int)$m['admin_elo_away'];
                $officialMatchesCount++;
            } else {
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
                        $k = 20;
                    }
                } else {
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

            if ($diffHome !== 0 || $diffAway !== 0) {
                $oldHome = $eloMap[$homeId];
                $newHome = $oldHome + $diffHome;
                $eloMap[$homeId] = $newHome;

                $oldAway = $eloMap[$awayId];
                $newAway = $oldAway + $diffAway;
                $eloMap[$awayId] = $newAway;

                $recordedAt = $m['played_at'] ?: date('Y-m-d H:i:s');
                $reasonHome = $m['admin_reason'] ?? ($m['tournament_name'] ?: 'Torneo Oficial');

                $historyInsertStmt->execute([
                    ':team_id' => $homeId,
                    ':match_id' => $m['id'],
                    ':old_elo' => $oldHome,
                    ':new_elo' => $newHome,
                    ':diff' => $diffHome,
                    ':reason' => $reasonHome,
                    ':recorded_at' => $recordedAt
                ]);

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

        $updateTeamEloStmt = $pdo->prepare("UPDATE teams SET current_elo = :elo WHERE id = :id");
        foreach ($eloMap as $teamId => $newElo) {
            $updateTeamEloStmt->execute([
                ':elo' => $newElo,
                ':id' => $teamId
            ]);
        }

        $pdo->commit();

        echo "<div class='card success'>
                <h2>¡Recálculo de ELO Completo Exitoso!</h2>
                <p><strong>Partidos procesados totales:</strong> {$processedMatchesCount}</p>
                <p><strong>Partidos de Torneos Oficiales (con ajuste ELO):</strong> {$officialMatchesCount}</p>
                <p><strong>Partidos Pichanga / Amistosos (sin ajuste ELO):</strong> {$pichangaMatchesCount}</p>
                <p><a class='btn btn-secondary' href='fix_tournament_level.php'>Volver al Listado</a></p>
              </div>";

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo "<div class='card error-card'><h2>Error al recalcular ELO: " . htmlspecialchars($e->getMessage()) . "</h2></div>";
    }
} elseif ($tournamentId > 0 && $run) {
    // PROCESAR RECALCULO
    try {
        $pdo->beginTransaction();

        // 1. Obtener información del torneo
        $stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
        $stmt->execute([$tournamentId]);
        $tournament = $stmt->fetch();

        if (!$tournament) {
            throw new Exception("Torneo con ID $tournamentId no encontrado.");
        }

        if ($tournament['status'] !== 'closed') {
            throw new Exception("El torneo debe estar cerrado ('closed') para recalcular el ranking.");
        }

        if (!$tournament['is_jo']) {
            echo "<div class='card warning-card'>";
            echo "<h2>Advertencia: Torneo no marcado como JO</h2>";
            echo "<p>El torneo <strong>" . htmlspecialchars($tournament['name']) . "</strong> no está marcado como Juegos Oficiales (<code>is_jo = 0</code>). El recálculo de ranking solo aplica a torneos oficiales (JO). ¿Deseas marcarlo también como oficial (is_jo = 1)?</p>";
            echo "<p><a class='btn' href='?id=$tournamentId&run=true&force_jo=true'>Sí, marcar como JO y recalcular</a> 
                     <a class='btn btn-secondary' href='fix_tournament_level.php'>Cancelar y volver</a></p>";
            echo "</div>";
            $pdo->rollBack();
            echo "</body></html>";
            exit();
        }

        $forceJo = isset($_GET['force_jo']) && $_GET['force_jo'] === 'true';

        echo "<div class='card success'>";
        echo "<h2>Paso 1: Actualización de Nivel de Torneo</h2>";
        
        // Actualizar nivel a ascenso
        $stmtUpdateT = $pdo->prepare("UPDATE tournaments SET tournament_level = 'ascenso', tournament_type = 'ascenso' WHERE id = ?");
        $stmtUpdateT->execute([$tournamentId]);
        echo "<p>Se ha cambiado el <code>tournament_level</code> y <code>tournament_type</code> del torneo <strong>\"" . htmlspecialchars($tournament['name']) . "\" (ID: $tournamentId)</strong> a <strong>'ascenso'</strong> en la base de datos.</p>";
        echo "</div>";

        // 2. Obtener historial anterior de este torneo
        $stmtHistory = $pdo->prepare("SELECT rh.*, t.name as team_name FROM official_ranking_history rh JOIN teams t ON rh.team_id = t.id WHERE rh.tournament_id = ?");
        $stmtHistory->execute([$tournamentId]);
        $historyRecords = $stmtHistory->fetchAll();

        echo "<div class='card'>";
        echo "<h2>Paso 2: Reversión de Puntos Oficiales Anteriores</h2>";
        echo "<p>Se encontraron " . count($historyRecords) . " registros históricos asociados a este torneo.</p>";
        
        // 3. Revertir puntos y legados anteriores de los equipos
        $stmtUpdateTeam = $pdo->prepare("UPDATE teams SET 
            official_ranking_points = GREATEST(0.00, official_ranking_points - :points),
            official_legacy_count = GREATEST(0, official_legacy_count - 1)
            WHERE id = :team_id");

        echo "<ul>";
        foreach ($historyRecords as $record) {
            $stmtUpdateTeam->execute([
                ':points' => $record['points_earned'],
                ':team_id' => $record['team_id']
            ]);
            echo "<li>Revertidos <strong>" . number_format($record['points_earned'], 2) . "</strong> puntos de ranking y decrementado el legado del equipo: <strong>" . htmlspecialchars($record['team_name']) . "</strong> (ID: " . $record['team_id'] . ")</li>";
        }
        echo "</ul>";

        // 4. Borrar historial anterior del torneo en la tabla official_ranking_history
        $stmtDeleteHistory = $pdo->prepare("DELETE FROM official_ranking_history WHERE tournament_id = ?");
        $stmtDeleteHistory->execute([$tournamentId]);
        echo "<p>Registros históricos anteriores eliminados correctamente de la base de datos.</p>";
        echo "</div>";

        // 5. Recalcular utilizando processOfficialRanking
        echo "<div class='card success'>";
        echo "<h2>Paso 3: Recálculo de Puntos Oficiales (Multiplicador 1.5 - Ascenso)</h2>";

        // Obtener el podio del torneo
        $stmtPodiums = $pdo->prepare("SELECT position, team_id FROM tournament_podiums WHERE tournament_id = ?");
        $stmtPodiums->execute([$tournamentId]);
        $podiumRows = $stmtPodiums->fetchAll();
        $podium = [];
        foreach ($podiumRows as $p) {
            $podium[$p['position']] = $p['team_id'];
        }

        // Reconstruir estadísticas
        $stats = [
            'top_scorer_team_id' => $tournament['top_scorer_team_id'],
            'best_defense_team_id' => $tournament['best_defense_team_id'],
            'fair_play_team_id' => $tournament['fair_play_team_id']
        ];

        // Llamar al helper oficial con el nuevo nivel 'ascenso'
        processOfficialRanking($pdo, $tournamentId, $stats, 'ascenso', $podium);
        echo "<p>Recálculo de ranking completado con éxito mediante la función oficial <code>processOfficialRanking()</code>.</p>";

        // Obtener los nuevos registros calculados
        $stmtNewHistory = $pdo->prepare("
            SELECT rh.*, t.name as team_name 
            FROM official_ranking_history rh 
            JOIN teams t ON rh.team_id = t.id 
            WHERE rh.tournament_id = ? 
            ORDER BY rh.points_earned DESC
        ");
        $stmtNewHistory->execute([$tournamentId]);
        $newHistory = $stmtNewHistory->fetchAll();

        echo "<h3>Nuevos Puntos de Ranking Asignados (Multiplicador Torneo: 1.5)</h3>";
        echo "<table>
                <thead>
                    <tr>
                        <th>Equipo</th>
                        <th>ID</th>
                        <th>Puntos Base</th>
                        <th>Puntos Finales Recalculados</th>
                        <th>Bono / Resumen Multiplicadores</th>
                        <th>Mult. Nivel</th>
                        <th>Mult. Legado</th>
                    </tr>
                </thead>
                <tbody>";
        foreach ($newHistory as $row) {
            echo "<tr>
                    <td><strong>" . htmlspecialchars($row['team_name']) . "</strong></td>
                    <td>" . $row['team_id'] . "</td>
                    <td>" . $row['base_points'] . "</td>
                    <td><strong>" . number_format($row['points_earned'], 2) . "</strong></td>
                    <td>" . htmlspecialchars($row['multipliers_summary'] ?: 'Sin bonificaciones') . "</td>
                    <td>" . number_format($row['tournament_multiplier'], 1) . "</td>
                    <td>" . number_format($row['legacy_multiplier'], 1) . "</td>
                  </tr>";
        }
        echo "</tbody></table>";
        echo "</div>";

        $pdo->commit();

        echo "<div class='card success'>";
        echo "<h2>¡Proceso de Recálculo Terminado!</h2>";
        echo "<p>El torneo <strong>" . htmlspecialchars($tournament['name']) . "</strong> ha sido corregido a Ascenso y sus puntos del ranking se recalcularon correctamente con el multiplicador 1.5.</p>";
        echo "<p class='alert-danger'>¡ATENCIÓN! Por razones de seguridad, debes eliminar este archivo (<code>api/fix_tournament_level.php</code>) del servidor inmediatamente.</p>";
        echo "<p><a class='btn btn-secondary' href='fix_tournament_level.php'>Volver al Listado</a></p>";
        echo "</div>";

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo "<div class='card error-card'>";
        echo "<h2>Error durante el procesamiento</h2>";
        echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
        echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
        echo "<p><a class='btn btn-secondary' href='fix_tournament_level.php'>Volver al Listado</a></p>";
        echo "</div>";
    }
} elseif ($tournamentId > 0 && isset($_GET['force_jo']) && $_GET['force_jo'] === 'true') {
    // FORZAR JO Y RECALCULAR
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("UPDATE tournaments SET is_jo = 1 WHERE id = ?");
        $stmt->execute([$tournamentId]);
        $pdo->commit();
        
        // Redirigir a procesar el recálculo
        header("Location: fix_tournament_level.php?id=$tournamentId&run=true");
        exit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        echo "<div class='card error-card'><h2>Error al forzar JO: " . htmlspecialchars($e->getMessage()) . "</h2></div>";
    }
} else {
    // LISTAR TORNEOS
    try {
        $stmt = $pdo->query("
            SELECT t.id, t.name, t.tournament_level, t.tournament_type, t.status, t.is_jo, t.end_date,
                   (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) as participants_count
            FROM tournaments t
            WHERE t.status = 'closed' AND t.deleted_at IS NULL
            ORDER BY t.end_date DESC
        ");
        $tournaments = $stmt->fetchAll();

        echo "<div class='card warning-card'>";
        echo "<p><strong>Aviso de seguridad:</strong> Este script permite modificar datos directamente en la base de datos de producción. Por favor, realiza una copia de seguridad de la base de datos antes de proceder. Una vez finalizado el recálculo, <strong>debes eliminar este archivo</strong> del servidor.</p>";
        echo "</div>";

        echo "<div class='card'>";
        echo "<h2>Torneos Cerrados Disponibles</h2>";
        echo "<p>A continuación se listan todos los torneos cerrados. Selecciona el que deseas corregir a <strong>'ascenso'</strong> y recalcular su puntaje:</p>";

        if (count($tournaments) === 0) {
            echo "<p>No se encontraron torneos cerrados en la base de datos.</p>";
        } else {
            echo "<table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre del Torneo</th>
                            <th>Nivel Actual</th>
                            <th>Tipo Actual</th>
                            <th>JO (Oficial)</th>
                            <th>Participantes</th>
                            <th>Fecha Cierre</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>";
            foreach ($tournaments as $t) {
                $joBadge = $t['is_jo'] ? "<span class='badge badge-jo'>Sí</span>" : "<span class='badge badge-no-jo'>No</span>";
                $levelClass = ($t['tournament_level'] === 'ascenso') ? 'badge-jo' : 'badge-level';
                echo "<tr>
                        <td>" . $t['id'] . "</td>
                        <td><strong>" . htmlspecialchars($t['name']) . "</strong></td>
                        <td><span class='badge $levelClass'>" . htmlspecialchars($t['tournament_level'] ?? 'N/D') . "</span></td>
                        <td>" . htmlspecialchars($t['tournament_type'] ?? 'N/D') . "</td>
                        <td>$joBadge</td>
                        <td>" . $t['participants_count'] . "</td>
                        <td>" . ($t['end_date'] ?: 'S/D') . "</td>
                        <td>";
                if ($t['tournament_level'] === 'ascenso' && $t['tournament_type'] === 'ascenso') {
                    echo "<span style='color: #10b981; font-weight: bold; font-size: 0.8rem; text-transform: uppercase;'>Ya es Ascenso</span> | 
                          <a class='btn btn-secondary' style='padding: 4px 8px; font-size: 0.75rem;' href='?id=" . $t['id'] . "&run=true'>Recalcular</a>";
                } else {
                    echo "<a class='btn' style='padding: 4px 8px; font-size: 0.75rem;' href='?id=" . $t['id'] . "&run=true'>Cambiar y Recalcular</a>";
                }
                echo "</td>
                      </tr>";
            }
            echo "</tbody></table>";
        }
        echo "</div>";

    } catch (Exception $e) {
        echo "<div class='card error-card'>";
        echo "<h2>Error al listar torneos</h2>";
        echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
        echo "</div>";
    }
}

echo "</body>
</html>";
?>
