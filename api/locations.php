<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    try {
        if ($action === 'countries') {
            $stmt = $pdo->query("SELECT * FROM countries ORDER BY name ASC");
            $countries = $stmt->fetchAll();
            sendResponse($countries);
        } elseif ($action === 'regions') {
            $id_country = $_GET['id_country'] ?? null;
            if ($id_country) {
                $stmt = $pdo->prepare("SELECT * FROM regions WHERE id_country = ? ORDER BY name ASC");
                $stmt->execute([$id_country]);
            } else {
                $stmt = $pdo->query("SELECT * FROM regions ORDER BY name ASC");
            }
            $regions = $stmt->fetchAll();
            sendResponse($regions);
        } elseif ($action === 'cities') {
            $id_region = $_GET['id_region'] ?? null;
            if ($id_region) {
                $stmt = $pdo->prepare("SELECT * FROM cities WHERE id_region = ? ORDER BY name ASC");
                $stmt->execute([$id_region]);
            } else {
                $stmt = $pdo->query("SELECT * FROM cities ORDER BY name ASC");
            }
            $cities = $stmt->fetchAll();
            sendResponse($cities);
        } else {
            sendResponse(["message" => "Invalid action"], 400);
        }
    } catch (PDOException $e) {
        sendResponse(["error" => "Database error: " . $e->getMessage()], 500);
    }
} else {
    sendResponse(["message" => "Method not allowed"], 405);
}
?>
