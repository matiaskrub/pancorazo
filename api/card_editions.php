<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

try {
    switch ($method) {
        case 'GET':
            getCardEditions($pdo);
            break;
        case 'POST':
            if (!$data || !isset($data['action'])) {
                sendResponse(["error" => "No se recibieron datos válidos"], 400);
            }

            checkAuth(['SUPER_ADMIN', 'ADMIN']);

            switch ($data['action']) {
                case 'create':
                    createCardEdition($pdo, $data);
                    break;
                case 'update':
                    updateCardEdition($pdo, $data);
                    break;
                case 'delete':
                    deleteCardEdition($pdo, $data);
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

function getCardEditions($pdo)
{
    try {
        $stmt = $pdo->query("SELECT * FROM card_editions ORDER BY name ASC");
        $editions = $stmt->fetchAll();
        sendResponse($editions);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener las ediciones: " . $e->getMessage()], 500);
    }
}

function createCardEdition($pdo, $data)
{
    if (empty($data['name'])) {
        sendResponse(["error" => "El nombre de la edición es requerido"], 400);
    }

    try {
        $name = trim($data['name']);
        
        // Verificar duplicados
        $stmtCheck = $pdo->prepare("SELECT id FROM card_editions WHERE name = ?");
        $stmtCheck->execute([$name]);
        if ($stmtCheck->fetch()) {
            sendResponse(["error" => "Ya existe una edición con este nombre"], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO card_editions (name) VALUES (?)");
        $stmt->execute([$name]);
        
        sendResponse([
            "status" => "success",
            "id" => $pdo->lastInsertId(),
            "message" => "Edición creada correctamente"
        ]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al crear la edición: " . $e->getMessage()], 500);
    }
}

function updateCardEdition($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de edición requerido"], 400);
    }
    if (empty($data['name'])) {
        sendResponse(["error" => "El nombre de la edición es requerido"], 400);
    }

    try {
        $id = (int)$data['id'];
        $newName = trim($data['name']);

        $pdo->beginTransaction();

        // 1. Obtener el nombre anterior de la edición
        $stmtOld = $pdo->prepare("SELECT name FROM card_editions WHERE id = ?");
        $stmtOld->execute([$id]);
        $oldName = $stmtOld->fetchColumn();

        if (!$oldName) {
            $pdo->rollBack();
            sendResponse(["error" => "Edición no encontrada"], 404);
            return;
        }

        // Verificar duplicados si el nombre cambia
        if ($oldName !== $newName) {
            $stmtCheck = $pdo->prepare("SELECT id FROM card_editions WHERE name = ? AND id != ?");
            $stmtCheck->execute([$newName, $id]);
            if ($stmtCheck->fetch()) {
                $pdo->rollBack();
                sendResponse(["error" => "Ya existe otra edición con este nombre"], 400);
                return;
            }
        }

        // 2. Actualizar el nombre de la edición
        $stmtUpdate = $pdo->prepare("UPDATE card_editions SET name = ? WHERE id = ?");
        $stmtUpdate->execute([$newName, $id]);

        // 3. Actualizar en cascada en la tabla cards
        $stmtCards = $pdo->prepare("UPDATE cards SET edition = ? WHERE edition = ?");
        $stmtCards->execute([$newName, $oldName]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Edición actualizada correctamente y cartas vinculadas actualizadas"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al actualizar la edición: " . $e->getMessage()], 500);
    }
}

function deleteCardEdition($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de edición requerido"], 400);
    }

    try {
        $id = (int)$data['id'];

        $pdo->beginTransaction();

        // 1. Obtener el nombre de la edición
        $stmtName = $pdo->prepare("SELECT name FROM card_editions WHERE id = ?");
        $stmtName->execute([$id]);
        $name = $stmtName->fetchColumn();

        if (!$name) {
            $pdo->rollBack();
            sendResponse(["error" => "Edición no encontrada"], 404);
            return;
        }

        // 2. Eliminar la edición
        $stmtDelete = $pdo->prepare("DELETE FROM card_editions WHERE id = ?");
        $stmtDelete->execute([$id]);

        // 3. Desvincular de las cartas (poner edition = NULL o vacía)
        $stmtCards = $pdo->prepare("UPDATE cards SET edition = NULL WHERE edition = ?");
        $stmtCards->execute([$name]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Edición eliminada correctamente y cartas desvinculadas"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al eliminar la edición: " . $e->getMessage()], 500);
    }
}
?>
