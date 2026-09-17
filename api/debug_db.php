<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'db.php';

echo "--- Depurando base de datos ---\n";

try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'tournament_participants'");
    $tableExists = $stmt->fetch();
    echo "Tabla 'tournament_participants' existe: " . ($tableExists ? "SÍ" : "NO") . "\n";

    if ($tableExists) {
        $stmtCol = $pdo->query("SHOW COLUMNS FROM tournament_participants LIKE 'is_tournament_wo'");
        $column = $stmtCol->fetch();
        echo "Columna 'is_tournament_wo' existe: " . ($column ? "SÍ" : "NO") . "\n";
        
        if ($column) {
            echo "Detalle de la columna: \n";
            print_r($column);
        } else {
            echo "Intentando ejecutar ALTER TABLE...\n";
            $result = $pdo->exec("ALTER TABLE tournament_participants ADD COLUMN is_tournament_wo TINYINT(1) DEFAULT 0");
            echo "Resultado del exec: " . var_export($result, true) . "\n";
            
            // Verificar de nuevo
            $stmtCol = $pdo->query("SHOW COLUMNS FROM tournament_participants LIKE 'is_tournament_wo'");
            $columnCheck = $stmtCol->fetch();
            echo "Columna ahora existe: " . ($columnCheck ? "SÍ" : "NO") . "\n";
        }
    }
} catch (Exception $e) {
    echo "EXCEPCIÓN CAPTURADA: " . $e->getMessage() . "\n";
    echo "Traza:\n" . $e->getTraceAsString() . "\n";
}
?>
