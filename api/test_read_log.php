<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$logPath = dirname(__DIR__) . '/close_error.txt';
if (file_exists($logPath)) {
    header('Content-Type: text/plain; charset=UTF-8');
    echo file_get_contents($logPath);
} else {
    echo "El archivo close_error.txt no existe en: " . $logPath;
}
