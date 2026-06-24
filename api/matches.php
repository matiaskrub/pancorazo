<?php
require_once 'db.php';
require_once 'StandingsHelper.php';
require_once 'Engine/EngineFactory.php';
require_once 'deck_utils.php';

// Configuración básica
error_reporting(E_ALL);
ini_set('display_errors', 0);

$method = $_SERVER['REQUEST_METHOD'];
$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

try {
    switch ($method) {
        case 'POST':
            if (!$data || !isset($data['action'])) {
                sendResponse(["error" => "No se recibieron datos válidos"], 400);
            }

            // La validación se hará granularmente dentro de cada acción
            // checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

            if ($data['action'] === 'register') {
                $user = checkAuth();
                $matchId = $data['id'] ?? null;
                $tournamentId = $data['tournament_id'] ?? null;
                if (!canUserManageMatch($pdo, $user, $matchId, $tournamentId)) {
                    sendResponse(["error" => "No tienes permisos para registrar resultados en este torneo."], 403);
                }
                registerMatch($pdo, $data);
            } elseif ($data['action'] === 'update') {
                $user = checkAuth();
                $matchId = $data['id'] ?? null;
                $tournamentId = $data['tournament_id'] ?? null;
                if (!canUserManageMatch($pdo, $user, $matchId, $tournamentId)) {
                    sendResponse(["error" => "No tienes permisos para modificar resultados en este torneo."], 403);
                }
                updateMatch($pdo, $data);
            } elseif ($data['action'] === 'authorize_elo') {
                checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
                authorizeElo($pdo, $data);
            } elseif ($data['action'] === 'discard_elo') {
                checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
                discardElo($pdo, $data);
            } elseif ($data['action'] === 'rollback_elo') {
                checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
                rollbackElo($pdo, $data);
            } elseif ($data['action'] === 'schedule') {
                // Permitimos a admin/editor o al dueño de un equipo
                scheduleMatch($pdo, $data);
            } elseif ($data['action'] === 'schedule_bulk') {
                $user = checkAuth();
                $tournamentId = $data['tournament_id'] ?? null;
                if (empty($tournamentId)) {
                    sendResponse(["error" => "ID de torneo requerido"], 400);
                }
                if (!canUserManageMatch($pdo, $user, null, $tournamentId)) {
                    sendResponse(["error" => "No tienes permisos para programar partidos en bloque para este torneo."], 403);
                }
                scheduleMatchesBulk($pdo, $data);
            } else {
                sendResponse(["error" => "Acción no permitida"], 400);
            }
            break;
        case 'GET':
            getMatches($pdo);
            break;
        default:
            sendResponse(["message" => "Método no permitido"], 405);
            break;
    }
} catch (Throwable $e) {
    sendResponse(
        ["error" => "Error inesperado en " . $e->getFile() . " línea " . $e->getLine() . ": " . $e->getMessage()],
        500
    );
}

function canUserManageMatch($pdo, $user, $matchId, $tournamentId)
{
    if (!$user) {
        return false;
    }

    if (in_array($user['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR'])) {
        return true;
    }

    $finalTournamentId = $tournamentId;

    if (!$finalTournamentId && $matchId) {
        $stmt = $pdo->prepare("SELECT tournament_id FROM matches WHERE id = ?");
        $stmt->execute([$matchId]);
        $finalTournamentId = $stmt->fetchColumn();
    }

    if (!$finalTournamentId) {
        return false;
    }

    $stmtT = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
    $stmtT->execute([$finalTournamentId]);
    $createdBy = $stmtT->fetchColumn();

    if ($createdBy !== false && (int)$createdBy === (int)$user['id']) {
        return true;
    }

    return false;
}

