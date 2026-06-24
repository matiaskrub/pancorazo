<?php
require_once 'db.php';

try {
    echo "<h1>Migración de Base de Datos para Torneos</h1>";
    echo "<ul>";

    // Depuración de esquemas de tablas para investigar tipos incompatibles de claves foráneas
    try {
        $resTournaments = $pdo->query("DESCRIBE tournaments")->fetchAll(PDO::FETCH_ASSOC);
        $resRegions = $pdo->query("DESCRIBE regions")->fetchAll(PDO::FETCH_ASSOC);
        echo "<div style='background:#111;color:#eee;padding:10px;font-family:monospace;margin-bottom:20px;'>";
        echo "<h3>Tipos de columna en base de datos:</h3>";
        foreach ($resTournaments as $col) {
            if ($col['Field'] === 'id') {
                echo "tournaments.id type: " . $col['Type'] . "<br/>";
            }
        }
        foreach ($resRegions as $col) {
            if ($col['Field'] === 'id_region') {
                echo "regions.id_region type: " . $col['Type'] . "<br/>";
            }
        }
        echo "</div>";
    } catch (Exception $debugEx) {
        echo "<p style='color:orange;'>Error al obtener metadatos: " . $debugEx->getMessage() . "</p>";
    }

    $migrations = [
        "CREATE TABLE IF NOT EXISTS tournament_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            logo_url VARCHAR(255) NULL,
            description TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )" => "Tabla `tournament_categories`",
        
        "ALTER TABLE tournaments ADD COLUMN category_id INT NULL" => "Columna `category_id` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN region_id INT NULL" => "Columna `region_id` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN is_invitational TINYINT(1) DEFAULT 0" => "Columna `is_invitational` en `tournaments`",
        "CREATE TABLE IF NOT EXISTS tournament_regions (
            tournament_id INT NOT NULL,
            region_id INT NOT NULL,
            PRIMARY KEY (tournament_id, region_id),
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            FOREIGN KEY (region_id) REFERENCES regions(id_region) ON DELETE CASCADE
        )" => "Tabla `tournament_regions` (relación multiregional)",
        "ALTER TABLE tournaments ADD COLUMN division_level INT DEFAULT 0" => "Columna `division_level` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN has_third_place TINYINT(1) DEFAULT 0" => "Columna `has_third_place` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN highlight_settings JSON NULL" => "Columna `highlight_settings` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN match_format ENUM('single', 'home_away') DEFAULT 'single'" => "Columna `match_format` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN rules_url VARCHAR(255) NULL" => "Columna `rules_url` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN banner_url VARCHAR(255) NULL" => "Columna `banner_url` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN engine_settings JSON NULL" => "Columna `engine_settings` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN tournament_level ENUM('tienda', 'regional', 'nacional') DEFAULT 'tienda'" => "Columna `tournament_level` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN top_scorer_team_id INT NULL" => "Columna `top_scorer_team_id` en `tournaments`",
        "ALTER TABLE tournaments ADD COLUMN best_defense_team_id INT NULL" => "Columna `best_defense_team_id` en `tournaments`",
        
        "ALTER TABLE tournaments DROP FOREIGN KEY tournaments_ibfk_1" => "Eliminar restricción de clave foránea `tournaments_ibfk_1` (Ignorar si ya se eliminó)",
        "ALTER TABLE tournaments MODIFY COLUMN organizer_id VARCHAR(100) NULL" => "Modificar `organizer_id` a VARCHAR",
        "ALTER TABLE tournaments MODIFY COLUMN fair_play_team_id VARCHAR(255) NULL" => "Modificar `fair_play_team_id` a VARCHAR",
        
        "ALTER TABLE tournament_participants ADD COLUMN enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" => "Columna `enrolled_at` en `tournament_participants`",
        
        "ALTER TABLE matches ADD COLUMN round INT NULL" => "Columna `round` en `matches`",
        "ALTER TABLE matches ADD COLUMN group_name VARCHAR(10) NULL" => "Columna `group_name` en `matches`",
        "ALTER TABLE matches ADD COLUMN stage VARCHAR(50) NULL" => "Columna `stage` en `matches`",
        "ALTER TABLE matches ADD COLUMN bracket_index INT NULL" => "Columna `bracket_index` en `matches`",
        "ALTER TABLE matches MODIFY COLUMN team_home_id INT NULL" => "Modificar `team_home_id` a NULLable en `matches`",
        "ALTER TABLE matches MODIFY COLUMN team_away_id INT NULL" => "Modificar `team_away_id` a NULLable en `matches`",
        "ALTER TABLE tournament_participants ADD COLUMN deck_id INT NULL" => "Columna `deck_id` en `tournament_participants`",
        "ALTER TABLE tournament_participants ADD CONSTRAINT fk_tournament_participants_deck_id FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE SET NULL" => "Restricción FK `deck_id` en `tournament_participants`"
    ];

    foreach ($migrations as $sql => $description) {
        try {
            $pdo->exec($sql);
            echo "<li><span style='color:green;'>OK</span> - $description</li>";
        } catch (PDOException $e) {
            // Error 1060 es "Duplicate column name", lo cual significa que ya existe. Lo ignoramos.
            // Error 1091 es "Can't DROP; check that column/key exists".
            if ($e->getCode() == '42S21' || $e->errorInfo[1] == 1060 || $e->errorInfo[1] == 1091) {
                echo "<li><span style='color:gray;'>Ya aplicado</span> - $description</li>";
            } else {
                echo "<li><span style='color:red;'>Error ($description):</span> " . $e->getMessage() . "</li>";
            }
        }
    }
    
    echo "</ul>";
    echo "<h2>¡Migración completada!</h2>";

} catch (Exception $e) {
    echo "<h2 style='color:red;'>Error crítico: " . $e->getMessage() . "</h2>";
}
?>
