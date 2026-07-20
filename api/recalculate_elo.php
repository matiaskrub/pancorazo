<?php
/**
 * Script administrativo para recalcular el ELO histórico de todos los equipos.
 * 
 * Excluye partidos de torneos 'pichanga' o amistosos no oficiales (diferencia ELO = 0).
 * Recalcula cronológicamente los ELOs para torneos oficiales ('barrio', 'ascenso', 'oro').
 */

define('BYPASS_AUTH', true);

require_once __DIR__ . '/db.php';

// Si es solicitado como JSON o la cabecera indica JSON:
$isJsonRequest = (isset($_GET['format']) && $_GET['format'] === 'json') || 
                 (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

if (!$isJsonRequest) {
    header("Content-Type: text/html; charset=UTF-8");
}

try {
    $run = isset($_GET['run']) && $_GET['run'] === 'true';

    if (!$run) {
        if ($isJsonRequest) {
            sendResponse(["message" => "Usa ?run=true para ejecutar el recálculo de ELO."]);
        }
        
        // Vista previa / Formulario de confirmación HTML
        echo "<!DOCTYPE html>
        <html>
        <head>
            <title>Recálculo de ELO Histórico - Pancorazo</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0f172a; color: #e2e8f0; }
                h1 { color: #ffd900; border-bottom: 2px solid #ffd900; padding-bottom: 10px; }
                .card { background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0; }
                .btn { display: inline-block; background: #ffd900; color: #000; padding: 10px 20px; font-weight: bold; border-radius: 4px; text-decoration: none; text-transform: uppercase; }
                .btn:hover { background: #e6c400; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
                th { background: #0f172a; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <h1>Recálculo de Puntos ELO Histórico</h1>
            <div class='card'>
                <h2>¿Qué realizará este proceso?</h2>
                <ul>
                    <li><strong>1. Reinicio:</strong> Establecerá el ELO inicial de todos los equipos en <strong>1200</strong>.</li>
                    <li><strong>2. Limpieza:</strong> Reconstruirá la tabla <code>elo_history</code> desde cero.</li>
                    <li><strong>3. Exclusión de Pichangas:</strong> Los partidos de torneos <strong>Pichanga</strong> o amistosos informales tendrán <strong>0 cambio de ELO</strong>.</li>
                    <li><strong>4. Torneos Oficiales:</strong> Recalculará cronológicamente la variación de ELO para torneos <strong>Barrio (K=20)</strong>, <strong>Ascenso (K=30)</strong> y <strong>Oro (K=40)</strong>.</li>
                    <li><strong>5. Ajustes Admin:</strong> Preservará los ajustes manuales de ELO dictaminados por administración en Walkovers.</li>
                </ul>
                <p><a class='btn' href='?run=true'>Ejecutar Recálculo de ELO Ahora</a></p>
            </div>
        </body>
        </html>";
        exit();
    }

    // PROCESAR RECALCULO
    $pdo->beginTransaction();

    // 1. Obtener todos los equipos activos y registrar su ELO original para comparar
    $stmtTeams = $pdo->query("SELECT id, name, current_elo FROM teams");
    $teamsList = $stmtTeams->fetchAll();
    
    $eloMap = [];
    $initialEloMap = [];
    foreach ($teamsList as $t) {
        $eloMap[$t['id']] = 1200; // ELO base inicial
        $initialEloMap[$t['id']] = [
            'name' => $t['name'],
            'old_elo' => (float)$t['current_elo']
        ];
    }

    // 2. Limpiar tabla elo_history
    $pdo->exec("DELETE FROM elo_history");

    // 3. Obtener partidos finalizados en orden cronológico
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
                    // Si no tiene tipo especificado pero tiene torneo, por defecto Barrio (K=20)
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

    // 4. Actualizar la tabla `teams` con el nuevo `current_elo`
    $updateTeamEloStmt = $pdo->prepare("UPDATE teams SET current_elo = :elo WHERE id = :id");
    foreach ($eloMap as $teamId => $newElo) {
        $updateTeamEloStmt->execute([
            ':elo' => $newElo,
            ':id' => $teamId
        ]);
    }

    $pdo->commit();

    // Construir respuesta
    $summary = [];
    foreach ($initialEloMap as $teamId => $info) {
        $newElo = $eloMap[$teamId] ?? 1200;
        $summary[] = [
            'id' => $teamId,
            'name' => $info['name'],
            'old_elo' => round($info['old_elo'], 1),
            'new_elo' => round($newElo, 1),
            'diff' => round($newElo - $info['old_elo'], 1)
        ];
    }

    usort($summary, function($a, $b) {
        return $b['new_elo'] <=> $a['new_elo'];
    });

    if ($isJsonRequest) {
        sendResponse([
            "status" => "success",
            "message" => "Recálculo de ELO completado exitosamente",
            "processed_matches" => $processedMatchesCount,
            "official_matches" => $officialMatchesCount,
            "pichanga_matches" => $pichangaMatchesCount,
            "teams" => $summary
        ]);
    }

    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Recálculo de ELO Completado - Pancorazo</title>
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 1000px; margin: 40px auto; padding: 0 20px; background: #0f172a; color: #e2e8f0; }
            h1, h2 { color: #ffd900; }
            .card { background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0; }
            .success { border-left: 5px solid #10b981; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 0.9rem; }
            th { background: #0f172a; color: #94a3b8; text-transform: uppercase; font-size: 0.8rem; }
            .diff-pos { color: #4ade80; font-weight: bold; }
            .diff-neg { color: #f87171; font-weight: bold; }
            .diff-zero { color: #94a3b8; }
        </style>
    </head>
    <body>
        <h1>¡Recálculo de ELO Exitoso!</h1>
        <div class='card success'>
            <h2>Resumen del Proceso</h2>
            <p><strong>Partidos procesados totales:</strong> {$processedMatchesCount}</p>
            <p><strong>Partidos de Torneos Oficiales (con ajuste ELO):</strong> {$officialMatchesCount}</p>
            <p><strong>Partidos Pichanga / Amistosos (sin ajuste ELO):</strong> {$pichangaMatchesCount}</p>
        </div>

        <div class='card'>
            <h2>Ranking Real Recalculado (Current ELO)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>ID</th>
                        <th>Equipo</th>
                        <th>ELO Anterior</th>
                        <th>Nuevo ELO Real</th>
                        <th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>";
    
    $pos = 1;
    foreach ($summary as $item) {
        $diffClass = $item['diff'] > 0 ? 'diff-pos' : ($item['diff'] < 0 ? 'diff-neg' : 'diff-zero');
        $diffSign = $item['diff'] > 0 ? '+' : '';
        echo "<tr>
                <td><strong>#{$pos}</strong></td>
                <td>{$item['id']}</td>
                <td><strong>" . htmlspecialchars($item['name']) . "</strong></td>
                <td>{$item['old_elo']}</td>
                <td><strong style='color: #ffd900;'>{$item['new_elo']}</strong></td>
                <td class='{$diffClass}'>{$diffSign}{$item['diff']}</td>
              </tr>";
        $pos++;
    }

    echo "</tbody>
            </table>
        </div>
    </body>
    </html>";

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($isJsonRequest) {
        sendResponse(["error" => "Error al recalcular ELO: " . $e->getMessage()], 500);
    }
    echo "<div style='color:red;'><h2>Error: " . htmlspecialchars($e->getMessage()) . "</h2><pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre></div>";
}
?>