function registerMatch($pdo, $data)
{
    try {
        $pdo->beginTransaction();

        $matchId = !empty($data['id']) ? $data['id'] : NULL;
        $status = 'PENDING'; // Los resultados registrados quedan pendientes de autorización

        if ($matchId) {
            // 1. Obtener valores actuales para no perder metadatos del bracket
            $stmtCurrent = $pdo->prepare("SELECT round, stage, bracket_index FROM matches WHERE id = ?");
            $stmtCurrent->execute([$matchId]);
            $current = $stmtCurrent->fetch();
            if (!$current)
                $current = [];

            // 2. Limpiar eventos previos si es actualización
            $pdo->prepare("DELETE FROM match_events WHERE match_id = ?")->execute([$matchId]);

            // 3. Actualizar partido existente
            $matchSql = "UPDATE matches SET
tournament_id = :tournament_id,
series_id = :series_id,
team_home_id = :team_home_id,
team_away_id = :team_away_id,
score_home = :score_home,
score_away = :score_away,
penalties_home = :penalties_home,
penalties_away = :penalties_away,
elo_type = :elo_type,
status = :status,
is_wo = :is_wo,
played_at = :played_at,
round = :round,
stage = :stage,
bracket_index = :bracket_index,
proof_url = :proof_url,
admin_elo_home = :admin_elo_home,
admin_elo_away = :admin_elo_away,
admin_reason = :admin_reason
WHERE id = :id";

            $stmt = $pdo->prepare($matchSql);
            $stmt->execute([
                ':id' => $matchId,
                ':tournament_id' => !empty($data['tournament_id']) ? $data['tournament_id'] : NULL,
                ':series_id' => !empty($data['series_id']) ? $data['series_id'] : NULL,
                ':team_home_id' => $data['team_home_id'],
                ':team_away_id' => $data['team_away_id'],
                ':score_home' => (int) $data['score_home'],
                ':score_away' => (int) $data['score_away'],
                ':penalties_home' => isset($data['penalties_home']) ? (int) $data['penalties_home'] : NULL,
                ':penalties_away' => isset($data['penalties_away']) ? (int) $data['penalties_away'] : NULL,
                ':elo_type' => $data['elo_type'] ?? 'Amistoso',
                ':status' => $status,
                ':is_wo' => (int) ($data['is_wo'] ?? 0),
                ':played_at' => !empty($data['played_at']) ? $data['played_at'] : null,
                ':round' => isset($data['round']) ? (int) $data['round'] : ($current['round'] ?? null),
                ':stage' => !empty($data['stage']) ? $data['stage'] : ($current['stage'] ?? null),
                ':bracket_index' => isset($data['bracket_index']) ? (int) $data['bracket_index'] : ($current['bracket_index'] ?? null),
                ':proof_url' => !empty($data['proof_url']) ? $data['proof_url'] : null,
                ':admin_elo_home' => isset($data['admin_elo_home']) ? (int) $data['admin_elo_home'] : NULL,
                ':admin_elo_away' => isset($data['admin_elo_away']) ? (int) $data['admin_elo_away'] : NULL,
                ':admin_reason' => $data['admin_reason'] ?? NULL
            ]);
        } else {
            // 2. Insertar nuevo partido
            $matchSql = "INSERT INTO matches (
tournament_id, series_id, team_home_id, team_away_id,
score_home, score_away, penalties_home, penalties_away,
elo_type, status, is_wo, played_at, round, stage, bracket_index, proof_url,
admin_elo_home, admin_elo_away, admin_reason
) VALUES (
:tournament_id, :series_id, :team_home_id, :team_away_id,
:score_home, :score_away, :penalties_home, :penalties_away,
:elo_type, :status, :is_wo, :played_at, :round, :stage, :bracket_index, :proof_url,
:admin_elo_home, :admin_elo_away, :admin_reason
)";

            $stmt = $pdo->prepare($matchSql);
            $stmt->execute([
                ':tournament_id' => !empty($data['tournament_id']) ? $data['tournament_id'] : NULL,
                ':series_id' => !empty($data['series_id']) ? $data['series_id'] : NULL,
                ':team_home_id' => $data['team_home_id'],
                ':team_away_id' => $data['team_away_id'],
                ':score_home' => (int) $data['score_home'],
                ':score_away' => (int) $data['score_away'],
                ':penalties_home' => isset($data['penalties_home']) ? (int) $data['penalties_home'] : NULL,
                ':penalties_away' => isset($data['penalties_away']) ? (int) $data['penalties_away'] : NULL,
                ':elo_type' => $data['elo_type'] ?? 'Amistoso',
                ':status' => $status,
                ':is_wo' => (int) ($data['is_wo'] ?? 0),
                ':played_at' => !empty($data['played_at']) ? $data['played_at'] : null,
                ':round' => isset($data['round']) ? (int) $data['round'] : null,
                ':stage' => !empty($data['stage']) ? $data['stage'] : null,
                ':bracket_index' => isset($data['bracket_index']) ? (int) $data['bracket_index'] : null,
                ':proof_url' => !empty($data['proof_url']) ? $data['proof_url'] : null,
                ':admin_elo_home' => isset($data['admin_elo_home']) ? (int) $data['admin_elo_home'] : NULL,
                ':admin_elo_away' => isset($data['admin_elo_away']) ? (int) $data['admin_elo_away'] : NULL,
                ':admin_reason' => $data['admin_reason'] ?? NULL
            ]);
            $matchId = $pdo->lastInsertId();
        }

        // 3. Insertar Eventos (Tarjetas, Lesiones)
        if (!empty($data['events']) && is_array($data['events'])) {
            $eventSql = "INSERT INTO match_events (
match_id, team_id, card_id, event, description
) VALUES (
:match_id, :team_id, :card_id, :event, :description
)";
            $eventStmt = $pdo->prepare($eventSql);

            foreach ($data['events'] as $event) {
                $eventStmt->execute([
                    ':match_id' => $matchId,
                    ':team_id' => $event['team_id'],
                    ':card_id' => !empty($event['card_id']) ? $event['card_id'] : NULL,
                    ':event' => $event['event'] ?? $event['type'] ?? 'YELLOW_CARD',
                    ':description' => $event['description'] ?? ''
                ]);
            }
        }

        // 4. Actualizar la Serie (Clan Duel) si aplica
        if (!empty($data['series_id'])) {
            $winnerId = NULL;
            if ($data['score_home'] > $data['score_away']) {
                $winnerId = 'HOME';
            } elseif ($data['score_away'] > $data['score_home']) {
                $winnerId = 'AWAY';
            }

            if ($winnerId) {
                $seriesColumn = ($winnerId === 'HOME') ? 'score_home' : 'score_away';
                $seriesUpdateSql = "UPDATE series SET $seriesColumn = $seriesColumn + 1 WHERE id = :series_id";
                $seriesStmt = $pdo->prepare($seriesUpdateSql);
                $seriesStmt->execute([':series_id' => $data['series_id']]);
            }
        }

        // 6. Notificar al Engine del Torneo para avance automático si aplica
        if (!empty($data['tournament_id'])) {
            try {
                $engine = EngineFactory::getEngine($pdo, $data['tournament_id']);
                $engine->onMatchCompleted($matchId);
            } catch (Throwable $engineEx) {
                error_log("Error notifying engine in register: " . $engineEx->getMessage());
            }
        }
        
        recalculateDecksForMatch($pdo, $matchId);

        $pdo->commit();
        sendResponse([
            "status" => "success",
            "match_id" => $matchId,
            "message" => "Partido registrado correctamente con estado PENDING"
        ]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error en la transacción: " . $e->getMessage()], 500);
    }
}

