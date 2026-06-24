<?php
require_once 'db.php';
require_once 'OfficialRankingHelper.php';

// Verificar autenticación
try {
    $currentUser = checkAuth(['SUPER_ADMIN', 'ADMIN']);
} catch (Exception $e) {
    sendResponse(["error" => "No autorizado"], 401);
}

$jsonInput = file_get_contents("php://input");
$data = json_decode($jsonInput, true);

$tournamentId = 0;
if (isset($_GET['tournament_id'])) {
    $tournamentId = (int)$_GET['tournament_id'];
} elseif (isset($_GET['tournamentId'])) {
    $tournamentId = (int)$_GET['tournamentId'];
} elseif (isset($_GET['id'])) {
    $tournamentId = (int)$_GET['id'];
} elseif (isset($data['tournament_id'])) {
    $tournamentId = (int)$data['tournament_id'];
} elseif (isset($data['tournamentId'])) {
    $tournamentId = (int)$data['tournamentId'];
} elseif (isset($data['id'])) {
    $tournamentId = (int)$data['id'];
}

if ($tournamentId <= 0) {
    sendResponse(["error" => "ID de torneo inválido o no especificado"], 400);
}

try {
    $pdo->beginTransaction();

    // 1. Obtener información del torneo
    $stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
    $stmt->execute([$tournamentId]);
    $tournament = $stmt->fetch();

    if (!$tournament) {
        throw new Exception("Torneo no encontrado");
    }

    if ($tournament['status'] !== 'closed') {
        throw new Exception("El torneo debe estar cerrado para recalcular el ranking");
    }

    if (!$tournament['is_jo']) {
        throw new Exception("El torneo no está marcado como JO (Juegos Oficiales)");
    }

    // 2. Obtener historial anterior de este torneo
    $stmtHistory = $pdo->prepare("SELECT team_id, points_earned FROM official_ranking_history WHERE tournament_id = ?");
    $stmtHistory->execute([$tournamentId]);
    $historyRecords = $stmtHistory->fetchAll();

    // 3. Revertir puntos y legados anteriores
    $stmtUpdateTeam = $pdo->prepare("UPDATE teams SET 
        official_ranking_points = GREATEST(0, official_ranking_points - :points),
        official_legacy_count = GREATEST(0, official_legacy_count - 1)
        WHERE id = :team_id");

    foreach ($historyRecords as $record) {
        $stmtUpdateTeam->execute([
            ':points' => $record['points_earned'],
            ':team_id' => $record['team_id']
        ]);
    }

    // 4. Borrar historial anterior del torneo
    $stmtDeleteHistory = $pdo->prepare("DELETE FROM official_ranking_history WHERE tournament_id = ?");
    $stmtDeleteHistory->execute([$tournamentId]);

    // 5. Reconstruir parámetros para processOfficialRanking
    // Obtener podio
    $stmtPodiums = $pdo->prepare("SELECT position, team_id FROM tournament_podiums WHERE tournament_id = ?");
    $stmtPodiums->execute([$tournamentId]);
    $podiumRows = $stmtPodiums->fetchAll();
    $podium = [];
    foreach ($podiumRows as $p) {
        $podium[$p['position']] = $p['team_id'];
    }

    // Reconstruir estadísticas
    $stats = [
        'top_scorer_team_id' => $tournament['top_scorer_team_id'],
        'best_defense_team_id' => $tournament['best_defense_team_id'],
        'fair_play_team_id' => $tournament['fair_play_team_id']
    ];

    $tournamentLevel = $tournament['tournament_level'] ?? 'tienda';

    // 6. Volver a procesar el ranking oficial
    processOfficialRanking($pdo, $tournamentId, $stats, $tournamentLevel, $podium);

    // Obtener los nuevos registros calculados para mostrar en la respuesta
    $stmtNewHistory = $pdo->prepare("SELECT team_id, base_points, points_earned, multipliers_summary FROM official_ranking_history WHERE tournament_id = ?");
    $stmtNewHistory->execute([$tournamentId]);
    $newHistory = $stmtNewHistory->fetchAll();

    // Obtener información de depuración de partidos del torneo
    $stmtDebugMatches = $pdo->prepare("SELECT id, status, is_wo, team_home_id, team_away_id, score_home, score_away FROM matches WHERE tournament_id = ?");
    $stmtDebugMatches->execute([$tournamentId]);
    $debugMatches = $stmtDebugMatches->fetchAll();

    if ($pdo->inTransaction()) {
        $pdo->commit();
    }

    sendResponse([
        "status" => "success",
        "message" => "Ranking recalculado correctamente para el torneo $tournamentId",
        "reverted_teams_count" => count($historyRecords),
        "debug_matches" => $debugMatches,
        "new_calculations" => $newHistory
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendResponse([
        "error" => "Error al recalcular: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], 500);
}
?>
