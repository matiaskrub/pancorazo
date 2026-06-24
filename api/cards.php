<?php
require_once 'db.php';

// Configuración básica
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores como HTML

$method = $_SERVER['REQUEST_METHOD'];
$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

try {
    initCardsTable($pdo);
    switch ($method) {
        case 'GET':
            getCards($pdo);
            break;
        case 'POST':
            if (!$data) {
                sendResponse(["error" => "No se recibieron datos válidos (JSON)"], 400);
            }

            // Validar permisos para cualquier acción que modifique datos
            checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

            // Acción de eliminar vía POST
            if (isset($data['action']) && $data['action'] === 'delete') {
                if (isset($data['id'])) {
                    deleteCard($pdo, $data['id']);
                } else {
                    sendResponse(["error" => "ID faltante para eliminación"], 400);
                }
            }
            // Acción de actualizar (si tiene ID)
            else if (isset($data['id']) && $data['id'] !== '' && $data['id'] !== null) {
                updateCard($pdo, $data);
            }
            // Acción de crear
            else {
                addCard($pdo, $data);
            }
            break;
        case 'DELETE':
            $id = $_GET['id'] ?? $data['id'] ?? null;
            if ($id) {
                deleteCard($pdo, $id);
            } else {
                sendResponse(["error" => "ID faltante para eliminación"], 400);
            }
            break;
        default:
            sendResponse(["message" => "Método no permitido"], 405);
            break;
    }
} catch (Exception $e) {
    sendResponse(["error" => "Error inesperado: " . $e->getMessage()], 500);
}

function initCardsTable($pdo)
{
    try {
        // Verificar si la columna is_hero existe
        $stmt = $pdo->query("SHOW COLUMNS FROM cards LIKE 'is_hero'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE cards ADD COLUMN is_hero TINYINT(1) DEFAULT 0");
            // Inicializar las primeras 15 cartas como Hero para no dejar la Home vacía
            $pdo->exec("UPDATE cards SET is_hero = 1 LIMIT 15");
        }

        // Verificar si la columna is_fan existe
        $stmt_fan = $pdo->query("SHOW COLUMNS FROM cards LIKE 'is_fan'");
        if (!$stmt_fan->fetch()) {
            $pdo->exec("ALTER TABLE cards ADD COLUMN is_fan TINYINT(1) DEFAULT 0");
        }

        // Migrar de is_fan_card a is_fan si la columna antigua aún existe
        $stmt_old = $pdo->query("SHOW COLUMNS FROM cards LIKE 'is_fan_card'");
        if ($stmt_old->fetch()) {
            $pdo->exec("UPDATE cards SET is_fan = is_fan_card");
            $pdo->exec("ALTER TABLE cards DROP COLUMN is_fan_card");
        }
    } catch (Exception $e) {
        // Ignorar errores en la inicialización
    }
}

function getCards($pdo)
{
    try {
        $filters = [];
        $params = [];

        $fields = ['edition', 'type', 'category', 'position', 'shirt_color', 'nationality', 'gender', 'rarity', 'is_hero', 'is_fan'];

        // Fields that support multi-select via CSV
        $csvFields = ['rarity', 'type', 'category'];

        foreach ($fields as $field) {
            if (isset($_GET[$field]) && $_GET[$field] !== 'Limpiar' && $_GET[$field] !== '') {
                if (in_array($field, $csvFields) && strpos($_GET[$field], ',') !== false) {
                    $values = explode(',', $_GET[$field]);
                    $placeholders = [];
                    foreach ($values as $i => $v) {
                        $key = "{$field}_{$i}";
                        $placeholders[] = ":$key";
                        $params[$key] = trim($v);
                    }
                    $filters[] = "$field IN (" . implode(', ', $placeholders) . ")";
                } else if ($field === 'shirt_color' || $field === 'nationality') {
                    $filters[] = "$field COLLATE utf8mb4_unicode_ci LIKE :$field";
                    $params[$field] = "%" . $_GET[$field] . "%";
                } else {
                    $filters[] = "$field = :$field";
                    $params[$field] = $_GET[$field];
                }
            }
        }

        if (isset($_GET['search']) && $_GET['search'] !== '') {
            $filters[] = "name COLLATE utf8mb4_unicode_ci LIKE :search";
            $params['search'] = "%" . $_GET['search'] . "%";
        }

        if (isset($_GET['min_cost']) && is_numeric($_GET['min_cost'])) {
            $filters[] = "cost >= :min_cost";
            $params['min_cost'] = (int) $_GET['min_cost'];
        }
        if (isset($_GET['max_cost']) && is_numeric($_GET['max_cost'])) {
            $filters[] = "cost <= :max_cost";
            $params['max_cost'] = (int) $_GET['max_cost'];
        }

        $sql = "SELECT * FROM cards";
        if (!empty($filters)) {
            $sql .= " WHERE " . implode(" AND ", $filters);
        }

        // Manejar orden y límite
        $order = $_GET['order'] ?? 'desc';
        if ($order === 'random') {
            $sql .= " ORDER BY RAND()";
        } else {
            $sql .= " ORDER BY id DESC";
        }

        if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
            $sql .= " LIMIT " . (int)$_GET['limit'];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        sendResponse($stmt->fetchAll());
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener cartas: " . $e->getMessage()], 500);
    }
}