function updateMatch($pdo, $data)
{
    try {
        if (empty($data['id'])) {
            sendResponse(["error" => "ID de partido requerido"], 400);
        }

        $pdo->beginTransaction();

        // 1. Verificar si el partido ya estaba finalizado para revertir ELO y obtener metadatos actuales
        $checkSql = "SELECT status, team_home_id, team_away_id, round, stage, bracket_index FROM matches WHERE id = :id";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':id' => $data['id']]);
        $currentMatch = $checkStmt->fetch();
        if (!$currentMatch) {
            $pdo->rollBack();
            sendResponse(["error" => "Partido no encontrado"], 404);
        }

        $currentStatus = strtoupper($currentMatch['status'] ?? '');
        if ($currentMatch && in_array($currentStatus, ['PLAYED', 'WALKOVER', 'COMPLETED', 'SUSPENDED', 'CANCELED'])) {
            // ... (resto de la lógica de reversión de ELO igual)
            $histSql = "SELECT team_id, diff FROM elo_history WHERE match_id = :match_id";
            $histStmt = $pdo->prepare($histSql);
            $histStmt->execute([':match_id' => $data['id']]);
            $histories = $histStmt->fetchAll();

            foreach ($histories as $history) {
                $revSql = "UPDATE teams SET current_elo = current_elo - :diff WHERE id = :team_id";
                $pdo->prepare($revSql)->execute([':diff' => $history['diff'], ':team_id' => $history['team_id']]);
            }
            $pdo->prepare("DELETE FROM elo_history WHERE match_id = :match_id")->execute([':match_id' => $data['id']]);
            $newStatus = 'PENDING';
        } else {
            $newStatus = $data['status'] ?? $currentMatch['status'] ?? 'PENDING';
        }

        // 2. Actualizar el partido principal
        $matchSql = "UPDATE matches SET
