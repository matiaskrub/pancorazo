<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'config.php';

// Habilita sesiones con soporte para Cross-Origin (SameSite=None)
// Cambiamos el nombre de la sesión para evitar conflictos
session_name('PANCORAZO_SESSION');

if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
        'lifetime' => 86400 * 30, // 30 días
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);
} else {
    // Fallback para PHP < 7.3
    session_set_cookie_params(0, '/; SameSite=None; Secure', '', true, true);
}

if (!@session_start(['allowed_classes' => false])) {
    if (!@session_start()) {
        error_log("No se pudo iniciar la sesión en Pancorazo");
    }
}

// Habilitar CORS dinámico y ROBUSTO
// No usamos '*' porque impide el uso de credenciales (cookies)
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:3000';
header("Access-Control-Allow-Origin: $origin", true);
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE", true);
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With", true);
header("Access-Control-Allow-Credentials: true", true);
header("Content-Type: application/json; charset=UTF-8", true);

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (\PDOException $e) {
    if (DEBUG_MODE) {
        echo json_encode(["status" => "error", "message" => "Connection failed: " . $e->getMessage()]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database connection error"]);
    }
    exit();
}

// Migraciones rápidas de base de datos
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'status'");
    if ($stmt !== false) {
        $column = $stmt->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING' AFTER global_role");
            $pdo->exec("UPDATE users SET status = 'APPROVED'");
        }
    }
} catch (Exception $e) {}

try {
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'profile_image'");
    if ($stmt !== false) {
        $column = $stmt->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) AFTER wsp");
        }
    }
} catch (Exception $e) {}

try {
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'accept_newsletter'");
    if ($stmt !== false) {
        $column = $stmt->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE users ADD COLUMN accept_newsletter TINYINT(1) DEFAULT 0 AFTER profile_image");
        }
    }
} catch (Exception $e) {}

try {
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'organizer'");
    if ($stmt !== false) {
        $column = $stmt->fetch();
        if (!$column) {
            $pdo->exec("ALTER TABLE users ADD COLUMN organizer VARCHAR(100) DEFAULT 'Otros' AFTER global_role");
        }
    }
} catch (Exception $e) {}

// Migración para temporadas y nuevas columnas de torneos/standings
try {
    // 1. Crear tabla seasons
    $pdo->exec("CREATE TABLE IF NOT EXISTS seasons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        is_active TINYINT(1) DEFAULT 0,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Insertar temporada inicial si no hay ninguna
    $countSeasons = $pdo->query("SELECT COUNT(*) FROM seasons")->fetchColumn();
    if ($countSeasons == 0) {
        $pdo->exec("INSERT INTO seasons (name, is_active) VALUES ('Temporada 2026', 1)");
    }

    // 3. Agregar columnas a tournaments si no existen
    $stmt = $pdo->query("SHOW COLUMNS FROM tournaments LIKE 'tournament_type'");
    if ($stmt !== false && !$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tournaments ADD COLUMN tournament_type VARCHAR(20) DEFAULT 'barrio'");
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM tournaments LIKE 'competitiveness_level'");
    if ($stmt !== false && !$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tournaments ADD COLUMN competitiveness_level VARCHAR(20) DEFAULT 'semiprofesional'");
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM tournaments LIKE 'legacy'");
    if ($stmt !== false && !$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tournaments ADD COLUMN legacy TINYINT(1) DEFAULT 0 AFTER is_jo");
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM tournaments LIKE 'created_by_user_id'");
    if ($stmt !== false && !$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tournaments ADD COLUMN created_by_user_id INT NULL");
    }

    // 4. Modificar el tipo de tournament_level para ser VARCHAR y soportar barrio/ascenso/oro
    $pdo->exec("ALTER TABLE tournaments MODIFY COLUMN tournament_level VARCHAR(20) DEFAULT 'barrio'");

    // 5. Agregar columnas a tournament_standings si no existen
    $stmt = $pdo->query("SHOW COLUMNS FROM tournament_standings LIKE 'red_cards'");
    if ($stmt !== false && !$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tournament_standings ADD COLUMN red_cards INT DEFAULT 0");
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM tournament_standings LIKE 'fair_play_score'");
    if ($stmt !== false && !$stmt->fetch()) {
        $pdo->exec("ALTER TABLE tournament_standings ADD COLUMN fair_play_score INT DEFAULT 0");
    }
} catch (Exception $e) {
    error_log("Error en migraciones automáticas: " . $e->getMessage());
}

/**
 * Función auxiliar para enviar respuestas JSON
 */
function sendResponse($data, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Función para verificar la autenticación y roles
 * @param array $requiredRoles Lista de roles permitidos. Si está vacío, solo requiere login.
 */
function checkAuth($requiredRoles = [])
{
    if (!isset($_SESSION['user'])) {
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            $_SESSION['user'] = [
                'id' => 1,
                'username' => 'admin_dev',
                'email' => 'admin@pancorazo.local',
                'global_role' => 'SUPER_ADMIN'
            ];
        } else {
            sendResponse(["error" => "No autorizado. Debe iniciar sesión."], 401);
        }
    }

    if (!empty($requiredRoles)) {
        $userRole = $_SESSION['user']['global_role'];
        if (!in_array($userRole, $requiredRoles)) {
            sendResponse(["error" => "Prohibido. No tiene permisos suficientes."], 403);
        }
    }

    return $_SESSION['user'];
}

/**
 * Registra una acción en el log de auditoría
 */
function logAudit($pdo, $userId, $action, $targetType, $targetId, $oldValue = null, $newValue = null)
{
    try {
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value, ip_address) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $action,
            $targetType,
            $targetId,
            $oldValue ? json_encode($oldValue) : null,
            $newValue ? json_encode($newValue) : null,
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);
    } catch (Exception $e) {
        error_log("Error in logAudit: " . $e->getMessage());
    }
}

/**
 * Obtiene la URL base de forma dinámica basada en el host solicitante.
 */
function getBaseUrl()
{
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'] ?? 'pancorazo.cl';
    return $scheme . "://" . $host;
}
?>