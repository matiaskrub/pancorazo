<?php
require_once 'db.php';
require_once 'deck_utils.php';

try {
    // Verificar autenticación
    $currentUser = checkAuth(['SUPER_ADMIN', 'ADMIN']);
} catch (Exception $e) {
    sendResponse(["error" => "No autorizado"], 401);
}

try {
    $pdo->beginTransaction();

    recalculateDeckWinRates($pdo, null);

    $pdo->commit();

    sendResponse([
        "status" => "success",
        "message" => "El porcentaje de victorias de todos los mazos ha sido recalculado exitosamente."
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse([
        "error" => "Error al recalcular winrates: " . $e->getMessage()
    ], 500);
}