tournament_id = :tournament_id,
series_id = :series_id,
team_home_id = :team_home_id,
team_away_id = :team_away_id,
score_home = :score_home,
score_away = :score_away,
penalties_home = :penalties_home,
penalties_away = :penalties_away,
elo_type = :elo_type,
is_wo = :is_wo,
played_at = :played_at,
proof_url = :proof_url,
admin_elo_home = :admin_elo_home,
admin_elo_away = :admin_elo_away,
admin_reason = :admin_reason,
round = :round,
stage = :stage,
bracket_index = :bracket_index,
status = :status
WHERE id = :id";

        $stmt = $pdo->prepare($matchSql);
        $stmt->execute([
            ':id' => $data['id'],
            ':tournament_id' => !empty($data['tournament_id']) ? $data['tournament_id'] : NULL,
            ':series_id' => !empty($data['series_id']) ? $data['series_id'] : NULL,
            ':team_home_id' => $data['team_home_id'],
            ':team_away_id' => $data['team_away_id'],
            ':score_home' => (int) $data['score_home'],
            ':score_away' => (int) $data['score_away'],
            ':penalties_home' => isset($data['penalties_home']) ? (int) $data['penalties_home'] : NULL,
            ':penalties_away' => isset($data['penalties_away']) ? (int) $data['penalties_away'] : NULL,
            ':elo_type' => $data['elo_type'] ?? 'Amistoso',
            ':is_wo' => (int) ($data['is_wo'] ?? 0),
            ':played_at' => !empty($data['played_at']) ? $data['played_at'] : null,
            ':proof_url' => !empty($data['proof_url']) ? $data['proof_url'] : null,
            ':admin_elo_home' => isset($data['admin_elo_home']) ? (int) $data['admin_elo_home'] : NULL,
            ':admin_elo_away' => isset($data['admin_elo_away']) ? (int) $data['admin_elo_away'] : NULL,
            ':admin_reason' => $data['admin_reason'] ?? NULL,
            ':round' => isset($data['round']) ? (int) $data['round'] : ($currentMatch['round'] ?? null),
            ':stage' => !empty($data['stage']) ? $data['stage'] : ($currentMatch['stage'] ?? null),
            ':bracket_index' => isset($data['bracket_index']) ? (int) $data['bracket_index'] : ($currentMatch['bracket_index'] ?? null),
            ':status' => $newStatus
        ]);

        // 2. Actualizar Eventos (Borrar e insertar de nuevo)
        $pdo->prepare("DELETE FROM match_events WHERE match_id = ?")->execute([$data['id']]);

        if (!empty($data['events']) && is_array($data['events'])) {
            $eventSql = "INSERT INTO match_events (
match_id, team_id, card_id, event, description
) VALUES (
:match_id, :team_id, :card_id, :event, :description
)";
            $eventStmt = $pdo->prepare($eventSql);

            foreach ($data['events'] as $event) {
                $eventStmt->execute([
                    ':match_id' => $data['id'],
                    ':team_id' => $event['team_id'],
                    ':card_id' => !empty($event['card_id']) ? $event['card_id'] : NULL,
                    ':event' => $event['event'] ?? $event['type'] ?? 'YELLOW_CARD',
                    ':description' => $event['description'] ?? ''
                ]);
            }
        }

        // 4. Notificar al Engine del Torneo para avance automático si aplica
        if (!empty($data['tournament_id'])) {
            try {
                $engine = EngineFactory::getEngine($pdo, $data['tournament_id']);
                $engine->onMatchCompleted($data['id']);
            } catch (Throwable $engineEx) {
                error_log("Error notifying engine in update: " . $engineEx->getMessage());
            }
        }
        
        recalculateDecksForMatch($pdo, $data['id']);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Partido actualizado correctamente"]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al actualizar partido: " . $e->getMessage()], 500);
    }
}

