<?php
require_once 'db.php';

function create_slug($text)
{
    if (!$text)
        return '';
    $text = mb_strtolower($text, 'UTF-8');
    // Reemplazo simple de acentos/eñes para PHP si iconv no está disponible o falla
    $unwanted_array = array('á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n', 'ü' => 'u', 'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u', 'Ñ' => 'n', 'Ü' => 'u');
    $text = strtr($text, $unwanted_array);
    $text = preg_replace('/[^a-z0-9]/', '-', $text);
    $text = preg_replace('/-+/', '-', $text);
    return trim($text, '-');
}

$method = $_SERVER['REQUEST_METHOD'];
try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'history' && (isset($_GET['team_id']) || isset($_GET['id']))) {
                $tId = $_GET['team_id'] ?? $_GET['id'];
                getMatchHistory($pdo, $tId);
            } elseif (isset($_GET['action']) && $_GET['action'] === 'get_claims') {
                getClaims($pdo);
            } elseif (isset($_GET['action']) && $_GET['action'] === 'get_user_claim' && isset($_GET['user_id'])) {
                getUserClaim($pdo, $_GET['user_id']);
            } else {
                $unclaimedOnly = isset($_GET['unclaimed']) && $_GET['unclaimed'] === 'true';
                $showAll = isset($_GET['all']) && $_GET['all'] === 'true';
                $ownerId = isset($_GET['owner_id']) ? $_GET['owner_id'] : null;
                $search = isset($_GET['search']) ? $_GET['search'] : null;
                $basic = isset($_GET['basic']) && $_GET['basic'] === 'true';
                getTeams($pdo, $unclaimedOnly, $ownerId, $showAll, $search, $basic);
            }
            break;
        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            if ($data['action'] === 'claim') {
                checkAuth();
            } elseif ($data['action'] === 'create') {
                checkAuth();
            } elseif ($data['action'] === 'resolve_claim') {
                checkAuth(['SUPER_ADMIN', 'ADMIN']);
            } else {
                checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
            }

            if ($data['action'] === 'create') {
                createTeam($pdo, $data);
            } elseif ($data['action'] === 'claim') {
                claimTeam($pdo, $data);
            } elseif ($data['action'] === 'resolve_claim') {
                resolveClaim($pdo, $data);
            } elseif ($data['action'] === 'update') {
                updateTeam($pdo, $data);
            } else {
                sendResponse(["message" => "Action not supported"], 400);
            }
            break;
        default:
            sendResponse(["message" => "Method not allowed"], 405);
            break;
    }
} catch (Throwable $e) {
    sendResponse(["error" => "Error inesperado en servidor de equipos: " . $e->getMessage()], 500);
}

