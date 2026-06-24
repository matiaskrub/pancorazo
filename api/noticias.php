<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    if (isset($_GET['id'])) {
        // Obtener una noticia específica
        try {
            $stmt = $pdo->prepare("SELECT * FROM noticias WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $noticia = $stmt->fetch();
            
            if ($noticia) {
                sendResponse($noticia);
            } else {
                sendResponse(["error" => "Noticia no encontrada"], 404);
            }
        } catch (PDOException $e) {
            sendResponse(["error" => "Error al obtener la noticia: " . $e->getMessage()], 500);
        }
    } else {
        // Listar noticias
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $is_titular = isset($_GET['es_titular']) ? (int)$_GET['es_titular'] : null;
        $status = isset($_GET['status']) ? $_GET['status'] : null;
        $admin = isset($_GET['admin']) && $_GET['admin'] == 'true';

        try {
            $query = "SELECT * FROM noticias WHERE 1=1";
            $params = [];

            if (!$admin) {
                // Usuarios normales solo ven las publicadas
                $query .= " AND status = 'Publicado'";
            } else if ($status) {
                $query .= " AND status = ?";
                $params[] = $status;
            }

            if ($is_titular !== null) {
                $query .= " AND es_titular = ?";
                $params[] = $is_titular;
            }

            $l = (int)$limit;
            $o = (int)$offset;
            $query .= " ORDER BY fecha DESC LIMIT $l OFFSET $o";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $noticias = $stmt->fetchAll();
            
            sendResponse($noticias);
        } catch (PDOException $e) {
            sendResponse(["error" => "Error al obtener las noticias: " . $e->getMessage()], 500);
        }
    }
} else if ($method == 'POST') {
    $user = checkAuth(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
    
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'create';

    if ($action == 'create') {
        if (!isset($data['titular']) || !isset($data['texto'])) {
            sendResponse(["error" => "Datos incompletos"], 400);
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO noticias (titular, bajada, foto, texto, es_titular, categoria, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['titular'],
                $data['bajada'] ?? null,
                $data['foto'] ?? null,
                $data['texto'],
                $data['es_titular'] ?? 0,
                $data['categoria'] ?? 'General',
                $data['status'] ?? 'Borrador'
            ]);
            
            sendResponse(["status" => "success", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            sendResponse(["error" => "Error al crear la noticia: " . $e->getMessage()], 500);
        }
    } else if ($action == 'update') {
        if (!isset($data['id'])) {
            sendResponse(["error" => "ID no proporcionado"], 400);
        }

        try {
            $stmt = $pdo->prepare("UPDATE noticias SET titular = ?, bajada = ?, foto = ?, texto = ?, es_titular = ?, categoria = ?, status = ? WHERE id = ?");
            $stmt->execute([
                $data['titular'],
                $data['bajada'] ?? null,
                $data['foto'] ?? null,
                $data['texto'],
                $data['es_titular'] ?? 0,
                $data['categoria'] ?? 'General',
                $data['status'] ?? 'Borrador',
                $data['id']
            ]);
            
            sendResponse(["status" => "success"]);
        } catch (PDOException $e) {
            sendResponse(["error" => "Error al actualizar la noticia: " . $e->getMessage()], 500);
        }
    } else if ($action == 'delete') {
        if (!isset($data['id'])) {
            sendResponse(["error" => "ID no proporcionado"], 400);
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM noticias WHERE id = ?");
            $stmt->execute([$data['id']]);
            sendResponse(["status" => "success"]);
        } catch (PDOException $e) {
            sendResponse(["error" => "Error al eliminar la noticia: " . $e->getMessage()], 500);
        }
    }
}
?>
