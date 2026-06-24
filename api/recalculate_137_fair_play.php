<?php
/**
 * Script temporal para vaciar y recalcular los puntos oficiales del torneo 137.
 * Aplica el bono de Fair Play a los equipos 48, 33, 20, 23, 24 y 17.
 * 
 * INSTRUCCIONES DE USO:
 * 1. Subir este archivo a la carpeta `api/` en el servidor de producción.
 * 2. Acceder a: https://pancorazo.cl/api/recalculate_137_fair_play.php?run=true
 * 3. Verificar los resultados impresos en pantalla.
 * 4. ELIMINAR este archivo inmediatamente después de usarlo.
 */

// Desactivar checkAuth de db.php temporalmente para permitir ejecución directa
define('BYPASS_AUTH', true);
// Forzar a que el cálculo del ranking oficial para este proceso considere el ELO de todos los equipos como 1200
define('FORCE_1200_ELO', true);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/OfficialRankingHelper.php';

// Cambiar la respuesta predeterminada a HTML para que sea legible en navegador
header("Content-Type: text/html; charset=UTF-8");

echo "<!DOCTYPE html>
<html>
<head>
    <title>Recalculador Torneo 137 - Fair Play</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #333; background: #f5f7fa; }
        h1, h2 { color: #1e293b; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); margin-bottom: 25px; }
        .success { border-left: 5px solid #10b981; }
        .error-card { border-left: 5px solid #ef4444; background: #fef2f2; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; color: #64748b; font-weight: 600; }
        .badge { display: inline-block; padding: 4px 8px; font-size: 0.75rem; font-weight: 700; border-radius: 4px; }
        .badge-fp { background-color: #d1fae5; color: #065f46; }
        .badge-normal { background-color: #e2e8f0; color: #334155; }
        .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; }
        .btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <h1>Recálculo de Puntos y Bono Fair Play - Torneo 137</h1>";

if (!isset($_GET['run']) || $_GET['run'] !== 'true') {
    echo "
    <div class='card'>
        <p>Este script vaciará los puntos oficiales previamente asignados en el torneo 137, aplicará el bono de Fair Play a los equipos <strong>48, 33, 20, 23, 24 y 17</strong>, y volverá a calcular los puntos oficiales del ranking.</p>
        <p><strong>Por seguridad, realiza un respaldo de la base de datos antes de proceder.</strong></p>
        <p style='margin-top: 20px;'><a class='btn' href='?run=true'>Iniciar Recálculo</a></p>
    </div>
    </body>
    </html>";
    exit();
}

try {
    $tournamentId = 137;
    $newFairPlayTeams = '48,33,20,23,24,17';
    $fairPlayArray = [48, 33, 20, 23, 24, 17];

    $pdo->beginTransaction();

    // 1. Obtener información del torneo
    $stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
    $stmt->execute([$tournamentId]);
    $tournament = $stmt->fetch();

    if (!$tournament) {
        throw new Exception("Torneo con ID $tournamentId no encontrado en la base de datos.");
    }

    if ($tournament['status'] !== 'closed') {
        throw new Exception("El torneo con ID $tournamentId debe estar cerrado para recalcular el ranking.");
    }

    if (!$tournament['is_jo']) {
        throw new Exception("El torneo con ID $tournamentId no está marcado como JO (Juegos Oficiales).");
    }

    echo "<div class='card success'>";
    echo "<h2>Paso 1: Información del Torneo</h2>";
    echo "<p><strong>Nombre del Torneo:</strong> " . htmlspecialchars($tournament['name']) . "<br>";
    echo "<strong>Estado:</strong> " . htmlspecialchars($tournament['status']) . "<br>";
    echo "<strong>Nivel de Competencia:</strong> " . htmlspecialchars($tournament['competitiveness_level']) . "<br>";
    echo "<strong>Nivel de Torneo:</strong> " . htmlspecialchars($tournament['tournament_level'] ?? 'tienda') . "</p>";
    echo "</div>";

    // 2. Obtener historial anterior de este torneo
    $stmtHistory = $pdo->prepare("SELECT rh.*, t.name as team_name FROM official_ranking_history rh JOIN teams t ON rh.team_id = t.id WHERE rh.tournament_id = ?");
    $stmtHistory->execute([$tournamentId]);
    $historyRecords = $stmtHistory->fetchAll();

    echo "<div class='card'>";
    echo "<h2>Paso 2: Reversión de Puntos Anteriores</h2>";
    echo "<p>Se encontraron " . count($historyRecords) . " registros históricos a revertir.</p>";
    
    // 3. Revertir puntos y legados anteriores
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
        echo "<li>Revertidos <strong>" . number_format($record['points_earned'], 2) . "</strong> puntos y decrementado legado para el equipo: " . htmlspecialchars($record['team_name']) . " (ID: " . $record['team_id'] . ")</li>";
    }
    echo "</ul>";

    // 4. Borrar historial anterior del torneo en la tabla ranking history
    $stmtDeleteHistory = $pdo->prepare("DELETE FROM official_ranking_history WHERE tournament_id = ?");
    $stmtDeleteHistory->execute([$tournamentId]);
    echo "<p>Historial anterior eliminado correctamente de la base de datos.</p>";
    echo "</div>";

    // 5. Actualizar fair_play_team_id en la tabla tournaments
    echo "<div class='card success'>";
    echo "<h2>Paso 3: Aplicación de los nuevos equipos de Fair Play</h2>";
    $stmtUpdateFP = $pdo->prepare("UPDATE tournaments SET fair_play_team_id = ? WHERE id = ?");
    $stmtUpdateFP->execute([$newFairPlayTeams, $tournamentId]);
    echo "<p>Columna <code>fair_play_team_id</code> actualizada en la tabla <code>tournaments</code> para el ID 137.</p>";
    echo "<p>Equipos beneficiados con bono Fair Play: <strong>$newFairPlayTeams</strong></p>";
    echo "</div>";

    // 6. Volver a procesar el ranking oficial usando el helper
    echo "<div class='card'>";
    echo "<h2>Paso 4: Recálculo de Puntos Oficiales</h2>";

    // Obtener podio
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
        'fair_play_team_id' => $newFairPlayTeams
    ];

    $tournamentLevel = $tournament['tournament_level'] ?? 'tienda';

    // Llamar al helper oficial
    processOfficialRanking($pdo, $tournamentId, $stats, $tournamentLevel, $podium);
    echo "<p>Cálculo de ranking completado con éxito mediante <code>processOfficialRanking()</code>.</p>";

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

    echo "<h3>Nuevos Resultados Calculados</h3>";
    echo "<table>
            <thead>
                <tr>
                    <th>Equipo</th>
                    <th>ID</th>
                    <th>Ptos Base (Ganas/Empates)</th>
                    <th>Ptos Ganados Finales</th>
                    <th>Multiplicadores Aplicados</th>
                    <th>Bono Fair Play</th>
                </tr>
            </thead>
            <tbody>";
    foreach ($newHistory as $row) {
        $isFp = in_array((int)$row['team_id'], $fairPlayArray);
        $fpBadge = $isFp ? "<span class='badge badge-fp'>Sí (+20%)</span>" : "<span class='badge badge-normal'>No</span>";
        echo "<tr>
                <td><strong>" . htmlspecialchars($row['team_name']) . "</strong></td>
                <td>" . $row['team_id'] . "</td>
                <td>" . $row['base_points'] . "</td>
                <td><strong>" . number_format($row['points_earned'], 2) . "</strong></td>
                <td>" . htmlspecialchars($row['multipliers_summary'] ?: 'Asistencia base únicamente') . "</td>
                <td>$fpBadge</td>
              </tr>";
    }
    echo "</tbody></table>";

    // Sección de Depuración Detallada de Partidos
    echo "<h3>Partidos y Puntos de Cancha Detallados (Depuración)</h3>";
    $stmtDebugMatches = $pdo->prepare("
        SELECT m.id, m.team_home_id, m.team_away_id, m.score_home, m.score_away, m.status, m.deleted_at, m.is_wo,
               t1.name as home_name, t2.name as away_name
        FROM matches m
        JOIN teams t1 ON m.team_home_id = t1.id
        JOIN teams t2 ON m.team_away_id = t2.id
        WHERE m.tournament_id = ? 
          AND m.deleted_at IS NULL
    ");
    $stmtDebugMatches->execute([$tournamentId]);
    $debugMatches = $stmtDebugMatches->fetchAll();

    echo "<table>
            <thead>
                <tr>
                    <th>Partido ID</th>
                    <th>Local</th>
                    <th>ELO Loc</th>
                    <th>Visita</th>
                    <th>ELO Vis</th>
                    <th>Resultado</th>
                    <th>Estado</th>
                    <th>Ptos Base Loc</th>
                    <th>Ptos Base Vis</th>
                </tr>
            </thead>
            <tbody>";
    foreach ($debugMatches as $m) {
        $homeId = $m['team_home_id'];
        $awayId = $m['team_away_id'];
        $scoreHome = $m['score_home'];
        $scoreAway = $m['score_away'];
        $status = $m['status'];
        $isWo = $m['is_wo'] ?? 0;
        
        if (defined('FORCE_1200_ELO') && FORCE_1200_ELO) {
            $eloHome = 1200;
            $eloAway = 1200;
        } else {
            $elos = getElosBeforeMatch($pdo, $m['id'], $homeId, $awayId);
            $eloHome = $elos['home'];
            $eloAway = $elos['away'];
        }
        
        $ptsHome = 0;
        $ptsAway = 0;
        $excluido = false;
        $isWalkover = (strtolower($status) === 'walkover') || ($isWo == 1);
        
        if ($scoreHome === null || $scoreAway === null || (strtolower($status) === 'scheduled')) {
            $excluido = true;
        } elseif ($isWalkover) {
            if ($scoreHome > $scoreAway) {
                $ptsHome = 10;
            } elseif ($scoreAway > $scoreHome) {
                $ptsAway = 10;
            }
        } else {
            if ($scoreHome > $scoreAway) {
                if ($eloAway - $eloHome > 100) {
                    $ptsHome = 20; // Matagigantes
                } else {
                    $ptsHome = 10;
                }
            } elseif ($scoreAway > $scoreHome) {
                if ($eloHome - $eloAway > 100) {
                    $ptsAway = 20; // Matagigantes
                } else {
                    $ptsAway = 10;
                }
            } else {
                $diff = abs($eloHome - $eloAway);
                if ($diff <= 100) {
                    $ptsHome = 5;
                    $ptsAway = 5;
                } else {
                    if ($eloHome > $eloAway) {
                        $ptsHome = 2;
                        $ptsAway = 8;
                    } else {
                        $ptsAway = 2;
                        $ptsHome = 8;
                    }
                }
            }
        }
        
        if ($excluido) {
            $statusText = "<span style='color:#ef4444;'>Excluido ($status)</span>";
        } elseif ($isWalkover) {
            $statusText = "<span style='color:#3b82f6;'>W.O. (+10)</span>";
        } else {
            $statusText = "<span style='color:#10b981;'>Procesado ($status)</span>";
        }
        
        echo "<tr>
                <td>" . $m['id'] . "</td>
                <td>" . htmlspecialchars($m['home_name']) . " (ID: $homeId)</td>
                <td>" . $eloHome . "</td>
                <td>" . htmlspecialchars($m['away_name']) . " (ID: $awayId)</td>
                <td>" . $eloAway . "</td>
                <td>" . ($scoreHome === null ? 'N/A' : "$scoreHome - $scoreAway") . "</td>
                <td>" . $statusText . "</td>
                <td>" . ($excluido ? '-' : $ptsHome) . "</td>
                <td>" . ($excluido ? '-' : $ptsAway) . "</td>
              </tr>";
    }
    echo "</tbody></table>";
    echo "</div>";

    // Commit de la transacción
    $pdo->commit();

    echo "<div class='card success'>";
    echo "<h2>¡Proceso Completado con Éxito!</h2>";
    echo "<p>Los puntos del torneo 137 se han recalculado correctamente en la base de datos de producción.</p>";
    echo "<p style='color: #ef4444; font-weight: bold;'>¡IMPORTANTE! Recuerda eliminar este archivo (<code>api/recalculate_137_fair_play.php</code>) del servidor ahora mismo por razones de seguridad.</p>";
    echo "</div>";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "<div class='card error-card'>";
    echo "<h2>Error durante el proceso</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
}

echo "</body>
</html>";