function addCard($pdo, $data)
{
    try {
        $sql = "INSERT INTO cards (name, type, rarity, position, shirt_color, stats_attack, stats_defense, ability_text, has_errata, errata_text, image_url, nationality, gender, cost, category, ability, edition, has_x_cost, is_unlimited, orientation, is_hero, is_fan) 
                VALUES (:name, :type, :rarity, :position, :shirt_color, :stats_attack, :stats_defense, :ability_text, :has_errata, :errata_text, :image_url, :nationality, :gender, :cost, :category, :ability, :edition, :has_x_cost, :is_unlimited, :orientation, :is_hero, :is_fan)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => $data['name'] ?? '',
            ':type' => $data['type'] ?? 'Jugador',
            ':rarity' => $data['rarity'] ?? 'Amateur',
            ':position' => (!empty($data['position'])) ? $data['position'] : NULL,
            ':shirt_color' => (!empty($data['shirt_color'])) ? $data['shirt_color'] : NULL,
            ':stats_attack' => (isset($data['stats_attack']) && $data['stats_attack'] !== '') ? (int) $data['stats_attack'] : NULL,
            ':stats_defense' => (isset($data['stats_defense']) && $data['stats_defense'] !== '') ? (int) $data['stats_defense'] : NULL,
            ':ability_text' => (!empty($data['ability_text'])) ? $data['ability_text'] : NULL,
            ':has_errata' => $data['has_errata'] ?? 0,
            ':errata_text' => (!empty($data['errata_text'])) ? $data['errata_text'] : NULL,
            ':image_url' => (!empty($data['image_url'])) ? $data['image_url'] : NULL,
            ':nationality' => (!empty($data['nationality'])) ? $data['nationality'] : NULL,
            ':gender' => (!empty($data['gender'])) ? $data['gender'] : NULL,
            ':cost' => (isset($data['cost']) && $data['cost'] !== '') ? (int) $data['cost'] : 0,
            ':category' => (!empty($data['category'])) ? $data['category'] : NULL,
            ':ability' => (!empty($data['ability'])) ? $data['ability'] : NULL,
            ':edition' => (!empty($data['edition'])) ? $data['edition'] : NULL,
            ':has_x_cost' => (int) ($data['has_x_cost'] ?? 0),
            ':is_unlimited' => (int) ($data['is_unlimited'] ?? 0),
            ':is_hero' => (int) ($data['is_hero'] ?? 0),
            ':is_fan' => (int) ($data['is_fan'] ?? 0),
            ':orientation' => $data['orientation'] ?? 'portrait'
        ]);

        sendResponse(["status" => "success", "id" => $pdo->lastInsertId(), "message" => "Carta creada correctamente"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al crear carta: " . $e->getMessage()], 500);
    }
}

function updateCard($pdo, $data)
{
    try {
        $sql = "UPDATE cards SET 
                name = :name, 
                type = :type, 
                rarity = :rarity, 
                position = :position, 
                shirt_color = :shirt_color, 
                stats_attack = :stats_attack, 
                stats_defense = :stats_defense, 
                ability_text = :ability_text, 
                has_errata = :has_errata, 
                errata_text = :errata_text, 
                image_url = :image_url, 
                nationality = :nationality, 
                gender = :gender, 
                cost = :cost, 
                category = :category, 
                ability = :ability, 
                edition = :edition,
                has_x_cost = :has_x_cost,
                is_unlimited = :is_unlimited,
                orientation = :orientation,
                is_hero = :is_hero,
                is_fan = :is_fan
                WHERE id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $data['id'],
            ':name' => $data['name'] ?? '',
            ':type' => $data['type'] ?? 'Jugador',
            ':rarity' => $data['rarity'] ?? 'Amateur',
            ':position' => (!empty($data['position'])) ? $data['position'] : NULL,
            ':shirt_color' => (!empty($data['shirt_color'])) ? $data['shirt_color'] : NULL,
            ':stats_attack' => (isset($data['stats_attack']) && $data['stats_attack'] !== '') ? (int) $data['stats_attack'] : NULL,
            ':stats_defense' => (isset($data['stats_defense']) && $data['stats_defense'] !== '') ? (int) $data['stats_defense'] : NULL,
            ':ability_text' => (!empty($data['ability_text'])) ? $data['ability_text'] : NULL,
            ':has_errata' => $data['has_errata'] ?? 0,
            ':errata_text' => (!empty($data['errata_text'])) ? $data['errata_text'] : NULL,
            ':image_url' => (!empty($data['image_url'])) ? $data['image_url'] : NULL,
            ':nationality' => (!empty($data['nationality'])) ? $data['nationality'] : NULL,
            ':gender' => (!empty($data['gender'])) ? $data['gender'] : NULL,
            ':cost' => (isset($data['cost']) && $data['cost'] !== '') ? (int) $data['cost'] : 0,
            ':category' => (!empty($data['category'])) ? $data['category'] : NULL,
            ':ability' => (!empty($data['ability'])) ? $data['ability'] : NULL,
            ':edition' => (!empty($data['edition'])) ? $data['edition'] : NULL,
            ':has_x_cost' => (int) ($data['has_x_cost'] ?? 0),
            ':is_unlimited' => (int) ($data['is_unlimited'] ?? 0),
            ':is_hero' => (int) ($data['is_hero'] ?? 0),
            ':is_fan' => (int) ($data['is_fan'] ?? 0),
            ':orientation' => $data['orientation'] ?? 'portrait'
        ]);

        sendResponse(["status" => "success", "message" => "Carta actualizada correctamente"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al actualizar carta: " . $e->getMessage()], 500);
    }
}

function deleteCard($pdo, $id)
{
    try {
        $stmt = $pdo->prepare("DELETE FROM cards WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() > 0) {
            sendResponse(["status" => "success", "message" => "Carta eliminada correctamente"]);
        } else {
            sendResponse(["error" => "No se encontró la carta con ID: $id", "count" => $stmt->rowCount()], 404);
        }
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al eliminar carta: " . $e->getMessage()], 500);
    }
}
?>