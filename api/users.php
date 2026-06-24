<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['action']) && $_GET['action'] === 'get_pending') {
            getPendingUsers($pdo);
        } else {
            getUsers($pdo);
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if ($data['action'] === 'register') {
            registerUser($pdo, $data);
        } elseif ($data['action'] === 'update') {
            updateUser($pdo, $data);
        } elseif ($data['action'] === 'login') {
            loginUser($pdo, $data);
        } elseif ($data['action'] === 'logout') {
            session_destroy();
            sendResponse(["message" => "Sesión cerrada"]);
        } elseif ($data['action'] === 'resolve_registration') {
            resolveRegistration($pdo, $data);
        } else {
            sendResponse(["message" => "Action not supported"], 400);
        }
        break;
    default:
        sendResponse(["message" => "Method not allowed"], 405);
        break;
}

function getUsers($pdo)
{
    try {
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT id, username, email, global_role, status, first_name, last_name, country, custom_country, region, commune, wsp, profile_image, social_google_id, social_discord_id, created_at FROM users WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $user = $stmt->fetch();
            sendResponse($user ?: null);
            return;
        }
        $stmt = $pdo->query("SELECT id, username, email, global_role, status, profile_image, created_at FROM users ORDER BY username ASC");
        $users = $stmt->fetchAll();
        sendResponse($users);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error fetching users: " . $e->getMessage()], 500);
    }
}

function registerUser($pdo, $data)
{
    try {
        $username = $data['username'];
        $email = $data['email'];
        $password = password_hash($data['password'], PASSWORD_BCRYPT);
        $role = $data['global_role'] ?? 'PLAYER';
        $status = 'APPROVED';

        $firstName = $data['first_name'] ?? null;
        $lastName = $data['last_name'] ?? null;
        $country = $data['country'] ?? null;
        $customCountry = $data['custom_country'] ?? null;
        $region = $data['region'] ?? null;
        $commune = $data['commune'] ?? null;
        $wsp = $data['wsp'] ?? null;
        $acceptNewsletter = isset($data['accept_newsletter']) ? (int)$data['accept_newsletter'] : 0;

        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, global_role, status, first_name, last_name, country, custom_country, region, commune, wsp, accept_newsletter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $email, $password, $role, $status, $firstName, $lastName, $country, $customCountry, $region, $commune, $wsp, $acceptNewsletter]);

        $userId = $pdo->lastInsertId();

        // Iniciar sesión del usuario registrado de forma automática
        $stmt_user = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt_user->execute([$userId]);
        $registeredUser = $stmt_user->fetch();
        if ($registeredUser) {
            unset($registeredUser['password_hash']);
            $_SESSION['user'] = $registeredUser;
        }

        // Enviar correo de bienvenida
        sendWelcomeEmail($email, $username);

        sendResponse(["message" => "User created successfully", "userId" => $userId], 201);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error creating user: " . $e->getMessage()], 500);
    }
}

