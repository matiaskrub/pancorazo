<?php
require_once 'db.php';

// Asegurar que la tabla de restablecimiento de contraseñas exista
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (token),
        INDEX (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
    // Si falla la migración, la reportamos en logs o ignoramos si es por falta de permisos privilegios
    error_log("Error al crear tabla password_resets: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];

// Para soportar GET o POST según sea necesario
$data = [];
if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
} else if ($method === 'GET') {
    $data = $_GET;
}

$action = $data['action'] ?? '';

switch ($action) {
    case 'request_reset':
        requestReset($pdo, $data);
        break;
    case 'verify_token':
        verifyToken($pdo, $data);
        break;
    case 'reset_password':
        resetPassword($pdo, $data);
        break;
    case 'redirect':
        redirectReset($data);
        break;
    default:
        sendResponse(["error" => "Acción no soportada o no especificada"], 400);
        break;
}

/**
 * Solicita la recuperación de contraseña generando un token y enviando un correo
 */
function requestReset($pdo, $data)
{
    $email = trim($data['email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(["error" => "Por favor, ingresa un correo electrónico válido."], 400);
    }

    try {
        // Verificar si el usuario existe
        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Por seguridad, no revelar si el correo existe o no, pero responderemos con éxito indicando que
        // si la cuenta existe se le envió el correo.
        if (!$user) {
            sendResponse([
                "status" => "success", 
                "message" => "Si el correo electrónico está registrado, recibirás un enlace de recuperación pronto."
            ]);
        }

        // Generar un token criptográficamente seguro
        $token = bin2hex(random_bytes(32));
        
        // Expiración de 1 hora
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Eliminar tokens previos activos para este email para evitar spam
        $stmt = $pdo->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->execute([$email]);

        // Insertar el nuevo token
        $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $token, $expiresAt]);

        // Enviar el correo electrónico Premium
        $sent = sendPremiumEmail($email, $user['username'], $token);

        if ($sent) {
            sendResponse([
                "status" => "success", 
                "message" => "Si el correo electrónico está registrado, recibirás un enlace de recuperación pronto."
            ]);
        } else {
            sendResponse(["error" => "Error al enviar el correo electrónico de recuperación. Inténtalo de nuevo más tarde."], 500);
        }

    } catch (PDOException $e) {
        sendResponse(["error" => "Error interno del servidor: " . $e->getMessage()], 500);
    }
}

/**
 * Verifica si un token es válido y no ha expirado
 */