function getTeams($pdo, $unclaimedOnly = false, $ownerId = null, $showAll = false, $search = null, $basic = false)
{
    try {
        $params = [];
        if ($basic) {
            $query = "SELECT t.id, t.name, t.status, t.logo_url, t.founded_year, t.owner_user_id, t.current_elo FROM teams t WHERE 1=1";
        } else {
            // JOIN con users para obtener el nombre del propietario + Subconsultas de estadísticas completas
            $query = "SELECT t.*, u.username as owner_name,
                      (SELECT COUNT(*) FROM matches m WHERE (m.team_home_id = t.id AND m.score_home > m.score_away) OR (m.team_away_id = t.id AND m.score_away > m.score_home)) as wins_count,
                      (SELECT COUNT(*) FROM matches m WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND m.score_home = m.score_away AND m.score_home IS NOT NULL) as draws_count,
                      (SELECT COUNT(*) FROM matches m WHERE (m.team_home_id = t.id AND m.score_home < m.score_away) OR (m.team_away_id = t.id AND m.score_away < m.score_home)) as losses_count,
                      (SELECT COUNT(*) FROM matches m WHERE m.team_home_id = t.id OR m.team_away_id = t.id) as total_matches,
                      (SELECT IFNULL(SUM(CASE WHEN m.team_home_id = t.id THEN m.score_home ELSE m.score_away END), 0) FROM matches m WHERE m.team_home_id = t.id OR m.team_away_id = t.id) as goals_for,
                      (SELECT IFNULL(SUM(CASE WHEN m.team_home_id = t.id THEN m.score_away ELSE m.score_home END), 0) FROM matches m WHERE m.team_home_id = t.id OR m.team_away_id = t.id) as goals_against,
                      
                      (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE ((m.team_home_id = t.id AND m.score_home > m.score_away) OR (m.team_away_id = t.id AND m.score_away > m.score_home)) AND tr.is_jo = 1) as official_wins_count,
                      (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND m.score_home = m.score_away AND m.score_home IS NOT NULL AND tr.is_jo = 1) as official_draws_count,
                      (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE ((m.team_home_id = t.id AND m.score_home < m.score_away) OR (m.team_away_id = t.id AND m.score_away < m.score_home)) AND tr.is_jo = 1) as official_losses_count,
                      (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND tr.is_jo = 1) as official_total_matches,
                      (SELECT IFNULL(SUM(CASE WHEN m.team_home_id = t.id THEN m.score_home ELSE m.score_away END), 0) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND tr.is_jo = 1) as official_goals_for,
                      (SELECT IFNULL(SUM(CASE WHEN m.team_home_id = t.id THEN m.score_away ELSE m.score_home END), 0) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND tr.is_jo = 1) as official_goals_against,
                      
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1 AND tr.is_jo = 1) as official_titles_count,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1 AND tr.is_jo = 1 AND (tr.tournament_type = 'barrio' OR tr.tournament_level = 'barrio')) as official_titles_barrio,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1 AND tr.is_jo = 1 AND (tr.tournament_type = 'ascenso' OR tr.tournament_level = 'ascenso')) as official_titles_ascenso,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1 AND tr.is_jo = 1 AND (tr.tournament_type = 'oro' OR tr.tournament_level = 'oro')) as official_titles_oro,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 2 AND tr.is_jo = 1) as official_podium_second_count,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 3 AND tr.is_jo = 1) as official_podium_third_count,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 4 AND tr.is_jo = 1) as official_podium_fourth_count,
                      (SELECT GROUP_CONCAT(CONCAT(tr.name, '::', tr.id, '::', COALESCE(NULLIF(tr.tournament_level, ''), NULLIF(tr.tournament_type, ''), 'barrio')) SEPARATOR '|') FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1 AND tr.is_jo = 1) as official_won_tournament_names,
                      
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1) as community_titles_count,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 2) as community_podium_second_count,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 3) as community_podium_third_count,
                      (SELECT COUNT(*) FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 4) as community_podium_fourth_count,
                      (SELECT GROUP_CONCAT(CONCAT(tr.name, '::', tr.id) SEPARATOR '|') FROM tournament_podiums tp JOIN tournaments tr ON tp.tournament_id = tr.id WHERE tp.team_id = t.id AND tp.position = 1) as community_won_tournament_names,
                      (SELECT GROUP_CONCAT(CONCAT(season_name, ':', final_elo) ORDER BY recorded_at ASC SEPARATOR '|') FROM team_season_stats tss WHERE tss.team_id = t.id) as elo_history,
                      (SELECT GROUP_CONCAT(CONCAT(tr.name, ':', rh.points_earned) ORDER BY rh.created_at ASC SEPARATOR '|') FROM official_ranking_history rh JOIN tournaments tr ON rh.tournament_id = tr.id WHERE rh.team_id = t.id) as official_points_history,
                      (SELECT COUNT(*) FROM decks d WHERE d.team_id = t.id) as decks_count
                      FROM teams t 
                      LEFT JOIN users u ON u.id = CAST(NULLIF(TRIM(t.owner_user_id), '') AS UNSIGNED)
                      WHERE 1=1";
        }

        if ($unclaimedOnly) {
            $query .= " AND (t.owner_user_id IS NULL OR t.owner_user_id = '' OR t.owner_user_id = '0')";
        } elseif ($ownerId) {
            $query .= " AND t.owner_user_id = :owner_id";
            $params['owner_id'] = intval($ownerId);
        } elseif (!$showAll) {
            // Si no es para reclamar ni por dueño ni se pide todo, mostramos los activos por defecto
            $query .= " AND (t.status = 'Activo' OR t.status = 'ACTIVE' OR t.status = 'active')";
        }

        if ($search) {
            $query .= " AND t.name COLLATE utf8mb4_unicode_ci LIKE :search";
            $params['search'] = "%$search%";
        }

        $query .= " ORDER BY t.name ASC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $teams = $stmt->fetchAll();

        // Debug temporal: si no hay equipos, enviamos información del query
        if (empty($teams)) {
            error_log("Pancorazo Debug - Query: " . $query);
        }

        sendResponse($teams);
    } catch (Throwable $e) {
        sendResponse(["error" => "Error fetching teams: " . $e->getMessage()], 500);
    }
}

