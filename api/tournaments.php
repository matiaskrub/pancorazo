<?php
require_once 'db.php';
require_once 'StandingsHelper.php';
require_once 'Engine/EngineFactory.php';
require_once 'OfficialRankingHelper.php';
require_once 'deck_utils.php';

$method = $_SERVER['REQUEST_METHOD'];
$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                getTournamentDetail($pdo, $_GET['id']);
            } elseif (isset($_GET['action']) && $_GET['action'] === 'get_categories') {
                getTournamentCategories($pdo);
            } elseif (isset($_GET['action']) && $_GET['action'] === 'team_tournaments' && isset($_GET['team_id'])) {
                getTeamTournaments($pdo, $_GET['team_id']);
            } else {
                getTournaments($pdo);
            }
            break;
        case 'POST':
            if (!$data || !isset($data['action'])) {
                sendResponse(["error" => "No se recibieron datos válidos"], 400);
            }

            // Acciones que requieren checkAuth básico. Luego cada acción puede restringir más.
            if (in_array($data['action'], ['enroll', 'create', 'update', 'start_tournament', 'close', 'generate_swiss_round', 'remove_participant', 'promote_participant', 'link_deck'])) {
                checkAuth();
            } else {
                checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
            }

            switch ($data['action']) {
                case 'create':
                    createTournament($pdo, $data);
                    break;
                case 'update':
                    updateTournament($pdo, $data);
                    break;
                case 'enroll':
                    enrollTeam($pdo, $data);
                    break;
                case 'link_deck':
                    linkDeck($pdo, $data);
                    break;
                case 'remove_participant':
                    removeParticipant($pdo, $data);
                    break;
                case 'start_tournament':
                    startTournament($pdo, $data);
                    break;
                case 'close':
                    closeTournament($pdo, $data);
                    break;
                case 'generate_swiss_round':
                    generateSwissRound($pdo, $data);
                    break;
                case 'promote_participant':
                    promoteParticipant($pdo, $data);
                    break;
                case 'create_category':
                    createCategory($pdo, $data);
                    break;
                case 'update_category':
                    updateCategory($pdo, $data);
                    break;
                case 'delete_category':
                    deleteCategory($pdo, $data);
                    break;
                default:
                    sendResponse(["error" => "Acción no permitida"], 400);
                    break;
            }
            break;
        case 'DELETE':
            checkAuth(['SUPER_ADMIN']);
            $id = $_GET['id'] ?? null;
            if (!$id) {
                sendResponse(["error" => "ID del torneo requerido para eliminar"], 400);
            }
            deleteTournament($pdo, $id);
            break;
        default:
            sendResponse(["message" => "Method not allowed"], 405);
            break;
    }
} catch (Throwable $e) {
    sendResponse(["error" => "Error inesperado: " . $e->getMessage()], 500);
}

function getTournaments($pdo)
{
    try {
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

        $sql = "
SELECT t.*,
(SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) as participants_count,
winner_team.name as winner_name,
winner_team.logo_url as winner_logo,
creator_user.username as creator_username
FROM tournaments t
LEFT JOIN tournament_podiums tp ON t.id = tp.tournament_id AND tp.position = 1
LEFT JOIN teams winner_team ON tp.team_id = winner_team.id
LEFT JOIN users creator_user ON t.created_by_user_id = creator_user.id
";

        if (!$isPrivileged) {
            $sql .= " WHERE t.status != 'draft' AND t.deleted_at IS NULL";
        } else {
            $sql .= " WHERE t.deleted_at IS NULL";
        }

        $sql .= " ORDER BY t.start_date DESC";
        $tournaments = $pdo->query($sql)->fetchAll();
        sendResponse($tournaments);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error fetching tournaments: " . $e->getMessage()], 500);
    }
}