function getMatches($pdo)
{
    try {
        $sql = "SELECT m.*,
t1.name as home_name, t1.logo_url as home_logo, t1.slug as home_slug,
t2.name as away_name, t2.logo_url as away_logo, t2.slug as away_slug,
tr.name as tournament_name
FROM matches m
LEFT JOIN teams t1 ON m.team_home_id = t1.id
LEFT JOIN teams t2 ON m.team_away_id = t2.id
LEFT JOIN tournaments tr ON m.tournament_id = tr.id
WHERE m.deleted_at IS NULL
ORDER BY m.played_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Obtener eventos para todos estos partidos
        if (count($matches) > 0) {
            $matchIds = array_column($matches, 'id');
            $inQuery = implode(',', array_fill(0, count($matchIds), '?'));

            $eventSql = "SELECT me.*, c.name as card_name
FROM match_events me
LEFT JOIN cards c ON me.card_id = c.id
WHERE me.match_id IN ($inQuery)";
            $eventStmt = $pdo->prepare($eventSql);
            $eventStmt->execute($matchIds);
            $allEvents = $eventStmt->fetchAll(PDO::FETCH_ASSOC);

            // Agrupar eventos por match_id
            $eventsByMatch = [];
            foreach ($allEvents as $event) {
                $eventsByMatch[$event['match_id']][] = $event;
            }

            // Asignar eventos a cada partido
            foreach ($matches as &$match) {
                $match['events'] = $eventsByMatch[$match['id']] ?? [];
            }
        }

        sendResponse($matches);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener partidos: " . $e->getMessage()], 500);
    }
}

