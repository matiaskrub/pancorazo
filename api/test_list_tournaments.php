<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db.php';

try {
    // db.php define e inicializa la variable global $pdo
    if (!isset($pdo)) {
        throw new Exception("La variable global \$pdo no está definida.");
    }
    
    $stmt = $pdo->query("SELECT id, name, status, is_jo, tournament_type, start_date, end_date FROM tournaments ORDER BY id DESC LIMIT 5");
    $tournaments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Como db.php envía cabeceras JSON, solo imprimimos el json
    echo json_encode($tournaments, JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
