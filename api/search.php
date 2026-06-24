<?php
require_once 'db.php';

// Desactivar reporte de errores en el output para no romper el JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendResponse(["error" => "Método no permitido"], 405);
}

$q = isset($_GET['q']) ? trim($_GET['q']) : '';

if (empty($q)) {
    sendResponse([
        "teams" => [],
        "decks" => [],
        "tournaments" => [],
        "cards" => [],
        "users" => []
    ]);
}

try {
    $searchTerm = '%' . $q . '%';

    // 1. Buscar en Equipos (Teams)
    $stmtTeams = $pdo->prepare("SELECT id, name, slug, logo_url FROM teams WHERE name LIKE ? LIMIT 10");
    $stmtTeams->execute([$searchTerm]);
    $teams = $stmtTeams->fetchAll();

    // 2. Buscar en Mazos (Decks) - Solo activos/públicos
    $stmtDecks = $pdo->prepare("SELECT id, name, likes FROM decks WHERE name LIKE ? AND is_active = 1 LIMIT 10");
    $stmtDecks->execute([$searchTerm]);
    $decks = $stmtDecks->fetchAll();

    // 3. Buscar en Torneos (Tournaments)
    $stmtTournaments = $pdo->prepare("SELECT id, name, status FROM tournaments WHERE name LIKE ? LIMIT 10");
    $stmtTournaments->execute([$searchTerm]);
    $tournaments = $stmtTournaments->fetchAll();

    // 4. Buscar en Cartas (Cards)
    $stmtCards = $pdo->prepare("SELECT id, name, type, image_url, edition FROM cards WHERE name LIKE ? LIMIT 20");
    $stmtCards->execute([$searchTerm]);
    $cards = $stmtCards->fetchAll();

    // 5. Buscar en Usuarios (Users)
    $stmtUsers = $pdo->prepare("SELECT id, username, profile_image, global_role FROM users WHERE username LIKE ? LIMIT 10");
    $stmtUsers->execute([$searchTerm]);
    $users = $stmtUsers->fetchAll();

    sendResponse([
        "teams" => $teams,
        "decks" => $decks,
        "tournaments" => $tournaments,
        "cards" => $cards,
        "users" => $users
    ]);

} catch (Exception $e) {
    if (DEBUG_MODE) {
        sendResponse(["error" => "Error de BD: " . $e->getMessage()], 500);
    } else {
        sendResponse(["error" => "Error interno al realizar la búsqueda"], 500);
    }
}
