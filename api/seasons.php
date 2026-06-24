<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'active') {
                getActiveSeason($pdo);
            } else {
                getSeasons($pdo);
            }
            break;
        case 'POST':
            if (!$data || !isset($data['action'])) {
                sendResponse(["error" => "No se recibieron datos válidos"], 400);
            }

            checkAuth(['SUPER_ADMIN', 'ADMIN']);

            switch ($data['action']) {
                case 'create':
                    createSeason($pdo, $data);
                    break;
                case 'activate':
                    activateSeason($pdo, $data);
                    break;
                case 'close':
                    closeSeason($pdo, $data);
                    break;
                case 'update':
                    updateSeason($pdo, $data);
                    break;
                default:
                    sendResponse(["error" => "Acción no permitida"], 400);
                    break;
            }
            break;
        default:
            sendResponse(["message" => "Método no permitido"], 405);
            break;
    }
} catch (Throwable $e) {
    sendResponse(["error" => "Error inesperado: " . $e->getMessage()], 500);
}

function getSeasons($pdo)
{
    try {
        $stmt = $pdo->query("SELECT * FROM seasons ORDER BY created_at DESC");
        $seasons = $stmt->fetchAll();
        sendResponse($seasons);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener las temporadas: " . $e->getMessage()], 500);
    }
}

function getActiveSeason($pdo)
{
    try {
        $stmt = $pdo->prepare("SELECT * FROM seasons WHERE is_active = 1 LIMIT 1");
        $stmt->execute();
        $season = $stmt->fetch();
        sendResponse($season ?: null);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener la temporada activa: " . $e->getMessage()], 500);
    }
}

function createSeason($pdo, $data)
{
    if (empty($data['name'])) {
        sendResponse(["error" => "El nombre de la temporada es requerido"], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO seasons (name, is_active, start_date) VALUES (?, 0, NOW())");
        $stmt->execute([$data['name']]);
        sendResponse(["status" => "success", "id" => $pdo->lastInsertId(), "message" => "Temporada creada correctamente"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al crear la temporada: " . $e->getMessage()], 500);
    }
}

function activateSeason($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de temporada requerido"], 400);
    }

    try {
        $pdo->beginTransaction();

        // Desactivar todas las temporadas
        $pdo->exec("UPDATE seasons SET is_active = 0");

        // Activar la seleccionada
        $stmt = $pdo->prepare("UPDATE seasons SET is_active = 1 WHERE id = ?");
        $stmt->execute([$data['id']]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Temporada activada correctamente"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al activar la temporada: " . $e->getMessage()], 500);
    }
}

function closeSeason($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de temporada requerido"], 400);
    }

    try {
        $pdo->beginTransaction();

        // 1. Obtener el nombre de la temporada antes de cerrarla
        $stmtName = $pdo->prepare("SELECT name FROM seasons WHERE id = ?");
        $stmtName->execute([$data['id']]);
        $season = $stmtName->fetch();
        if (!$season) {
            $pdo->rollBack();
            sendResponse(["error" => "Temporada no encontrada"], 404);
            return;
        }
        $seasonName = $season['name'];

        // 2. Cerrar la temporada
        $stmtClose = $pdo->prepare("UPDATE seasons SET is_active = 0, end_date = NOW() WHERE id = ?");
        $stmtClose->execute([$data['id']]);

        // 3. Generar el cierre ELO (Snapshot de temporada) automáticamente en la tabla team_season_stats
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

        // Obtener todos los equipos activos ordenados por ELO descendente para calcular ranking
        $stmtTeams = $pdo->query("SELECT id, current_elo, official_ranking_points FROM teams WHERE status = 'ACTIVE' ORDER BY current_elo DESC");
        $teams = $stmtTeams->fetchAll();

        if (!empty($teams)) {
            $stmtInsert = $pdo->prepare("INSERT INTO team_season_stats (team_id, season_name, final_elo, final_ranking_position, final_official_points) VALUES (?, ?, ?, ?, ?)");
            $rank = 1;
            foreach ($teams as $team) {
                $stmtInsert->execute([
                    $team['id'],
                    $seasonName,
                    $team['current_elo'],
                    $rank,
                    $team['official_ranking_points'] ?? 0
                ]);
                $rank++;
            }
        }

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Temporada cerrada correctamente y ranking ELO guardado"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al cerrar la temporada: " . $e->getMessage()], 500);
    }
}

function updateSeason($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de temporada requerido"], 400);
    }
    if (empty($data['name'])) {
        sendResponse(["error" => "El nombre de la temporada es requerido"], 400);
    }

    try {
        $name = $data['name'];
        $startDate = isset($data['start_date']) ? $data['start_date'] : null;
        $endDate = isset($data['end_date']) ? $data['end_date'] : null;

        // Convertir formato T a espacio para MySQL
        $startDateSql = empty($startDate) ? null : str_replace('T', ' ', $startDate);
        $endDateSql = empty($endDate) ? null : str_replace('T', ' ', $endDate);

        if ($startDateSql !== null) {
            if (strlen($startDateSql) == 16) {
                $startDateSql .= ':00';
            }
            if ($endDateSql !== null && strlen($endDateSql) == 16) {
                $endDateSql .= ':00';
            }
            $stmt = $pdo->prepare("UPDATE seasons SET name = ?, start_date = ?, end_date = ? WHERE id = ?");
            $stmt->execute([$name, $startDateSql, $endDateSql, $data['id']]);
        } else {
            if ($endDateSql !== null && strlen($endDateSql) == 16) {
                $endDateSql .= ':00';
            }
            $stmt = $pdo->prepare("UPDATE seasons SET name = ?, end_date = ? WHERE id = ?");
            $stmt->execute([$name, $endDateSql, $data['id']]);
        }

        sendResponse(["status" => "success", "message" => "Temporada actualizada correctamente"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al actualizar la temporada: " . $e->getMessage()], 500);
    }
}
?>