function loginUser($pdo, $data)
{
    try {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Depuración temporal
        $debugInfo = [
            "timestamp" => date("Y-m-d H:i:s"),
            "email_recibido" => $email,
            "usuario_encontrado" => $user ? "SI" : "NO",
        ];

        if ($user) {
            $debugInfo["email_db"] = $user['email'];
            $debugInfo["hash_db"] = $user['password_hash'];
            $debugInfo["longitud_hash"] = strlen($user['password_hash']);
            $debugInfo["longitud_password_recibida"] = strlen($password);
            
            $verifyResult = password_verify($password, $user['password_hash']);
            $debugInfo["password_verify_resultado"] = $verifyResult ? "CORRECTO" : "INCORRECTO";
        }

        // Guardar logs en debug_login.txt en la carpeta api
        file_put_contents(__DIR__ . '/debug_login.txt', json_encode($debugInfo, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

        if ($user && password_verify($password, $user['password_hash'])) {
            unset($user['password_hash']);
            $_SESSION['user'] = $user;
            sendResponse(["message" => "Login successful", "user" => $user]);
        } else {
            sendResponse(["error" => "Credenciales inválidas"], 401);
        }
    } catch (PDOException $e) {
        sendResponse(["error" => "Error login: " . $e->getMessage()], 500);
    }
}

function updateUser($pdo, $data)
{
    try {
        $id = $data['id'];
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;

        $fields = [];
        $params = [];

        if ($username) {
            $fields[] = "username = ?";
            $params[] = $username;
        }

        if ($password) {
            $fields[] = "password_hash = ?";
            $params[] = password_hash($password, PASSWORD_BCRYPT);
        }

        $optionalFields = ['email', 'status', 'first_name', 'last_name', 'country', 'custom_country', 'region', 'commune', 'wsp', 'profile_image', 'social_google_id', 'social_discord_id', 'accept_newsletter', 'organizer', 'global_role'];
        foreach ($optionalFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            sendResponse(["message" => "No fields to update"], 400);
            return;
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        sendResponse(["message" => "User updated successfully"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error updating user: " . $e->getMessage()], 500);
    }
}

function getPendingUsers($pdo)
{
    try {
        checkAuth(['SUPER_ADMIN', 'ADMIN']);
        $query = "SELECT 
                    u.id, u.username, u.email, u.global_role, u.status, u.first_name, u.last_name, 
                    u.country, u.custom_country, u.region, u.commune, u.wsp, u.created_at,
                    t.name as created_team_name, t.id as created_team_id,
                    NULL as claimed_team_name, NULL as claimed_team_id
                  FROM users u
                  JOIN teams t ON t.owner_user_id = u.id
                  WHERE t.status = 'PENDING'
                  ORDER BY t.created_at ASC";
        $stmt = $pdo->query($query);
        $users = $stmt->fetchAll();
        sendResponse($users);
    } catch (Exception $e) {
        sendResponse(["error" => "Error al obtener usuarios pendientes: " . $e->getMessage()], 500);
    }
}

function resolveRegistration($pdo, $data)
{
    try {
        checkAuth(['SUPER_ADMIN', 'ADMIN']);
        $userId = $data['userId'] ?? null;
        $action = $data['resolveAction'] ?? null; // 'approve' o 'reject'

        if (!$userId || !$action) {
            sendResponse(["error" => "Parámetros insuficientes"], 400);
            return;
        }

        $emailStatus = ($action === 'approve') ? 'APPROVED' : 'REJECTED';

        // Obtener email y username para el correo de resolución
        $stmt_user_info = $pdo->prepare("SELECT username, email FROM users WHERE id = ?");
        $stmt_user_info->execute([$userId]);
        $userInfo = $stmt_user_info->fetch();

        $pdo->beginTransaction();

        // El usuario permanece APPROVED, solo resolvemos el estado de su equipo creado o reclamo
        if ($action === 'approve') {
            // Activar equipos creados por este usuario que estén PENDING
            $stmt_team = $pdo->prepare("UPDATE teams SET status = 'ACTIVE' WHERE owner_user_id = ? AND status = 'PENDING'");
            $stmt_team->execute([$userId]);
            
            // También aprobar solicitudes de reclamo de equipo
            $stmt_claim = $pdo->prepare("SELECT id, team_id FROM team_claims WHERE user_id = ? AND status = 'PENDING' LIMIT 1");
            $stmt_claim->execute([$userId]);
            $claim = $stmt_claim->fetch();
            if ($claim) {
                $stmt_resolve = $pdo->prepare("UPDATE team_claims SET status = 'APPROVED' WHERE id = ?");
                $stmt_resolve->execute([$claim['id']]);
                
                $stmt_update_team = $pdo->prepare("UPDATE teams SET owner_user_id = ? WHERE id = ?");
                $stmt_update_team->execute([$userId, $claim['team_id']]);
            }
        } elseif ($action === 'reject') {
            // Desactivar equipos creados por este usuario que estén PENDING
            $stmt_team = $pdo->prepare("UPDATE teams SET status = 'INACTIVE' WHERE owner_user_id = ? AND status = 'PENDING'");
            $stmt_team->execute([$userId]);
            
            // Rechazar reclamos de equipo
            $stmt_claim = $pdo->prepare("UPDATE team_claims SET status = 'REJECTED' WHERE user_id = ? AND status = 'PENDING'");
            $stmt_claim->execute([$userId]);
        }

        $pdo->commit();

        if ($userInfo) {
            sendResolutionEmail($userInfo['email'], $userInfo['username'], $emailStatus);
        }

        sendResponse(["message" => "Registro resuelto con éxito"]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al resolver registro: " . $e->getMessage()], 500);
    }
}

function sendWelcomeEmail($to, $username)
{
    $subject = "¡Bienvenido a Pancorazo! - Registro Recibido";
    
    // Diseño del email HTML alineado al look-and-feel de Pancorazo
    $message = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>¡Bienvenido a Pancorazo!</title>
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
            .status-box {
                background-color: rgba(255, 217, 0, 0.05);
                border: 1px solid rgba(255, 217, 0, 0.2);
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
                text-align: left;
            }
            .status-title {
                font-size: 12px;
                font-weight: 900;
                color: #ffd900;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }
            .status-text {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.4;
            }
            .footer {
                background-color: #0d121f;
                padding: 20px;
                text-align: center;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.3);
                border-top: 1px solid rgba(255, 255, 255, 0.05);
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
                    <h1>¡Hola, ' . htmlspecialchars($username) . '!</h1>
                    <p>Queremos darte la bienvenida oficial al ecosistema de Pancorazo. Tu registro ha sido procesado de forma exitosa.</p>
                    
                    <div class="status-box">
                        <div class="status-title">Estado de tu cuenta: Pendiente de Aprobación</div>
                        <div class="status-text">
                            Dado que nos encontramos en fase de lanzamiento para el torneo oficial con acceso anticipado, un administrador revisará tu registro y el equipo asociado. Una vez que seas aprobado, recibirás acceso completo e inmediato a todo el sitio web.
                        </div>
                    </div>
                    
                    <p>Mientras tanto, puedes ingresar al sitio web con tus credenciales y revisar el estado de tu aprobación directamente en pantalla.</p>
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
    
    return @mail($to, $subject, $message, $headers);
}

function sendResolutionEmail($to, $username, $status)
{
    $isApproved = ($status === 'APPROVED');
    $subject = $isApproved ? "¡Tu cuenta ha sido aprobada! - Pancorazo" : "Estado de tu cuenta de Pancorazo";
    
    // Diseño del email HTML alineado al look-and-feel de Pancorazo
    $message = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>' . ($isApproved ? 'Cuenta Aprobada - Pancorazo' : 'Registro Rechazado - Pancorazo') . '</title>
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
                border: 1px solid ' . ($isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') . ';
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
                color: ' . ($isApproved ? '#10b981' : '#ef4444') . ';
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
                background-color: ' . ($isApproved ? '#10b981' : '#ef4444') . ';
                color: #ffffff !important;
                text-decoration: none;
                font-weight: 900;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-radius: 4px;
                box-shadow: 0 4px 15px ' . ($isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') . ';
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
        </style>
    </head>
    <body>
        <div style="padding: 20px;">
            <div class="container">
                <div class="header">
                    <div class="logo">PANCO<span>RAZO</span></div>
                </div>
                <div class="content">
                    <h1>Hola, ' . htmlspecialchars($username) . '</h1>';
                    
                    if ($isApproved) {
                        $message .= '
                        <p>¡Excelentes noticias! Tu solicitud de acceso anticipado ha sido <strong>APROBADA</strong> por nuestro equipo de administración.</p>
                        <p>Tu cuenta y tu equipo asociado ya se encuentran activos. Ahora tienes acceso completo a todas las secciones y características de la plataforma de Pancorazo para prepararte para el torneo.</p>
                        <a href="' . getBaseUrl() . '" class="btn" target="_blank">Entrar a Pancorazo</a>';
                    } else {
                        $message .= '
                        <p>Lamentamos informarte que tu solicitud de registro de acceso anticipado ha sido <strong>RECHAZADA</strong> por nuestro equipo de administración en esta ocasión.</p>
                        <p>Si crees que esto se debe a un error o necesitas más detalles sobre tu solicitud, puedes contactar al soporte oficial del torneo.</p>';
                    }
                    
    $message .= '
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
    
    return @mail($to, $subject, $message, $headers);
}
?>