function createTeam($pdo, $data)
{
    try {
        $name = $data['name'];
        $short_name = $data['short_name'] ?? substr($name, 0, 3);
        $logo_url = $data['logo_url'] ?? null;
        $founded_year = $data['founded_year'];
        $owner_user_id = !empty($data['owner_user_id']) ? $data['owner_user_id'] : (!empty($data['owner_id']) ? $data['owner_id'] : null);
        $slug = create_slug($name);

        $status = 'PENDING';
        if (isset($_SESSION['user']) && in_array($_SESSION['user']['global_role'], ['SUPER_ADMIN', 'ADMIN'])) {
            $status = 'ACTIVE';
        }

        $stmt = $pdo->prepare("INSERT INTO teams (name, short_name, slug, logo_url, founded_year, owner_user_id, status, current_elo) VALUES (?, ?, ?, ?, ?, ?, ?, 1000)");
        $stmt->execute([$name, $short_name, $slug, $logo_url, $founded_year, $owner_user_id, $status]);

        sendResponse(["message" => "Team created successfully", "teamId" => $pdo->lastInsertId()], 201);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error creating team: " . $e->getMessage()], 500);
    }
}

function claimTeam($pdo, $data)
{
    try {
        $teamId = $data['teamId'];
        $userId = $data['userId'];

        $stmt_check = $pdo->prepare("SELECT id FROM team_claims WHERE team_id = ? AND user_id = ? AND status = 'PENDING'");
        $stmt_check->execute([$teamId, $userId]);
        if ($stmt_check->rowCount() > 0) {
            sendResponse(["error" => "Ya tienes una solicitud pendiente para este equipo"], 400);
            return;
        }

        $stmt = $pdo->prepare("INSERT INTO team_claims (team_id, user_id, status) VALUES (?, ?, 'PENDING')");
        $stmt->execute([$teamId, $userId]);

        sendResponse(["message" => "Solicitud enviada para revisión por un administrador"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error claiming team: " . $e->getMessage()], 500);
    }
}

function getClaims($pdo)
{
    try {
        $query = "SELECT tc.*, t.name as team_name, u.username as user_name 
                  FROM team_claims tc
                  JOIN teams t ON tc.team_id = t.id
                  JOIN users u ON tc.user_id = u.id
                  WHERE tc.status = 'PENDING'
                  ORDER BY tc.created_at ASC";
        $stmt = $pdo->query($query);
        $claims = $stmt->fetchAll();
        sendResponse($claims);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error fetching claims: " . $e->getMessage()], 500);
    }
}

function getUserClaim($pdo, $userId)
{
    try {
        $stmt = $pdo->prepare("SELECT tc.*, t.name as team_name FROM team_claims tc JOIN teams t ON tc.team_id = t.id WHERE tc.user_id = ? AND tc.status = 'PENDING' LIMIT 1");
        $stmt->execute([$userId]);
        $claim = $stmt->fetch(PDO::FETCH_ASSOC);
        sendResponse($claim ?: null);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error fetching user claim: " . $e->getMessage()], 500);
    }
}

function resolveClaim($pdo, $data)
{
    try {
        $claimId = $data['claimId'];
        $action = $data['resolveAction'] === 'approve' ? 'APPROVED' : 'REJECTED';

        $pdo->beginTransaction();

        $stmt_claim = $pdo->prepare("SELECT team_id, user_id FROM team_claims WHERE id = ?");
        $stmt_claim->execute([$claimId]);
        $claim = $stmt_claim->fetch();

        if (!$claim) {
            $pdo->rollBack();
            sendResponse(["error" => "Solicitud no encontrada"], 404);
            return;
        }

        $stmt = $pdo->prepare("UPDATE team_claims SET status = ? WHERE id = ?");
        $stmt->execute([$action, $claimId]);

        if ($action === 'APPROVED') {
            $stmt_team = $pdo->prepare("UPDATE teams SET owner_user_id = ? WHERE id = ?");
            $stmt_team->execute([$claim['user_id'], $claim['team_id']]);

            $stmt_others = $pdo->prepare("UPDATE team_claims SET status = 'REJECTED' WHERE team_id = ? AND id != ? AND status = 'PENDING'");
            $stmt_others->execute([$claim['team_id'], $claimId]);

            // Aprobamos al usuario correspondiente si estaba PENDING
            $stmt_user = $pdo->prepare("UPDATE users SET status = 'APPROVED' WHERE id = ? AND status = 'PENDING'");
            $stmt_user->execute([$claim['user_id']]);
        } elseif ($action === 'REJECTED') {
            // Rechazamos al usuario correspondiente si estaba PENDING
            $stmt_user = $pdo->prepare("UPDATE users SET status = 'REJECTED' WHERE id = ? AND status = 'PENDING'");
            $stmt_user->execute([$claim['user_id']]);
        }

        $pdo->commit();
        sendResponse(["message" => "Solicitud resuelta correctamente"]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        sendResponse(["error" => "Error resolving claim: " . $e->getMessage()], 500);
    }
}

function updateTeam($pdo, $data)
{
    try {
        $id = $data['id'];
        $name = $data['name'];
        $short_name = $data['short_name'];
        $logo_url = $data['logo_url'] ?? null;
        $banner_url = $data['banner_url'] ?? null;
        $founded_year = $data['founded_year'];
        $status = $data['status'] ?? 'ACTIVE';
        $current_elo = $data['current_elo'] ?? 1000;

        // El slug NO se actualiza aquí para mantenerlo permanente aunque cambie el nombre
        $stmt = $pdo->prepare("UPDATE teams SET name = ?, short_name = ?, logo_url = ?, banner_url = ?, founded_year = ?, status = ?, current_elo = ? WHERE id = ?");
        $stmt->execute([$name, $short_name, $logo_url, $banner_url, $founded_year, $status, $current_elo, $id]);

        sendResponse(["message" => "Team updated successfully"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error updating team: " . $e->getMessage()], 500);
    }
}

function getMatchHistory($pdo, $teamId)
{
    try {
        $sql = "SELECT m.*, eh.diff as diff, m.status as match_status, m.admin_reason as admin_reason,
                       tr.name as tournament_name, tr.is_jo as is_jo,
                       h.name as home_name, h.logo_url as home_logo, h.slug as home_slug,
                       a.name as away_name, a.logo_url as away_logo, a.slug as away_slug
                FROM matches m
                LEFT JOIN tournaments tr ON m.tournament_id = tr.id
                LEFT JOIN teams h ON m.team_home_id = h.id
                LEFT JOIN teams a ON m.team_away_id = a.id
                LEFT JOIN elo_history eh ON m.id = eh.match_id AND eh.team_id = :tm_id
                WHERE (m.team_home_id = :t1 OR m.team_away_id = :t2)
                AND m.status IN ('Played', 'Walkover', 'Pending', 'COMPLETED', 'PLAYED', 'WALKOVER', 'PENDING')
                ORDER BY m.played_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':t1', $teamId, PDO::PARAM_INT);
        $stmt->bindValue(':t2', $teamId, PDO::PARAM_INT);
        $stmt->bindValue(':tm_id', $teamId, PDO::PARAM_INT);
        $stmt->execute();
        
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse($matches);
    } catch (Exception $e) {
        sendResponse(["error" => "Error fetching match history: " . $e->getMessage()], 500);
    }
}

function ensureTeamSeasonStatsSchema($pdo)
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS team_season_stats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            season_name VARCHAR(255) NOT NULL,
            final_elo INT NOT NULL,
            final_ranking_position INT NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )");
        try {
            $pdo->exec("ALTER TABLE team_season_stats ADD COLUMN final_official_points DECIMAL(10,1) DEFAULT 0");
        } catch(Exception $e) {}
    } catch (Exception $e) {
        // Ignorar si ya existe o hay error menor
    }
}


?>