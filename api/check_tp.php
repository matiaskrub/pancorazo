<?php
require_once 'db.php';
try {
    $stmt = $pdo->query("DESCRIBE tournament_participants");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($cols, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo $e->getMessage();
}