function removeParticipant($pdo, $data)
{
    if (empty($data['tournament_id']) || empty($data['team_id'])) {
        sendResponse(["error" => "ID de torneo y equipo requeridos"], 400);
    }

    try {
        // Validar permisos
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        $stmtCreator = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
        $stmtCreator->execute([$data['tournament_id']]);
        $createdBy = $stmtCreator->fetchColumn();
        
        $isCreator = $currentUser && ((int)$createdBy === (int)($currentUser['id'] ?? -1));
        if (!$isPrivileged && !$isCreator) {
            sendResponse(["error" => "No autorizado para eliminar participantes de este torneo"], 403);
        }

        $stmt = $pdo->prepare("DELETE FROM tournament_participants WHERE tournament_id = ? AND team_id = ?");
        $stmt->execute([$data['tournament_id'], $data['team_id']]);
        sendResponse(["status" => "success", "message" => "Participante eliminado correctamente"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al eliminar participante: " . $e->getMessage()], 500);
    }
}

function getTournamentDetail($pdo, $id)
{
    try {
        $stmt = $pdo->prepare("
SELECT t.*, tc.name as category_name, r.name as region_name, creator_user.username as creator_username
FROM tournaments t 
LEFT JOIN tournament_categories tc ON t.category_id = tc.id
LEFT JOIN regions r ON t.region_id = r.id_region
LEFT JOIN users creator_user ON t.created_by_user_id = creator_user.id
WHERE t.id = ? AND t.deleted_at IS NULL");
        $stmt->execute([$id]);
        
        $tournament = $stmt->fetch();

        if (!$tournament) {
            sendResponse(["error" => "Torneo no encontrado"], 404);
        }

        // Decodificar settings
        if (isset($tournament['highlight_settings']) && $tournament['highlight_settings']) {
            $tournament['highlight_settings'] = json_decode($tournament['highlight_settings'], true);
        } else {
            $tournament['highlight_settings'] = [];
        }

        $stmtParticipants = $pdo->prepare("
            SELECT tp.*, t.name as team_name, t.logo_url as team_logo, t.slug as team_slug, t.owner_user_id as team_owner_user_id,
                   t.current_elo as team_elo, t.official_ranking_points as team_official_points,
                   d.name as deck_name, d.win_rate as deck_win_rate
            FROM tournament_participants tp
            JOIN teams t ON tp.team_id = t.id
            LEFT JOIN decks d ON tp.deck_id = d.id
            WHERE tp.tournament_id = ? AND tp.deleted_at IS NULL
            ORDER BY tp.enrolled_at ASC, tp.id ASC
        ");
        $stmtParticipants->execute([$id]);
        $rawParticipants = $stmtParticipants->fetchAll(PDO::FETCH_ASSOC);

        // Reglas de privacidad para mazos vinculados
        $tournamentStatus = strtolower($tournament['status'] ?? '');
        $tournamentStarted = in_array($tournamentStatus, ['in_progress', 'closed']);
        $currentUser = $_SESSION['user'] ?? null;
        $isSuperAdmin = $currentUser && ($currentUser['global_role'] === 'SUPER_ADMIN');
        $currentUserId = $currentUser ? (int)$currentUser['id'] : null;

        $processedParticipants = [];
        foreach ($rawParticipants as $p) {
            if (!empty($p['deck_id'])) {
                $isOwner = $currentUserId && ((int)$p['team_owner_user_id'] === $currentUserId);
                if (!$tournamentStarted && !$isSuperAdmin && !$isOwner) {
                    $p['deck_id'] = null;
                    $p['deck_name'] = 'Mazo Vinculado';
                    $p['deck_win_rate'] = null;
                    $p['deck_hidden'] = true;
                } else {
                    $p['deck_hidden'] = false;
                }
            } else {
                $p['deck_hidden'] = false;
            }
            $processedParticipants[] = $p;
        }
        $tournament['participants'] = $processedParticipants;

        // Obtener partidos (fixture)
        $stmtMatches = $pdo->prepare("
SELECT m.*,
t1.name as home_name, t1.logo_url as home_logo, t1.slug as home_slug,
t2.name as away_name, t2.logo_url as away_logo, t2.slug as away_slug
FROM matches m
LEFT JOIN teams t1 ON m.team_home_id = t1.id
LEFT JOIN teams t2 ON m.team_away_id = t2.id
WHERE m.tournament_id = ? AND m.deleted_at IS NULL
ORDER BY m.played_at ASC, m.round ASC
");
        $stmtMatches->execute([$id]);

        $matches = $stmtMatches->fetchAll(PDO::FETCH_ASSOC);

        // Obtener eventos para estos partidos
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

            // Asignar eventos y nombre del torneo a cada partido
            foreach ($matches as &$match) {
                $match['events'] = $eventsByMatch[$match['id']] ?? [];
                $match['tournament_name'] = $tournament['name'];
            }
        }
        $tournament['matches'] = $matches;

        // Obtener Tabla de Clasificación (para todas las estructuras excepto legacy)
        if (strtolower($tournament['structure']) !== 'legacy') {
            $tournament['standings'] = getTournamentStandings($pdo, $id, true);
        }

        // Obtener regiones permitidas (tabla tournament_regions)
        $stmtRegions = $pdo->prepare("SELECT region_id FROM tournament_regions WHERE tournament_id = ?");
        $stmtRegions->execute([$id]);
        $tournament['allowed_regions'] = $stmtRegions->fetchAll(PDO::FETCH_COLUMN) ?: [];

        // Obtener podios (ganadores)
        $stmtPodiums = $pdo->prepare("
SELECT tp.position, t.name, t.logo_url, t.slug
FROM tournament_podiums tp
JOIN teams t ON tp.team_id = t.id
WHERE tp.tournament_id = ?
ORDER BY tp.position ASC
");
        $stmtPodiums->execute([$id]);
        $tournament['podiums'] = $stmtPodiums->fetchAll();

        // Sugerir podio basado en el tipo de torneo para facilitar el cierre
        try {
            $engine = EngineFactory::getEngine($pdo, $id);
            $tournament['suggested_podium'] = $engine->getPodium();
        } catch (Throwable $e) {
            $tournament['suggested_podium'] = [];
        }

        // Identificar ganador principal para conveniencia en el frontend
        if (!empty($tournament['podiums']) && $tournament['podiums'][0]['position'] == 1) {
            $tournament['winner'] = $tournament['podiums'][0];
        }

        // Obtener historial del ranking oficial del torneo
        $stmtRankingHistory = $pdo->prepare("
            SELECT rh.*, t.name as team_name, t.logo_url as team_logo, t.slug as team_slug
            FROM official_ranking_history rh
            JOIN teams t ON rh.team_id = t.id
            WHERE rh.tournament_id = ?
            ORDER BY rh.points_earned DESC
        ");
        $stmtRankingHistory->execute([$id]);
        $tournament['ranking_history'] = $stmtRankingHistory->fetchAll(PDO::FETCH_ASSOC);

        sendResponse($tournament);
    } catch (PDOException $e) {
        sendResponse(
            ["error" => "Error fetching tournament detail: " . $e->getMessage(), "trace" => $e->getTraceAsString()],
            500
        );
    }
}


function createTournament($pdo, $data)
{
    try {
        $pdo->beginTransaction();

        // Control de rol para is_jo y asignación de organizador y tipo
        $currentUser = $_SESSION['user'] ?? null;
        $userId = $currentUser['id'] ?? null;
        
        $isPrivileged = false;
        $userOrganizer = 'Otros';
        
        if ($userId) {
            $stmtUser = $pdo->prepare("SELECT global_role, organizer FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $userDb = $stmtUser->fetch();
            if ($userDb) {
                $role = $userDb['global_role'];
                $isPrivileged = in_array($role, ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
                $userOrganizer = $userDb['organizer'] ?: 'Otros';
            }
        }

        $isLegacy = !empty($data['legacy']) || ($data['is_legacy'] ?? false) || ($data['structure'] ?? '') === 'legacy';
        $legacyValue = $isLegacy ? 1 : 0;
        
        if (!$isPrivileged) {
            $status = $isLegacy ? 'closed' : 'open';
        } else {
            $status = $isLegacy ? 'closed' : ($data['status'] ?? 'draft');
        }
        
        // Obtener la temporada activa actual
        $activeSeason = $pdo->query("SELECT name FROM seasons WHERE is_active = 1 LIMIT 1")->fetchColumn();
        $season = $activeSeason ?: date('Y');

        $isJo = ($isPrivileged && !empty($data['is_jo'])) ? 1 : 0;
        
        // Asignación automática de tipo de torneo y organizador
        if (!$isPrivileged) {
            $tournamentType = 'pichanga';
            $organizerId = 'Otros';
        } else {
            $tournamentType = $data['tournament_type'] ?? 'barrio';
            if ($isJo == 1) {
                $organizerId = 'Kick On Oficial';
            } else {
                $organizerId = $userOrganizer;
            }
        }
        
        // start_date es la fecha real de inicio
        $startDateStr = $data['start_date'] ?? null;

        $sql = "INSERT INTO tournaments (name, organizer_id, status, is_jo, legacy, is_invitational, participant_type, structure, season,
registration_start, registration_end, start_date, end_date, prizes, min_teams, max_teams, has_third_place, highlight_settings,
region_id, tournament_type, competitiveness_level, tournament_level, created_by_user_id)
VALUES (:name, :organizer_id, :status, :is_jo, :legacy, :is_invitational, :participant_type, :structure, :season, :registration_start,
:registration_end, :start_date, :end_date, :prizes, :min_teams, :max_teams, :has_third_place, :highlight_settings,
:region_id, :tournament_type, :competitiveness_level, :tournament_level, :created_by_user_id)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => $data['name'],
            ':organizer_id' => $organizerId,
            ':status' => $status,
            ':is_jo' => $isJo,
            ':legacy' => $legacyValue,
            ':is_invitational' => !empty($data['is_invitational']) ? 1 : 0,
            ':participant_type' => $data['participant_type'] ?? 'individual',
            ':structure' => $data['structure'] ?? 'liga',
            ':season' => $season,
            ':registration_start' => $data['registration_start'] ?? null,
            ':registration_end' => $data['registration_end'] ?? null,
            ':start_date' => $startDateStr,
            ':end_date' => $isLegacy ? ($data['start_date'] ?? date('Y-m-d H:i:s')) : null,
            ':prizes' => $data['prizes'] ?? null,
            ':min_teams' => (int)($data['min_teams'] ?? 2),
            ':max_teams' => (int)($data['max_teams'] ?? 16),
            ':has_third_place' => $data['has_third_place'] ?? 0,
            ':highlight_settings' => isset($data['highlight_settings']) ? json_encode($data['highlight_settings']) : null,
            ':region_id' => $data['region_id'] ?? null,
            ':tournament_type' => $tournamentType,
            ':competitiveness_level' => $data['competitiveness_level'] ?? 'semiprofesional',
            ':tournament_level' => $tournamentType,
            ':created_by_user_id' => $userId
        ]);
        
        $newTournamentId = $pdo->lastInsertId();

        // Guardar regiones permitidas si existen
        if (isset($data['allowed_regions']) && is_array($data['allowed_regions'])) {
            $stmtRegionInsert = $pdo->prepare("INSERT INTO tournament_regions (tournament_id, region_id) VALUES (?, ?)");
            foreach ($data['allowed_regions'] as $regId) {
                if (!empty($regId)) {
                    $stmtRegionInsert->execute([$newTournamentId, (int)$regId]);
                }
            }
        }

        if ($isLegacy && !empty($data['champion_id'])) {
            $championId = $data['champion_id'];
            
            // 1. Inscribir obligatoriamente como participante
            $stmtPart = $pdo->prepare("INSERT INTO tournament_participants (tournament_id, team_id, is_waiting, enrolled_at) VALUES (?, ?, 0, NOW())");
            $stmtPart->execute([$newTournamentId, $championId]);

            // 2. Insertar victoria en podios (para Palmarés)
            $stmtPod = $pdo->prepare("INSERT INTO tournament_podiums (tournament_id, team_id, position) VALUES (?, ?, 1)");
            $stmtPod->execute([$newTournamentId, $championId]);

            // Nota explícita: A petición, los Torneos Legacy suman 0 Elo
        }

        $pdo->commit();
        sendResponse(["status" => "success", "id" => $newTournamentId]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error creating tournament: " . $e->getMessage()], 500);
    }
}

function updateTournament($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de torneo requerido"], 400);
    }

    try {
        // 1. Obtener datos actuales para servir de base (Evita reseteos por campos faltantes)
        $stmtCurrent = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
        $stmtCurrent->execute([$data['id']]);
        $current = $stmtCurrent->fetch();

        if (!$current) {
            sendResponse(["error" => "Torneo no encontrado"], 404);
        }

        // Control de rol para is_jo
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        $isCreator = $currentUser && ((int)($current['created_by_user_id'] ?? 0) === (int)($currentUser['id'] ?? -1));
        if (!$isPrivileged && !$isCreator) {
            sendResponse(["error" => "No autorizado para modificar este torneo"], 403);
        }

        $isJo = $current['is_jo'];
        if (isset($data['is_jo'])) {
            $isJo = ($isPrivileged && $data['is_jo']) ? 1 : 0;
        }

        // 2. Definir parámetros combinando actuales con nuevos
        $sql = "UPDATE tournaments SET
            name = :name,
            organizer_id = :organizer_id,
            status = :status,
            is_jo = :is_jo,
            is_invitational = :is_invitational,
            participant_type = :participant_type,
            structure = :structure,
            invite_code = :invite_code,
            match_format = :match_format,
            registration_start = :registration_start,
            registration_end = :registration_end,
            start_date = :start_date,
            prizes = :prizes,
            min_teams = :min_teams,
            max_teams = :max_teams,
            has_third_place = :has_third_place,
            highlight_settings = :highlight_settings,
            region_id = :region_id,
            tournament_type = :tournament_type,
            competitiveness_level = :competitiveness_level,
            tournament_level = :tournament_level";

        $tType = $data['tournament_type'] ?? $current['tournament_type'];

        $params = [
            ':id' => $data['id'],
            ':name' => $data['name'] ?? $current['name'],
            ':organizer_id' => $data['organizer_id'] ?? $current['organizer_id'],
            ':status' => $data['status'] ?? $current['status'],
            ':is_jo' => $isJo,
            ':is_invitational' => isset($data['is_invitational']) ? (!empty($data['is_invitational']) ? 1 : 0) : ($current['is_invitational'] ?? 0),
            ':participant_type' => $data['participant_type'] ?? $current['participant_type'],
            ':structure' => $data['structure'] ?? $current['structure'],
            ':invite_code' => $data['invite_code'] ?? $current['invite_code'],
            ':match_format' => $data['match_format'] ?? $current['match_format'],
            ':registration_start' => $data['registration_start'] ?? $current['registration_start'],
            ':registration_end' => $data['registration_end'] ?? $current['registration_end'],
            ':start_date' => $data['start_date'] ?? $current['start_date'],
            ':prizes' => $data['prizes'] ?? $current['prizes'],
            ':min_teams' => (int)($data['min_teams'] ?? $current['min_teams']),
            ':max_teams' => (int)($data['max_teams'] ?? $current['max_teams']),
            ':has_third_place' => isset($data['has_third_place']) ? $data['has_third_place'] : $current['has_third_place'],
            ':highlight_settings' => isset($data['highlight_settings']) ? json_encode($data['highlight_settings']) : $current['highlight_settings'],
            ':region_id' => $data['region_id'] ?? $current['region_id'],
            ':tournament_type' => $tType,
            ':competitiveness_level' => $data['competitiveness_level'] ?? $current['competitiveness_level'],
            ':tournament_level' => $tType
        ];

        // 3. Manejar columnas dinámicas (si vienen en la petición)
        if (isset($data['rules_url'])) {
            $sql .= ",\nrules_url = :rules_url";
            $params[':rules_url'] = $data['rules_url'];
        }
        if (isset($data['banner_url'])) {
            $sql .= ",\nbanner_url = :banner_url";
            $params[':banner_url'] = $data['banner_url'];
        }

        $sql .= "\nWHERE id = :id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Actualizar regiones permitidas si se especifican en la petición
        if (isset($data['allowed_regions']) && is_array($data['allowed_regions'])) {
            $stmtDel = $pdo->prepare("DELETE FROM tournament_regions WHERE tournament_id = ?");
            $stmtDel->execute([$data['id']]);

            $stmtRegionInsert = $pdo->prepare("INSERT INTO tournament_regions (tournament_id, region_id) VALUES (?, ?)");
            foreach ($data['allowed_regions'] as $regId) {
                if (!empty($regId)) {
                    $stmtRegionInsert->execute([$data['id'], (int)$regId]);
                }
            }
        }

        sendResponse(["status" => "success"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error updating tournament: " . $e->getMessage()], 500);
    }
}

function enrollTeam($pdo, $data)
{
    try {
        $tournamentId = $data['tournament_id'];
        $teamId = $data['team_id'];
        $inviteCode = $data['invite_code'] ?? null;

        // Obtener detalles del torneo
        $stmt = $pdo->prepare("SELECT status, invite_code, max_teams, (SELECT COUNT(*) FROM tournament_participants WHERE
tournament_id = ? AND is_waiting = 0) as current_participants FROM tournaments WHERE id = ?");
        $stmt->execute([$tournamentId, $tournamentId]);
        $tournament = $stmt->fetch();

        if (!$tournament) {
            sendResponse(["error" => "Torneo no encontrado"], 404);
        }

        // Validar estado para inscripciones
        if (!in_array(strtolower($tournament['status']), ['open'])) {
            sendResponse([
                "error" => "Las inscripciones para este torneo están cerradas o no disponibles (Estado: " .
                    $tournament['status'] . ")"
            ], 400);
        }

        if ($tournament['invite_code'] && $tournament['invite_code'] !== $inviteCode) {
            sendResponse(["error" => "Código de invitación inválido"], 403);
        }

        // Verificar si ya está inscrito
        $stmtCheck = $pdo->prepare("SELECT id FROM tournament_participants WHERE tournament_id = ? AND team_id = ?");
        $stmtCheck->execute([$tournamentId, $teamId]);
        if ($stmtCheck->fetch()) {
            sendResponse(["error" => "El equipo ya está inscrito"], 400);
        }

        $deckId = !empty($data['deck_id']) ? (int)$data['deck_id'] : null;
        $isWaiting = 1;

        $sql = "INSERT INTO tournament_participants (tournament_id, team_id, is_waiting, deck_id, enrolled_at) VALUES (?, ?, ?, ?, NOW())";
        $pdo->prepare($sql)->execute([$tournamentId, $teamId, $isWaiting, $deckId]);

        sendResponse(["status" => "success", "message" => "Solicitud de inscripción enviada a lista de espera correctamente", "is_waiting" => true]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error enrolling team: " . $e->getMessage()], 500);
    }
}

function startTournament($pdo, $data)
{
    try {
        $tournamentId = $data['id'];
        $seedingMethod = $data['seeding_method'] ?? 'random';
        $seedingParams = $data['seeding_params'] ?? [];

        // Validar permisos
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        $stmtCreator = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
        $stmtCreator->execute([$tournamentId]);
        $createdBy = $stmtCreator->fetchColumn();
        
        $isCreator = $currentUser && ((int)$createdBy === (int)($currentUser['id'] ?? -1));
        if (!$isPrivileged && !$isCreator) {
            sendResponse(["error" => "No autorizado para iniciar este torneo"], 403);
        }

        $pdo->beginTransaction();

        $engine = EngineFactory::getEngine($pdo, $tournamentId);

        if (!$engine->canStart()) {
            throw new Exception("El torneo no cumple con los requisitos mínimos para iniciar.");
        }

        // Limpiar datos previos si el torneo se está reiniciando
        $pdo->prepare("DELETE FROM matches WHERE tournament_id = ?")->execute([$tournamentId]);
        $pdo->prepare("DELETE FROM tournament_standings WHERE tournament_id = ?")->execute([$tournamentId]);

        $matchesCreated = $engine->generateFixture($seedingMethod, $seedingParams);

        // Actualizar estado y guardar configuración de seeding en formato JSON
        $stmtUpdate = $pdo->prepare("UPDATE tournaments SET status = 'in_progress', engine_settings = ? WHERE id = ?");
        $stmtUpdate->execute([json_encode($seedingParams), $tournamentId]);

        $engine->updateStandings();

        // Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'START_TOURNAMENT', 'tournament', $tournamentId, null, [
            "matches" => $matchesCreated
        ]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Torneo iniciado con $matchesCreated partidos generados."]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        sendResponse([
            "error" => "Error al iniciar torneo: " . $e->getMessage(),
            "file" => $e->getFile(),
            "line" => $e->getLine(),
            "trace" => $e->getTraceAsString()
        ], 500);
    }
}

function closeTournament($pdo, $data)
{
    try {
        $tournamentId = $data['id'];
        $championId = $data['champion_id'] ?? null;
        $isJo = $data['is_jo'] ?? 0;
        $podium = $data['podium'] ?? [];
        $stats = $data['stats'] ?? null;

        // Validar permisos
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        $stmtCreator = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
        $stmtCreator->execute([$tournamentId]);
        $createdBy = $stmtCreator->fetchColumn();
        
        $isCreator = $currentUser && ((int)$createdBy === (int)($currentUser['id'] ?? -1));
        if (!$isPrivileged && !$isCreator) {
            sendResponse(["error" => "No autorizado para cerrar este torneo"], 403);
            return;
        }

        $stmtStatus = $pdo->prepare("SELECT status FROM tournaments WHERE id = ?");
        $stmtStatus->execute([$tournamentId]);
        $currentStatus = $stmtStatus->fetchColumn();

        if ($currentStatus === 'closed') {
            sendResponse(["error" => "El torneo ya se encuentra cerrado"], 400);
            return;
        }

        $pdo->beginTransaction();

        $engine = EngineFactory::getEngine($pdo, $tournamentId);

        // Si no viene podio ni campeón, intentamos obtenerlo del Engine (Copa/Liga/etc)
        if (empty($podium) && empty($championId)) {
            $autoPodium = $engine->getPodium();
            if (!empty($autoPodium)) {
                foreach ($autoPodium as $p) {
                    // Manejar formato antiguo (solo ID) y nuevo (array con team_id y position)
                    if (is_array($p) && isset($p['team_id'])) {
                        $teamId = $p['team_id'];
                        $pos = $p['position'] ?? 1;
                    } else {
                        // Fallback por si acaso algún engine aún devuelve solo IDs
                        $teamId = $p;
                        $pos = count($podium) + 1;
                    }

                    $podium[$pos] = $teamId;
                    if ($pos == 1)
                        $championId = $teamId;
                }
            }
        }

        // 1. Cerrar torneo
        $stmtT = $pdo->prepare("SELECT tournament_type FROM tournaments WHERE id = ?");
        $stmtT->execute([$tournamentId]);
        $tType = $stmtT->fetchColumn() ?: 'barrio';
        $tournamentLevel = $tType;

        $sqlClose = "UPDATE tournaments SET status = 'closed', end_date = NOW()";
        $params = [':id' => $tournamentId];

        if ($isJo && $stats) {
            $sqlClose .= ", 
                         tournament_level = :tournament_level,
                         top_scorer_team_id = :top_scorer, 
                         best_defense_team_id = :best_defense, 
                         fair_play_team_id = :fair_play";
            $params[':tournament_level'] = $tournamentLevel;
            $params[':top_scorer'] = !empty($stats['top_scorer_team_id']) ? $stats['top_scorer_team_id'] : null;
            $params[':best_defense'] = !empty($stats['best_defense_team_id']) ? $stats['best_defense_team_id'] : null;
            
            // Unir si viene como array para fair_play
            if (isset($stats['fair_play_team_id']) && is_array($stats['fair_play_team_id'])) {
                $params[':fair_play'] = implode(',', $stats['fair_play_team_id']);
                $stats['fair_play_team_id'] = $params[':fair_play']; // Para el helper
            } else {
                $params[':fair_play'] = !empty($stats['fair_play_team_id']) ? $stats['fair_play_team_id'] : null;
            }
        }

        $sqlClose .= " WHERE id = :id";
        $stmt = $pdo->prepare($sqlClose);
        $stmt->execute($params);

        // 2. Limpiar podiums previos por seguridad
        $pdo->prepare("DELETE FROM tournament_podiums WHERE tournament_id = ?")->execute([$tournamentId]);

        // 3. Registrar podio
        $stmtPodium = $pdo->prepare("INSERT INTO tournament_podiums (tournament_id, team_id, position) VALUES (?, ?, ?)");

        if (!empty($podium)) {
            foreach ($podium as $position => $teamId) {
                if (!empty($teamId)) {
                    $stmtPodium->execute([$tournamentId, $teamId, (int) $position]);
                }
            }
        } elseif ($championId) {
            // Fallback si no viene podio (solo campeón)
            $stmtPodium->execute([$tournamentId, $championId, 1]);
        }

        // 4. Actualizar palmarés (opcional: el sistema ya usa tournament_podiums para mostrar ganadores)
        if ($championId) {
            try {
                $pdo->prepare("UPDATE teams SET current_elo = current_elo + 50 WHERE id = ?")->execute([$championId]);
            } catch (Throwable $e) { /* Ignorar si no hay lógica de premios ELO aquí */
            }
        }

        // 5. Procesar Ránking Oficial Kick On si es torneo JO
        if ($isJo) {
            processOfficialRanking($pdo, $tournamentId, $stats, $tournamentLevel, $podium);
        }

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Torneo cerrado, podio y estadísticas registradas correctamente."]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        file_put_contents(dirname(__DIR__) . '/close_error.txt', date('Y-m-d H:i:s') . ' - Close Tournament Error: ' . $e->getMessage() . "\nTrace: " . $e->getTraceAsString() . "\n\n");
        sendResponse(["error" => "Error closing tournament: " . $e->getMessage(), "trace" => $e->getTraceAsString()], 500);
    }
}

function generateSwissRound($pdo, $data)
{
    try {
        $tournamentId = $data['id'];

        // Validar permisos
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        $stmtCreator = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
        $stmtCreator->execute([$tournamentId]);
        $createdBy = $stmtCreator->fetchColumn();
        
        $isCreator = $currentUser && ((int)$createdBy === (int)($currentUser['id'] ?? -1));
        if (!$isPrivileged && !$isCreator) {
            sendResponse(["error" => "No autorizado para generar rondas en este torneo"], 403);
        }

        $pdo->beginTransaction();

        $engine = EngineFactory::getEngine($pdo, $tournamentId);
        if (!($engine instanceof SuizoEngine)) {
            throw new Exception("Este torneo no soporta generación automática de rondas suizas.");
        }

        // 1. Asegurar standings frescos para el ranking
        $engine->updateStandings();

        // 2. Generar la siguiente ronda usando la lógica del motor
        $matchesCreated = $engine->generateNextRound();

        if ($matchesCreated === 0) {
            throw new Exception("No se pudieron generar nuevos partidos. Verifique los participantes.");
        }

        // Registrar Auditoría
        $currentUser = $_SESSION['user'] ?? ['id' => 0];
        logAudit($pdo, $currentUser['id'], 'GENERATE_SWISS_ROUND', 'tournament', $tournamentId, null, [
            "matches_created" => $matchesCreated
        ]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Ronda generada correctamente con $matchesCreated partidos."]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        sendResponse(["error" => "Error al generar ronda suiza: " . $e->getMessage()], 500);
    }
}

function promoteParticipant($pdo, $data)
{
    if (empty($data['tournament_id']) || empty($data['team_id'])) {
        sendResponse(["error" => "ID de torneo y equipo requeridos"], 400);
    }

    try {
        // Validar permisos
        $currentUser = $_SESSION['user'] ?? null;
        $isPrivileged = $currentUser && in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        $stmtCreator = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
        $stmtCreator->execute([$data['tournament_id']]);
        $createdBy = $stmtCreator->fetchColumn();
        
        $isCreator = $currentUser && ((int)$createdBy === (int)($currentUser['id'] ?? -1));
        if (!$isPrivileged && !$isCreator) {
            sendResponse(["error" => "No autorizado para promover participantes de este torneo"], 403);
        }

        $pdo->beginTransaction();

        // Si se pide incrementar el cupo
        if (!empty($data['increase_max'])) {
            $stmtUpdateMax = $pdo->prepare("UPDATE tournaments SET max_teams = max_teams + 1 WHERE id = ?");
            $stmtUpdateMax->execute([$data['tournament_id']]);
        }

        $stmt = $pdo->prepare("UPDATE tournament_participants SET is_waiting = 0 WHERE tournament_id = ? AND team_id = ?");
        $stmt->execute([$data['tournament_id'], $data['team_id']]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Equipo promovido correctamente"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendResponse(["error" => "Error al promover participante: " . $e->getMessage()], 500);
    }
}

function deleteTournament($pdo, $id)
{
    try {
        // Verificar existencia
        $stmtCheck = $pdo->prepare("SELECT id FROM tournaments WHERE id = ?");
        $stmtCheck->execute([$id]);
        if (!$stmtCheck->fetch()) {
            sendResponse(["error" => "Torneo no encontrado"], 404);
        }

        $pdo->beginTransaction();

        // 1. Obtener todos los partidos de este torneo
        $stmtMatches = $pdo->prepare("SELECT id FROM matches WHERE tournament_id = ?");
        $stmtMatches->execute([$id]);
        $matches = $stmtMatches->fetchAll(PDO::FETCH_COLUMN);

        // 2. Si hubo partidos, manejar ELO history y eventos
        if (!empty($matches)) {
            // Preparar statement para reestablecer ELO matemático invertido
            $stmtUpdateElo = $pdo->prepare("UPDATE teams SET current_elo = current_elo - :diff WHERE id = :team_id");
            $stmtGetHistory = $pdo->prepare("SELECT team_id, diff FROM elo_history WHERE match_id = ?");

            foreach ($matches as $matchId) {
                // Sacar historia de ELO
                $stmtGetHistory->execute([$matchId]);
                $historyRecords = $stmtGetHistory->fetchAll();

                foreach ($historyRecords as $record) {
                    $stmtUpdateElo->execute([
                        ':diff' => $record['diff'],
                        ':team_id' => $record['team_id']
                    ]);
                }
            }

            // Preparar placeholers para clausura IN (...)
            $inQuery = implode(',', array_fill(0, count($matches), '?'));

            // Borrar de elo_history
            $stmtDelEloHistory = $pdo->prepare("DELETE FROM elo_history WHERE match_id IN ($inQuery)");
            $stmtDelEloHistory->execute($matches);

            // Borrar match_events de estos partidos
            $stmtDelMatchEvents = $pdo->prepare("DELETE FROM match_events WHERE match_id IN ($inQuery)");
            $stmtDelMatchEvents->execute($matches);
        }

        // 3. Borrar dependencias directas del torneo
        $pdo->prepare("DELETE FROM tournament_standings WHERE tournament_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM tournament_participants WHERE tournament_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM tournament_podiums WHERE tournament_id = ?")->execute([$id]);
        
        // 4. Borrar matches
        $pdo->prepare("DELETE FROM matches WHERE tournament_id = ?")->execute([$id]);

        // 5. Borrar torneo (Destrucción total/Hard Delete)
        $pdo->prepare("DELETE FROM tournaments WHERE id = ?")->execute([$id]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Torneo, partidos y modificaciones ELO eliminados y devueltos limpiamente."]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error grave durante la eliminación en cascada: " . $e->getMessage()], 500);
    }
}

function getTournamentCategories($pdo)
{
    try {
        $stmt = $pdo->query("SELECT * FROM tournament_categories ORDER BY name ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse($categories);
    } catch (Throwable $e) {
        sendResponse(["error" => $e->getMessage()], 500);
    }
}

function createCategory($pdo, $data) {
    try {
        $stmt = $pdo->prepare("INSERT INTO tournament_categories (name, slug, description, logo_url) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $data['name'], 
            $data['slug'] ?? strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['name']))), 
            $data['description'] ?? null, 
            $data['logo_url'] ?? null
        ]);
        sendResponse(["status" => "success", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error creating category: " . $e->getMessage()], 500);
    }
}

function updateCategory($pdo, $data) {
    if (!isset($data['id'])) sendResponse(["error" => "ID requerido"], 400);
    try {
        $stmt = $pdo->prepare("UPDATE tournament_categories SET name = ?, slug = ?, description = ?, logo_url = ? WHERE id = ?");
        $stmt->execute([
            $data['name'], 
            $data['slug'] ?? strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['name']))), 
            $data['description'] ?? null, 
            $data['logo_url'] ?? null,
            $data['id']
        ]);
        sendResponse(["status" => "success"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error updating category: " . $e->getMessage()], 500);
    }
}

function deleteCategory($pdo, $data) {
    if (!isset($data['id'])) sendResponse(["error" => "ID requerido"], 400);
    try {
        // Podríamos poner en NULL el category_id de los torneos asociados primero para no violar restricciones si las hay
        $pdo->prepare("UPDATE tournaments SET category_id = NULL WHERE category_id = ?")->execute([$data['id']]);
        
        $stmt = $pdo->prepare("DELETE FROM tournament_categories WHERE id = ?");
        $stmt->execute([$data['id']]);
        sendResponse(["status" => "success"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error deleting category: " . $e->getMessage()], 500);
    }
}

function getTeamTournaments($pdo, $teamId) {
    try {
        $sql = "
SELECT t.*, tp.group_name, tp.enrolled_at,
(SELECT COUNT(*) FROM tournament_participants tps WHERE tps.tournament_id = t.id) as participants_count,
(SELECT position FROM tournament_podiums pod WHERE pod.tournament_id = t.id AND pod.team_id = :team_id_pod) as podium_position,
winner_team.name as winner_name,
winner_team.logo_url as winner_logo
FROM tournaments t
JOIN tournament_participants tp ON t.id = tp.tournament_id
LEFT JOIN tournament_podiums pod_win ON t.id = pod_win.tournament_id AND pod_win.position = 1
LEFT JOIN teams winner_team ON pod_win.team_id = winner_team.id
WHERE tp.team_id = :team_id_part AND t.deleted_at IS NULL
ORDER BY t.start_date DESC
";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':team_id_pod', $teamId, PDO::PARAM_INT);
        $stmt->bindValue(':team_id_part', $teamId, PDO::PARAM_INT);
        $stmt->execute();
        $tournaments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse($tournaments);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error fetching team tournaments: " . $e->getMessage()], 500);
    }
}

function linkDeck($pdo, $data)
{
    if (empty($data['tournament_id']) || empty($data['team_id'])) {
        sendResponse(["error" => "ID de torneo y equipo requeridos"], 400);
    }

    try {
        $tournamentId = $data['tournament_id'];
        $teamId = $data['team_id'];
        $deckId = !empty($data['deck_id']) ? (int)$data['deck_id'] : null;

        $currentUser = $_SESSION['user'] ?? null;
        if (!$currentUser) {
            sendResponse(["error" => "No autenticado"], 401);
        }

        // Validar que el torneo no esté cerrado
        $stmtStatus = $pdo->prepare("SELECT status FROM tournaments WHERE id = ?");
        $stmtStatus->execute([$tournamentId]);
        $tournamentStatus = $stmtStatus->fetchColumn();

        if (strtolower($tournamentStatus) === 'closed') {
            sendResponse(["error" => "No se puede vincular un mazo porque el torneo ya está cerrado"], 403);
        }

        // Validar permisos
        $isPrivileged = in_array($currentUser['global_role'], ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
        
        // Creador del torneo
        $stmtCreator = $pdo->prepare("SELECT created_by_user_id FROM tournaments WHERE id = ?");
        $stmtCreator->execute([$tournamentId]);
        $createdBy = $stmtCreator->fetchColumn();
        $isCreator = ((int)$createdBy === (int)$currentUser['id']);

        // Dueño del equipo
        $stmtTeam = $pdo->prepare("SELECT owner_user_id FROM teams WHERE id = ?");
        $stmtTeam->execute([$teamId]);
        $ownerId = $stmtTeam->fetchColumn();
        $isOwner = ((int)$ownerId === (int)$currentUser['id']);

        if (!$isPrivileged && !$isCreator && !$isOwner) {
            sendResponse(["error" => "No tienes permisos para vincular un mazo a este equipo"], 403);
        }

        // Si se especificó un deckId, validar que pertenezca al usuario (o si es admin)
        if ($deckId !== null && !$isPrivileged) {
            $stmtDeck = $pdo->prepare("SELECT user_id FROM decks WHERE id = ?");
            $stmtDeck->execute([$deckId]);
            $deckOwnerId = $stmtDeck->fetchColumn();
            if ((int)$deckOwnerId !== (int)$currentUser['id']) {
                sendResponse(["error" => "El mazo seleccionado no te pertenece"], 403);
            }
        }

        $pdo->beginTransaction();

        // Obtener el mazo anteriormente vinculado (si lo hubiera) para recalcular su winrate
        $stmtOldDeck = $pdo->prepare("SELECT deck_id FROM tournament_participants WHERE tournament_id = ? AND team_id = ?");
        $stmtOldDeck->execute([$tournamentId, $teamId]);
        $oldDeckId = $stmtOldDeck->fetchColumn();

        // Actualizar mazo en tournament_participants
        $stmtUpdate = $pdo->prepare("UPDATE tournament_participants SET deck_id = ? WHERE tournament_id = ? AND team_id = ?");
        $stmtUpdate->execute([$deckId, $tournamentId, $teamId]);

        // Recalcular winrates de ambos mazos
        $decksToRecalculate = [];
        if ($oldDeckId) {
            $decksToRecalculate[] = $oldDeckId;
        }
        if ($deckId) {
            $decksToRecalculate[] = $deckId;
        }
        
        if (!empty($decksToRecalculate)) {
            recalculateDeckWinRates($pdo, array_unique($decksToRecalculate));
        }

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Mazo vinculado correctamente"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al vincular mazo: " . $e->getMessage()], 500);
    }
}
?>