function authorizeElo($pdo, $data)
{
    try {
        if (empty($data['id'])) {
            sendResponse(["error" => "ID de partido requerido"], 400);
        }

        $pdo->beginTransaction();

        // 1. Obtener datos del partido y de los equipos
        $sql = "SELECT m.*, t1.current_elo as elo_home, t2.current_elo as elo_away
FROM matches m
JOIN teams t1 ON m.team_home_id = t1.id
JOIN teams t2 ON m.team_away_id = t2.id
WHERE m.id = :id AND m.status IN ('PENDING', 'WALKOVER')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $data['id']]);
        $match = $stmt->fetch();

        if (!$match) {
            sendResponse(["error" => "Partido no encontrado o ya procesado"], 404);
        }

        // 2. Calcular ELO
        $eloDiffHome = 0;
        $eloDiffAway = 0;

        if ($match['admin_elo_home'] !== null && $match['admin_elo_away'] !== null) {
            // Caso modo ADMIN: usar valores manuales independientes
            $eloDiffHome = (int) $match['admin_elo_home'];
            $eloDiffAway = (int) $match['admin_elo_away'];
        } else {
            // Caso Automático: K por tipo de torneo
            $k = 12; // Pichanga / Amistoso por defecto
            if ($match['tournament_id']) {
                $stmtT = $pdo->prepare("SELECT tournament_type FROM tournaments WHERE id = ?");
                $stmtT->execute([$match['tournament_id']]);
                $tType = strtolower($stmtT->fetchColumn() ?: '');
                if ($tType === 'barrio') {
                    $k = 20;
                } elseif ($tType === 'ascenso') {
                    $k = 30;
                } elseif ($tType === 'oro') {
                    $k = 40;
                } elseif ($tType === 'pichanga') {
                    $k = 12;
                }
            }
            $K = $k;

            $eloHome = $match['elo_home'];
            $eloAway = $match['elo_away'];

            $We = 1 / (pow(10, -($eloHome - $eloAway) / 400) + 1);

            $W = 0.5;
            if ($match['score_home'] > $match['score_away'])
                $W = 1;
            if ($match['score_home'] < $match['score_away'])
                $W = 0;

            // Se elimina el multiplicador de goles, fijándolo en G = 1
            $G = 1;

            $eloDiffHome = round($K * $G * ($W - $We));
            $eloDiffAway = -$eloDiffHome;
        }

        // 3. Actualizar equipos
        $updateTeamSql = "UPDATE teams SET current_elo = current_elo + :diff WHERE id = :id";
        $pdo->prepare($updateTeamSql)->execute([':diff' => $eloDiffHome, ':id' => $match['team_home_id']]);
        $pdo->prepare($updateTeamSql)->execute([':diff' => $eloDiffAway, ':id' => $match['team_away_id']]);

        // 4. Registrar en elo_history
        $historySql = "INSERT INTO elo_history (team_id, match_id, old_elo, new_elo, diff, reason) VALUES (:team_id,
    :match_id, :old_elo, :new_elo, :diff, :reason)";
        $histStmt = $pdo->prepare($historySql);

        $reason = $match['admin_reason'] ?? ($match['elo_type'] . " vs " . ($match['score_home'] > $match['score_away'] ?
            "Victoria" : ($match['score_home'] < $match['score_away'] ? "Derrota" : "Empate")));
        $histStmt->execute([
            ':team_id' => $match['team_home_id'],
            ':match_id' => $match['id'],
            ':old_elo' => $match['elo_home'],
            ':new_elo' => $match['elo_home'] + $eloDiffHome,
            ':diff' => $eloDiffHome,
            ':reason' => $reason
        ]);

        $histStmt->execute([
            ':team_id' => $match['team_away_id'],
            ':match_id' => $match['id'],
            ':old_elo' => $match['elo_away'],
            ':new_elo' => $match['elo_away'] + $eloDiffAway,
            ':diff' => $eloDiffAway,
            ':reason' => $reason
        ]);

        // 5. Finalizar partido (Nuevos estados: Played vs Walkover)
        $finalStatus = ($match['admin_elo_home'] !== null || $match['admin_elo_away'] !== null) ? 'Walkover' : 'Played';
        $updateMatchSql = "UPDATE matches SET status = :status WHERE id = :id";
        $pdo->prepare($updateMatchSql)->execute([':status' => $finalStatus, ':id' => $match['id']]);

        // 6. Notificar al Engine del Torneo para avance automático si aplica
        if ($match['tournament_id']) {
            try {
                $engine = EngineFactory::getEngine($pdo, $match['tournament_id']);
                $engine->onMatchCompleted($match['id']);
            } catch (Exception $engineEx) {
                error_log("Error notifying engine: " . $engineEx->getMessage());
            }
        }

        // Registrar Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'AUTHORIZE_ELO', 'match', $match['id'], null, [
            "elo_diff" => $eloDiffHome,
            "final_status" => $finalStatus
        ]);
        
        recalculateDecksForMatch($pdo, $match['id']);

        $pdo->commit();
        sendResponse([
            "status" => "success",
            "message" => "ELO autorizado y partido completado",
            "diff" =>
                $eloDiffHome
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        sendResponse(["error" => "Error al autorizar ELO: " . $e->getMessage()], 500);
    }
}

function discardElo($pdo, $data)
{
    try {
        if (empty($data['id'])) {
            sendResponse(["error" => "ID de partido requerido"], 400);
        }

        $pdo->beginTransaction();

        // 5. Finalizar partido (Walkover / Basurero)
        $updateMatchSql = "UPDATE matches SET status = 'Walkover' WHERE id = :id";
        $pdo->prepare($updateMatchSql)->execute([':id' => $data['id']]);

        // Registrar Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'DISCARD_MATCH', 'match', $data['id'], null, ["status" => "Walkover"]);
        
        recalculateDecksForMatch($pdo, $data['id']);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Partido finalizado como WALKOVER correctamente"]);

    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        sendResponse(["error" => "Error al descartar partido: " . $e->getMessage()], 500);
    }
}

