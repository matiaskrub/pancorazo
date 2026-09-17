<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

try {
    switch ($method) {
        case 'GET':
            getCardAbilities($pdo);
            break;
        case 'POST':
            if (!$data || !isset($data['action'])) {
                sendResponse(["error" => "No se recibieron datos válidos"], 400);
            }

            checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

            switch ($data['action']) {
                case 'create':
                    createCardAbility($pdo, $data);
                    break;
                case 'update':
                    updateCardAbility($pdo, $data);
                    break;
                case 'delete':
                    deleteCardAbility($pdo, $data);
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

function getCardAbilities($pdo)
{
    try {
        $stmt = $pdo->query("SELECT * FROM card_abilities ORDER BY name ASC");
        $abilities = $stmt->fetchAll();
        sendResponse($abilities);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener destrezas: " . $e->getMessage()], 500);
    }
}

function createCardAbility($pdo, $data)
{
    if (empty($data['name'])) {
        sendResponse(["error" => "El nombre de la destreza es requerido"], 400);
    }

    try {
        $name = trim($data['name']);
        $allowedTypes = isset($data['allowed_types']) ? trim($data['allowed_types']) : 'ALL';
        if (empty($allowedTypes)) {
            $allowedTypes = 'ALL';
        }

        // Verificar duplicados
        $stmtCheck = $pdo->prepare("SELECT id FROM card_abilities WHERE name = ?");
        $stmtCheck->execute([$name]);
        if ($stmtCheck->fetch()) {
            sendResponse(["error" => "Ya existe una destreza con este nombre"], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO card_abilities (name, allowed_types) VALUES (?, ?)");
        $stmt->execute([$name, $allowedTypes]);

        sendResponse([
            "status" => "success",
            "id" => $pdo->lastInsertId(),
            "message" => "Destreza creada correctamente"
        ]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al crear la destreza: " . $e->getMessage()], 500);
    }
}

function updateCardAbility($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de destreza requerido"], 400);
    }
    if (empty($data['name'])) {
        sendResponse(["error" => "El nombre de la destreza es requerido"], 400);
    }

    try {
        $id = (int)$data['id'];
        $newName = trim($data['name']);
        $allowedTypes = isset($data['allowed_types']) ? trim($data['allowed_types']) : 'ALL';
        if (empty($allowedTypes)) {
            $allowedTypes = 'ALL';
        }

        $pdo->beginTransaction();

        $stmtOld = $pdo->prepare("SELECT name FROM card_abilities WHERE id = ?");
        $stmtOld->execute([$id]);
        $oldName = $stmtOld->fetchColumn();

        if (!$oldName) {
            $pdo->rollBack();
            sendResponse(["error" => "Destreza no encontrada"], 404);
            return;
        }

        if ($oldName !== $newName) {
            $stmtCheck = $pdo->prepare("SELECT id FROM card_abilities WHERE name = ? AND id != ?");
            $stmtCheck->execute([$newName, $id]);
            if ($stmtCheck->fetch()) {
                $pdo->rollBack();
                sendResponse(["error" => "Ya existe otra destreza con este nombre"], 400);
                return;
            }
        }

        $stmtUpdate = $pdo->prepare("UPDATE card_abilities SET name = ?, allowed_types = ? WHERE id = ?");
        $stmtUpdate->execute([$newName, $allowedTypes, $id]);

        // Actualizar cartas vinculadas si cambió el nombre
        if ($oldName !== $newName) {
            $stmtCards = $pdo->prepare("UPDATE cards SET ability = ? WHERE ability = ?");
            $stmtCards->execute([$newName, $oldName]);
        }

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Destreza actualizada correctamente"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al actualizar la destreza: " . $e->getMessage()], 500);
    }
}

function deleteCardAbility($pdo, $data)
{
    if (empty($data['id'])) {
        sendResponse(["error" => "ID de destreza requerido"], 400);
    }

    try {
        $id = (int)$data['id'];

        $pdo->beginTransaction();

        $stmtName = $pdo->prepare("SELECT name FROM card_abilities WHERE id = ?");
        $stmtName->execute([$id]);
        $name = $stmtName->fetchColumn();

        if (!$name) {
            $pdo->rollBack();
            sendResponse(["error" => "Destreza no encontrada"], 404);
            return;
        }

        $stmtDelete = $pdo->prepare("DELETE FROM card_abilities WHERE id = ?");
        $stmtDelete->execute([$id]);

        $stmtCards = $pdo->prepare("UPDATE cards SET ability = NULL WHERE ability = ?");
        $stmtCards->execute([$name]);

        $pdo->commit();
        sendResponse(["status" => "success", "message" => "Destreza eliminada correctamente"]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al eliminar la destreza: " . $e->getMessage()], 500);
    }
}
