<?php
/**
 * Script administrativo para visualizar torneos uno a uno, ajustar su tipo
 * (Pichanga, Barrio, Ascenso, Oro) y recalcular el ELO histórico de forma transparente.
 */

define('BYPASS_AUTH', true);
require_once __DIR__ . '/db.php';

$isJsonRequest = (isset($_GET['format']) && $_GET['format'] === 'json') || 
                 (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

if (!$isJsonRequest) {
    header("Content-Type: text/html; charset=UTF-8");
}

try {
    // 1. Acción: Actualizar el tipo de un torneo específico (si se solicita)
    $updateTournamentId = isset($_GET['update_tournament_id']) ? (int)$_GET['update_tournament_id'] : 0;
    $newType = isset($_GET['new_type']) ? strtolower(trim($_GET['new_type'])) : '';

    $updateMessage = '';
    if ($updateTournamentId > 0 && in_array($newType, ['pichanga', 'barrio', 'ascenso', 'oro'])) {
        $stmtUpdate = $pdo->prepare("UPDATE tournaments SET tournament_type = :type, tournament_level = :level WHERE id = :id");
        $stmtUpdate->execute([':type' => $newType, ':level' => $newType, ':id' => $updateTournamentId]);
        $updateMessage = "Torneo #{$updateTournamentId} actualizado a nivel '{$newType}' correctamente.";
    }

    $run = isset($_GET['run']) && $_GET['run'] === 'true';

    // 2. Si no es ejecución directa, mostrar la lista completa de torneos uno por uno
    if (!$run) {
        $stmtTournaments = $pdo->query("
            SELECT t.id, t.name, t.tournament_level, t.tournament_type, t.status, t.is_jo, t.start_date, t.end_date,
                   (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id AND m.deleted_at IS NULL AND m.status IN ('Played', 'Walkover', 'COMPLETED', 'PLAYED', 'WALKOVER')) as matches_count
            FROM tournaments t
            WHERE t.deleted_at IS NULL
            ORDER BY t.id DESC
        ");
        $tournaments = $stmtTournaments->fetchAll(PDO::FETCH_ASSOC);

        if ($isJsonRequest) {
            sendResponse(["status" => "success", "tournaments" => $tournaments]);
        }

        // Interfaz de Usuario HTML
        echo "<!DOCTYPE html>
        <html>
        <head>
            <title>Gestión de Torneos uno a uno y Recálculo de ELO - Pancorazo</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 1200px; margin: 30px auto; padding: 0 20px; background: #0a0f1a; color: #e2e8f0; }
                h1, h2, h3 { color: #ffffff; font-weight: 800; text-transform: uppercase; }
                h1 { border-bottom: 2px solid #ffd900; padding-bottom: 12px; margin-bottom: 24px; color: #ffd900; }
                .card { background: #101622; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px; }
                .card-alert { background: rgba(255, 217, 0, 0.05); border: 1px solid rgba(255, 217, 0, 0.2); }
                .btn { display: inline-block; background: #ffd900; color: #000; padding: 10px 20px; font-weight: 900; border-radius: 6px; text-decoration: none; text-transform: uppercase; font-size: 0.85rem; border: none; cursor: pointer; transition: all 0.2s; }
                .btn:hover { background: #e6c400; transform: translateY(-1px); }
                .btn-sm { padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; margin-right: 2px; }
                .btn-pichanga { background: #475569; color: #fff; }
                .btn-barrio { background: #10b981; color: #fff; }
                .btn-ascenso { background: #38bdf8; color: #000; }
                .btn-oro { background: #ffd900; color: #000; }
                .badge { display: inline-block; padding: 3px 8px; font-size: 0.75rem; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
                .badge-pichanga { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
                .badge-barrio { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
                .badge-ascenso { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
                .badge-oro { background: rgba(255, 217, 0, 0.2); color: #ffd900; border: 1px solid rgba(255, 217, 0, 0.3); }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0d121f; border-radius: 8px; overflow: hidden; }
                th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                th { background-color: #161f30; color: #94a3b8; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; }
                td { font-size: 0.85rem; }
                .search-box { width: 100%; padding: 12px; background: #161f30; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; margin-bottom: 15px; font-size: 0.9rem; }
                .k-tag { font-weight: 900; font-size: 0.8rem; }
                .msg-success { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Torneos uno a uno y Recálculo ELO</h1>";

        if ($updateMessage) {
            echo "<div class='msg-success'>✓ {$updateMessage}</div>";
        }

        echo "<div class='card card-alert'>
                <h2>Instrucciones</h2>
                <p>A continuación puedes ver <strong>todos los torneos registrados uno por uno</strong>. Verifica su clasificación (Pichanga, Barrio, Ascenso, Oro). Si un torneo está mal clasificado, puedes cambiarlo directamente en la columna de Acciones.</p>
                <p>Una vez configurados los tipos de torneo, haz clic en el botón de recálculo global para actualizar todos los puntos ELO en la base de datos.</p>
                <p style='margin-top: 15px;'><a class='btn' href='?run=true'>⚡ EJECUTAR RECÁLCULO GLOBAL DE ELO</a></p>
              </div>";

        echo "<div class='card'>
                <h2>Listado de Torneos (" . count($tournaments) . ")</h2>
                <input type='text' id='searchInput' class='search-box' placeholder='Buscar torneo por nombre o ID...' onkeyup='filterTable()'>
                <table id='tournamentsTable'>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre del Torneo</th>
                            <th>Tipo / Nivel</th>
                            <th>Efecto ELO</th>
                            <th>Partidos Jugados</th>
                            <th>Estado</th>
                            <th>Cambiar Tipo Torneo</th>
                        </tr>
                    </thead>
                    <tbody>";

        foreach ($tournaments as $t) {
            $type = strtolower($t['tournament_type'] ?? $t['tournament_level'] ?? 'barrio');

            $badgeClass = 'badge-barrio';
            $kText = '<span class="k-tag" style="color: #34d399;">K = 20 (Barrio)</span>';

            if ($type === 'pichanga') {
                $badgeClass = 'badge-pichanga';
                $kText = '<span class="k-tag" style="color: #f87171;">K = 0 (Sin ELO - Pichanga)</span>';
            } elseif ($type === 'ascenso') {
                $badgeClass = 'badge-ascenso';
                $kText = '<span class="k-tag" style="color: #38bdf8;">K = 30 (Ascenso)</span>';
            } elseif ($type === 'oro') {
                $badgeClass = 'badge-oro';
                $kText = '<span class="k-tag" style="color: #ffd900;">K = 40 (Oro)</span>';
            }

            echo "<tr>
                    <td><strong>#{$t['id']}</strong></td>
                    <td><strong>" . htmlspecialchars($t['name']) . "</strong></td>
                    <td><span class='badge {$badgeClass}'>" . strtoupper($type) . "</span></td>
                    <td>{$kText}</td>
                    <td>" . (int)$t['matches_count'] . "</td>
                    <td>" . strtoupper($t['status']) . "</td>
                    <td>
                        <a class='btn btn-sm btn-pichanga' title='Marcar como Pichanga (0 ELO)' href='?update_tournament_id={$t['id']}&new_type=pichanga'>Pichanga</a>
                        <a class='btn btn-sm btn-barrio' title='Marcar como Barrio (K=20)' href='?update_tournament_id={$t['id']}&new_type=barrio'>Barrio</a>
                        <a class='btn btn-sm btn-ascenso' title='Marcar como Ascenso (K=30)' href='?update_tournament_id={$t['id']}&new_type=ascenso'>Ascenso</a>
                        <a class='btn btn-sm btn-oro' title='Marcar como Oro (K=40)' href='?update_tournament_id={$t['id']}&new_type=oro'>Oro</a>
                    </td>
                  </tr>";
        }

        echo "</tbody>
                </table>
              </div>

              <script>
                function filterTable() {
                    var input = document.getElementById('searchInput');
                    var filter = input.value.toLowerCase();
                    var table = document.getElementById('tournamentsTable');
                    var tr = table.getElementsByTagName('tr');

                    for (var i = 1; i < tr.length; i++) {
                        var tdName = tr[i].getElementsByTagName('td')[1];
                        var tdId = tr[i].getElementsByTagName('td')[0];
                        if (tdName || tdId) {
                            var txtName = tdName.textContent || tdName.innerText;
                            var txtId = tdId.textContent || tdId.innerText;
                            if (txtName.toLowerCase().indexOf(filter) > -1 || txtId.toLowerCase().indexOf(filter) > -1) {
                                tr[i].style.display = '';
                            } else {
                                tr[i].style.display = 'none';
                            }
                        }
                    }
                }
              </script>
        </body>
        </html>";
        exit();
    }

    // ==========================================
    // EJECUCIÓN DEL RECÁLCULO GLOBAL DE ELO
    // ==========================================
    $pdo->beginTransaction();

    // 1. Forzar que torneos con nombre "Pichanga" sean clasificados como 'pichanga'
    $pdo->exec("UPDATE tournaments SET tournament_type = 'pichanga', tournament_level = 'pichanga' WHERE LOWER(name) LIKE '%pichanga%'");

    // 2. Obtener lista de equipos
    $stmtTeams = $pdo->query("SELECT id, name, current_elo FROM teams");
    $teamsList = $stmtTeams->fetchAll(PDO::FETCH_ASSOC);
    
    $eloMap = [];
    $initialEloMap = [];
    foreach ($teamsList as $t) {
        $eloMap[$t['id']] = 1200.0;
        $initialEloMap[$t['id']] = [
            'name' => $t['name'],
            'old_elo' => (float)$t['current_elo']
        ];
    }

    // 3. Limpiar tabla elo_history
    $pdo->exec("DELETE FROM elo_history");

    // 4. Obtener todos los partidos finalizados en orden cronológico
    $sqlMatches = "SELECT m.*, 
                          tr.tournament_type, tr.tournament_level, tr.name as tournament_name,
                          t1.name as home_name, t2.name as away_name
                   FROM matches m
                   LEFT JOIN tournaments tr ON m.tournament_id = tr.id
                   LEFT JOIN teams t1 ON m.team_home_id = t1.id
                   LEFT JOIN teams t2 ON m.team_away_id = t2.id
                   WHERE m.deleted_at IS NULL
                     AND m.status IN ('Played', 'Walkover', 'COMPLETED', 'PLAYED', 'WALKOVER')
                   ORDER BY COALESCE(m.played_at, '2000-01-01 00:00:00') ASC, m.id ASC";
    
    $matchesStmt = $pdo->query($sqlMatches);
    $matches = $matchesStmt->fetchAll(PDO::FETCH_ASSOC);

    $processedMatchesCount = 0;
    $officialMatchesCount = 0;
    $pichangaMatchesCount = 0;

    // Estructura para agrupar por torneo en el resumen
    $tournamentsSummary = [];

    $historyInsertStmt = $pdo->prepare("
        INSERT INTO elo_history (team_id, match_id, old_elo, new_elo, diff, reason, recorded_at)
        VALUES (:team_id, :match_id, :old_elo, :new_elo, :diff, :reason, :recorded_at)
    ");

    foreach ($matches as $m) {
        $processedMatchesCount++;
        $homeId = $m['team_home_id'];
        $awayId = $m['team_away_id'];
        $tId = $m['tournament_id'] ?: 0;
        $tName = $m['tournament_name'] ?: 'Partido Amistoso (Sin Torneo)';

        if (!$homeId || !$awayId) continue;

        if (!isset($eloMap[$homeId])) $eloMap[$homeId] = 1200.0;
        if (!isset($eloMap[$awayId])) $eloMap[$awayId] = 1200.0;

        if (!isset($tournamentsSummary[$tId])) {
            $tournamentsSummary[$tId] = [
                'id' => $tId,
                'name' => $tName,
                'type' => strtolower($m['tournament_type'] ?? $m['tournament_level'] ?? ($tId == 0 ? 'pichanga' : 'barrio')),
                'matches_count' => 0,
                'elo_changes_count' => 0,
                'matches_detail' => []
            ];
        }

        $tournamentsSummary[$tId]['matches_count']++;

        $diffHome = 0;
        $diffAway = 0;

        if ($m['admin_elo_home'] !== null && $m['admin_elo_away'] !== null) {
            $diffHome = (int)$m['admin_elo_home'];
            $diffAway = (int)$m['admin_elo_away'];
            $officialMatchesCount++;
            $tournamentsSummary[$tId]['elo_changes_count']++;
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
                $tournamentsSummary[$tId]['elo_changes_count']++;
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

            $tournamentsSummary[$tId]['matches_detail'][] = [
                'id' => $m['id'],
                'home' => $m['home_name'] ?: "Equipo #{$homeId}",
                'away' => $m['away_name'] ?: "Equipo #{$awayId}",
                'score' => "{$m['score_home']} - {$m['score_away']}",
                'diff_home' => $diffHome,
                'diff_away' => $diffAway
            ];
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

    // 6. Resumen de equipos
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

    if ($isJsonRequest) {
        sendResponse([
            "status" => "success",
            "message" => "Recálculo de ELO completado exitosamente",
            "processed_matches" => $processedMatchesCount,
            "official_matches" => $officialMatchesCount,
            "pichanga_matches" => $pichangaMatchesCount,
            "tournaments_summary" => array_values($tournamentsSummary),
            "teams" => $summary
        ]);
    }

    // Render HTML del Resultado con desglose Torneo a Torneo
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Recálculo Completado Torneo por Torneo - Pancorazo</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 30px auto; padding: 0 20px; background: #0a0f1a; color: #e2e8f0; }
            h1, h2, h3 { color: #ffd900; font-weight: 800; text-transform: uppercase; }
            .card { background: #101622; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px; }
            .success { border-left: 5px solid #10b981; }
            .btn { display: inline-block; background: #ffd900; color: #000; padding: 8px 16px; font-weight: 900; border-radius: 6px; text-decoration: none; text-transform: uppercase; font-size: 0.8rem; }
            .badge { display: inline-block; padding: 3px 8px; font-size: 0.75rem; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
            .badge-pichanga { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
            .badge-barrio { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
            .badge-ascenso { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
            .badge-oro { background: rgba(255, 217, 0, 0.2); color: #ffd900; border: 1px solid rgba(255, 217, 0, 0.3); }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; background: #0d121f; border-radius: 8px; overflow: hidden; }
            th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }
            th { background-color: #161f30; color: #94a3b8; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; }
            .diff-pos { color: #4ade80; font-weight: bold; }
            .diff-neg { color: #f87171; font-weight: bold; }
            .diff-zero { color: #94a3b8; }
            .tournament-header { font-size: 1rem; font-weight: 800; display: flex; justify-content: space-between; align-items: center; }
        </style>
    </head>
    <body>
        <h1>¡Recálculo de ELO Exitoso!</h1>
        <div class='card success'>
            <h2>Resumen General</h2>
            <p><strong>Partidos procesados totales:</strong> {$processedMatchesCount}</p>
            <p><strong>Partidos Oficiales (con ajuste ELO):</strong> {$officialMatchesCount}</p>
            <p><strong>Partidos Pichanga / Amistosos (sin ajuste ELO):</strong> {$pichangaMatchesCount}</p>
            <p style='margin-top: 15px;'><a class='btn' href='check_tp.php'>Volver al Panel de Torneos</a></p>
        </div>

        <div class='card'>
            <h2>Desglose Torneo por Torneo (" . count($tournamentsSummary) . " Torneos/Categorías)</h2>";

    foreach ($tournamentsSummary as $tId => $tData) {
        $type = $tData['type'];
        $badgeClass = 'badge-barrio';
        $kInfo = 'K = 20 (Barrio)';

        if ($type === 'pichanga') {
            $badgeClass = 'badge-pichanga';
            $kInfo = 'K = 0 (Pichanga - Excluido de ELO)';
        } elseif ($type === 'ascenso') {
            $badgeClass = 'badge-ascenso';
            $kInfo = 'K = 30 (Ascenso)';
        } elseif ($type === 'oro') {
            $badgeClass = 'badge-oro';
            $kInfo = 'K = 40 (Oro)';
        }

        echo "<div style='margin-top: 20px; padding: 16px; background: #161f30; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);'>
                <div class='tournament-header'>
                    <span>" . ($tId > 0 ? "Torneo #{$tId}: " : "") . "<strong>" . htmlspecialchars($tData['name']) . "</strong></span>
                    <span><span class='badge {$badgeClass}'>" . strtoupper($type) . "</span> ({$kInfo})</span>
                </div>
                <p style='font-size: 0.8rem; color: #94a3b8; margin-top: 6px;'>Partidos jugados: {$tData['matches_count']} | Partidos con ajuste ELO: {$tData['elo_changes_count']}</p>";

        if (!empty($tData['matches_detail'])) {
            echo "<table>
                    <thead>
                        <tr>
                            <th>Match ID</th>
                            <th>Local</th>
                            <th>Resultado</th>
                            <th>Visita</th>
                            <th>Variación ELO Local</th>
                            <th>Variación ELO Visita</th>
                        </tr>
                    </thead>
                    <tbody>";
            foreach ($tData['matches_detail'] as $mDet) {
                $posH = $mDet['diff_home'] > 0 ? "+{$mDet['diff_home']}" : "{$mDet['diff_home']}";
                $posA = $mDet['diff_away'] > 0 ? "+{$mDet['diff_away']}" : "{$mDet['diff_away']}";
                echo "<tr>
                        <td>#{$mDet['id']}</td>
                        <td>" . htmlspecialchars($mDet['home']) . "</td>
                        <td><strong>{$mDet['score']}</strong></td>
                        <td>" . htmlspecialchars($mDet['away']) . "</td>
                        <td class='" . ($mDet['diff_home'] > 0 ? 'diff-pos' : ($mDet['diff_home'] < 0 ? 'diff-neg' : 'diff-zero')) . "'>{$posH} ELO</td>
                        <td class='" . ($mDet['diff_away'] > 0 ? 'diff-pos' : ($mDet['diff_away'] < 0 ? 'diff-neg' : 'diff-zero')) . "'>{$posA} ELO</td>
                      </tr>";
            }
            echo "</tbody></table>";
        } else {
            echo "<p style='font-size: 0.75rem; color: #64748b; margin-top: 8px; font-style: italic;'>Este torneo no generó variaciones ELO (Nivel Pichanga o sin ELO).</p>";
        }
        echo "</div>";
    }

    echo "</div>

        <div class='card'>
            <h2>Ranking Real Recalculado (Current ELO)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>ID</th>
                        <th>Equipo</th>
                        <th>ELO Anterior</th>
                        <th>Nuevo ELO Real</th>
                        <th>Diferencia Total</th>
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