function scheduleMatch($pdo, $data)
{
    try {
        if (empty($data['id']) || empty($data['played_at'])) {
            sendResponse(["error" => "ID de partido y fecha requeridos"], 400);
        }

        $user = checkAuth(); // Al menos debe estar logueado
        $isAdmin = in_array($user['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

        if (!$isAdmin) {
            // Si no es admin, verificar si es dueño de uno de los equipos del partido
            $stmtCheck = $pdo->prepare("
                SELECT m.id 
                FROM matches m
                JOIN teams t1 ON m.team_home_id = t1.id
                JOIN teams t2 ON m.team_away_id = t2.id
                WHERE m.id = :match_id 
                AND (t1.owner_user_id = :user_id1 OR t2.owner_user_id = :user_id2)
            ");
            $stmtCheck->execute([
                ':match_id' => $data['id'],
                ':user_id1' => $user['id'],
                ':user_id2' => $user['id']
            ]);
            if (!$stmtCheck->fetch()) {
                sendResponse(["error" => "No tienes permisos para programar este encuentro. Solo los dueños de los equipos participantes pueden hacerlo."], 403);
            }
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("UPDATE matches SET played_at = :played_at WHERE id = :id");
        $stmt->execute([
            ':id' => $data['id'],
            ':played_at' => $data['played_at']
        ]);

        // Registrar Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'SCHEDULE_MATCH', 'match', $data['id'], null, [
            "played_at" =>
                $data['played_at']
        ]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Partido programado correctamente"]);
    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        sendResponse(["error" => "Error al programar partido: " . $e->getMessage()], 500);
    }
}

function rollbackElo($pdo, $data)
{
    try {
        if (empty($data['id'])) {
            sendResponse(["error" => "ID de partido requerido"], 400);
        }

        $pdo->beginTransaction();

        // 1. Obtener historial de ELO para este partido
        $histSql = "SELECT team_id, diff FROM elo_history WHERE match_id = :match_id";
        $histStmt = $pdo->prepare($histSql);
        $histStmt->execute([':match_id' => $data['id']]);
        $histories = $histStmt->fetchAll();

        foreach ($histories as $history) {
            // Revertir ELO (restar el diff)
            $revSql = "UPDATE teams SET current_elo = current_elo - :diff WHERE id = :team_id";
            $pdo->prepare($revSql)->execute([
                ':diff' => $history['diff'],
                ':team_id' => $history['team_id']
            ]);
        }

        // Eliminar historial
        $pdo->prepare("DELETE FROM elo_history WHERE match_id = :match_id")->execute([':match_id' => $data['id']]);

        // 2. Volver el partido a PENDING
        $updateSql = "UPDATE matches SET status = 'PENDING' WHERE id = :id";
        $pdo->prepare($updateSql)->execute([':id' => $data['id']]);

        // Registrar Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'ROLLBACK_ELO', 'match', $data['id'], null, [
            "status" => "PENDING",
            "reverted_elo" => count($histories) > 0
        ]);
        
        recalculateDecksForMatch($pdo, $data['id']);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Resultado invalidado y ELO revertido correctamente"]);
    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        sendResponse(["error" => "Error al invalidar resultado: " . $e->getMessage()], 500);
    }
}

function scheduleMatchesBulk($pdo, $data)
{
    try {
        if (empty($data['tournament_id']) || empty($data['played_at'])) {
            sendResponse(["error" => "ID de torneo y fecha requeridos"], 400);
        }

        $tournamentId = $data['tournament_id'];
        $playedAt = $data['played_at'];
        $round = $data['round'] ?? 'all';

        $pdo->beginTransaction();

        if ($round === 'all') {
            $stmt = $pdo->prepare("
                UPDATE matches 
                SET played_at = :played_at 
                WHERE tournament_id = :tournament_id 
                AND (LOWER(status) = 'scheduled' OR (LOWER(status) = 'pending' AND score_home IS NULL)) 
                AND deleted_at IS NULL
            ");
            $stmt->execute([
                ':played_at' => $playedAt,
                ':tournament_id' => $tournamentId
            ]);
            $count = $stmt->rowCount();
        } else {
            $stmt = $pdo->prepare("
                UPDATE matches 
                SET played_at = :played_at 
                WHERE tournament_id = :tournament_id 
                AND round = :round 
                AND (LOWER(status) = 'scheduled' OR (LOWER(status) = 'pending' AND score_home IS NULL)) 
                AND deleted_at IS NULL
            ");
            $stmt->execute([
                ':played_at' => $playedAt,
                ':tournament_id' => $tournamentId,
                ':round' => (int)$round
            ]);
            $count = $stmt->rowCount();
        }

        // Registrar Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'SCHEDULE_MATCHES_BULK', 'tournament', $tournamentId, null, [
            "played_at" => $playedAt,
            "round" => $round,
            "updated_count" => $count
        ]);

        $pdo->commit();
        sendResponse([
            "status" => "success",
            "message" => "Se programaron $count partidos correctamente.",
            "count" => $count
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al programar partidos en bloque: " . $e->getMessage()], 500);
    }
}
?>