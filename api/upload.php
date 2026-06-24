<?php
// Habilitar CORS dinámico (necesario cuando se usan credenciales)
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$folder = isset($_POST['folder']) ? $_POST['folder'] : 'cartas';

// Limpieza del nombre de la carpeta para asegurar consistencia y seguridad
// 1. Eliminar prefijos redundantes de 'imagenes/' enviados por error
$folder = preg_replace('/^(\/)?imagenes\//i', '', $folder);
// 2. Prevenir path traversal eliminando puntos y barras invertidas
$folder = str_replace(['..', '\\'], '', $folder);
// 3. Normalizar espacios por guiones bajos
$folder = str_replace(' ', '_', $folder);

$target_dir = "../imagenes/" . $folder . "/";

if (!file_exists($target_dir)) {
    mkdir($target_dir, 0755, true);
}

// Asegurar que la carpeta tenga permisos correctos y crear .htaccess para permitir acceso público
chmod($target_dir, 0755);
$htaccess_file = $target_dir . ".htaccess";
if (!file_exists($htaccess_file)) {
    $htaccess_content = "<IfModule mod_authz_core.c>\n    Require all granted\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order allow,deny\n    Allow from all\n</IfModule>";
    file_put_contents($htaccess_file, $htaccess_content);
    chmod($htaccess_file, 0644);
}

if (!isset($_FILES["image"])) {
    echo json_encode(["status" => "error", "message" => "No image uploaded"]);
    exit;
}

if ($_FILES["image"]["error"] !== UPLOAD_ERR_OK) {
    echo json_encode(["status" => "error", "message" => "PHP Upload Error Code: " . $_FILES["image"]["error"]]);
    exit;
}

$image = $_FILES["image"];
$file_extension = strtolower(pathinfo($image["name"], PATHINFO_EXTENSION));
$new_filename = uniqid() . "." . $file_extension;
$target_file = $target_dir . $new_filename;

// Validaciones básicas
$allowed_types = ["jpg", "jpeg", "png", "gif", "webp", "pdf"];
if (!in_array($file_extension, $allowed_types)) {
    echo json_encode(["status" => "error", "message" => "Invalid file type: " . $file_extension]);
    exit;
}

if (move_uploaded_file($image["tmp_name"], $target_file)) {
    // Asegurar permisos de lectura web para el archivo
    chmod($target_file, 0644);
    
    // Retornamos la URL relativa para guardar en la BD
    $relative_url = "/imagenes/" . $folder . "/" . $new_filename;
    echo json_encode(["status" => "success", "url" => $relative_url]);
} else {
    $error_get_last = error_get_last();
    $detail = $error_get_last ? $error_get_last['message'] : 'Unknown';
    echo json_encode(["status" => "error", "message" => "Failed to move uploaded file. Detail: " . $detail]);
}
?>