function verifyToken($pdo, $data)
{
    $token = trim($data['token'] ?? '');

    if (empty($token)) {
        sendResponse(["error" => "Token no proporcionado."], 400);
    }

    try {
        $stmt = $pdo->prepare("SELECT email, expires_at FROM password_resets WHERE token = ?");
        $stmt->execute([$token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            sendResponse(["error" => "El enlace de recuperación es inválido o ya ha sido utilizado."], 400);
        }

        $now = date('Y-m-d H:i:s');
        if ($reset['expires_at'] < $now) {
            // Eliminar token expirado
            $stmt = $pdo->prepare("DELETE FROM password_resets WHERE token = ?");
            $stmt->execute([$token]);
            sendResponse(["error" => "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo."], 400);
        }

        sendResponse([
            "status" => "success",
            "message" => "Token válido.",
            "email" => $reset['email']
        ]);

    } catch (PDOException $e) {
        sendResponse(["error" => "Error al verificar token: " . $e->getMessage()], 500);
    }
}

/**
 * Restablece la contraseña del usuario
 */
function resetPassword($pdo, $data)
{
    $token = trim($data['token'] ?? '');
    $password = trim($data['password'] ?? '');

    if (empty($token) || empty($password)) {
        sendResponse(["error" => "Token y contraseña son requeridos."], 400);
    }

    if (strlen($password) < 6) {
        sendResponse(["error" => "La contraseña debe tener al menos 6 caracteres."], 400);
    }

    try {
        // Verificar token
        $stmt = $pdo->prepare("SELECT email, expires_at FROM password_resets WHERE token = ?");
        $stmt->execute([$token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            sendResponse(["error" => "El enlace de recuperación es inválido o ya ha sido utilizado."], 400);
        }

        $now = date('Y-m-d H:i:s');
        if ($reset['expires_at'] < $now) {
            $stmt = $pdo->prepare("DELETE FROM password_resets WHERE token = ?");
            $stmt->execute([$token]);
            sendResponse(["error" => "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo."], 400);
        }

        $email = $reset['email'];
        $newHash = password_hash($password, PASSWORD_BCRYPT);

        // Iniciar transacción para asegurar atomicidad
        $pdo->beginTransaction();

        // Actualizar contraseña de usuario
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
        $stmt->execute([$newHash, $email]);

        // Eliminar tokens de restablecimiento de este correo
        $stmt = $pdo->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->execute([$email]);

        $pdo->commit();

        sendResponse([
            "status" => "success",
            "message" => "¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión con tu nueva contraseña."
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al restablecer la contraseña: " . $e->getMessage()], 500);
    }
}

/**
 * Redirecciona al usuario a la página de restauración en el frontend (SPA)
 */
function redirectReset($data)
{
    $token = trim($data['token'] ?? '');
    if (empty($token)) {
        header("Location: " . getBaseUrl() . "/#/profile");
        exit;
    }
    header("Location: " . getBaseUrl() . "/#/recuperar/" . urlencode($token));
    exit;
}

/**
 * Envía un correo electrónico en formato HTML Premium alineado a la estética de Pancorazo
 */
function sendPremiumEmail($to, $username, $token)
{
    $resetLink = getBaseUrl() . "/api/reset_password.php?action=redirect&token=" . urlencode($token);
    
    $subject = "Restablece tu contraseña - Pancorazo";
    
    // Diseño del email HTML alineado al look-and-feel de Pancorazo
    $message = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Restablecer Contraseña - Pancorazo</title>
        <style>
            body {
                background-color: #0a0f1a;
                color: #ffffff;
                font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #101622;
                border: 1px solid rgba(255, 217, 0, 0.2);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            .header {
                background-color: #0a0f1a;
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            .logo {
                font-size: 28px;
                font-weight: 900;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: -1px;
            }
            .logo span {
                color: #ffd900;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            h1 {
                font-size: 22px;
                font-weight: 800;
                text-transform: uppercase;
                margin-top: 0;
                color: #ffffff;
                letter-spacing: -0.5px;
            }
            p {
                font-size: 14px;
                line-height: 1.6;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 30px;
            }
            .btn {
                display: inline-block;
                padding: 14px 30px;
                background-color: #ffd900;
                color: #101622 !important;
                text-decoration: none;
                font-weight: 900;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-radius: 4px;
                box-shadow: 0 4px 15px rgba(255, 217, 0, 0.2);
                transition: all 0.3s ease;
            }
            .footer {
                background-color: #0d121f;
                padding: 20px;
                text-align: center;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.3);
                border-top: 1px solid rgba(255, 255, 255, 0.05);
            }
            .note {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                margin-top: 30px;
                border-top: 1px dashed rgba(255, 255, 255, 0.1);
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div style="padding: 20px;">
            <div class="container">
                <div class="header">
                    <div class="logo">PANCO<span>RAZO</span></div>
                </div>
                <div class="content">
                    <h1>Hola, ' . htmlspecialchars($username) . '</h1>
                    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Pancorazo. Si realizaste esta solicitud, puedes restablecer tu contraseña haciendo clic en el siguiente botón:</p>
                    
                    <a href="' . $resetLink . '" class="btn" target="_blank">Restablecer Contraseña</a>
                    
                    <p class="note">Este enlace tiene una validez de 1 hora. Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña seguirá siendo la misma.</p>
                </div>
                <div class="footer">
                    &copy; ' . date("Y") . ' Pancorazo. Todos los derechos reservados.
                </div>
            </div>
        </div>
    </body>
    </html>
    ';

    // Cabeceras correctas para enviar HTML
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: Pancorazo <no-reply@pancorazo.cl>" . "\r\n";
    $headers .= "Reply-To: soporte@pancorazo.cl" . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    return mail($to, $subject, $message, $headers);
}
?>
