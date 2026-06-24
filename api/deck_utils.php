<?php
// Utilidades para Mazos (Cálculo de winrate y bloqueos)

if (!function_exists('recalculateDeckWinRates')) {
    function recalculateDeckWinRates($pdo, $deckIds = null) {
        if ($deckIds === null) {
            // Obtener todos los IDs de mazos
            $stmt = $pdo->query("SELECT id FROM decks");
            $deckIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        } elseif (!is_array($deckIds)) {
            $deckIds = [$deckIds];
        }

        if (empty($deckIds)) {
            return;
        }

        // Consulta para obtener estadísticas excluyendo walkovers (m.is_wo = 1 o status = 'Walkover')
        $stmtStats = $pdo->prepare("
            SELECT 
                COUNT(m.id) as total_played,
                SUM(
                    CASE 
                        -- Ganó local
                        WHEN m.team_home_id = tp.team_id AND (m.score_home > m.score_away OR (m.score_home = m.score_away AND m.penalties_home > m.penalties_away)) THEN 1
                        -- Ganó visitante
                        WHEN m.team_away_id = tp.team_id AND (m.score_away > m.score_home OR (m.score_away = m.score_home AND m.penalties_away > m.penalties_home)) THEN 1
                        ELSE 0
                    END
                ) as total_wins
            FROM matches m
            JOIN tournament_participants tp ON m.tournament_id = tp.tournament_id AND (m.team_home_id = tp.team_id OR m.team_away_id = tp.team_id)
            WHERE tp.deck_id = ?
              AND LOWER(m.status) IN ('played', 'completed')
              AND (m.is_wo IS NULL OR m.is_wo = 0)
              AND m.deleted_at IS NULL
              AND tp.deleted_at IS NULL
        ");

        $stmtUpdate = $pdo->prepare("UPDATE decks SET win_rate = ? WHERE id = ?");

        foreach ($deckIds as $deckId) {
            $stmtStats->execute([$deckId]);
            $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);
            
            $totalPlayed = (int)($stats['total_played'] ?? 0);
            $totalWins = (int)($stats['total_wins'] ?? 0);
            
            $winRate = 0.00;
            if ($totalPlayed > 0) {
                $winRate = round(($totalWins / $totalPlayed) * 100, 2);
            }
            
            $stmtUpdate->execute([$winRate, $deckId]);
        }
    }
}

if (!function_exists('recalculateDecksForMatch')) {
    function recalculateDecksForMatch($pdo, $matchId) {
        if (!$matchId) return;
        $stmt = $pdo->prepare("
            SELECT tp.deck_id 
            FROM matches m
            JOIN tournament_participants tp ON m.tournament_id = tp.tournament_id AND (m.team_home_id = tp.team_id OR m.team_away_id = tp.team_id)
            WHERE m.id = ? AND tp.deck_id IS NOT NULL AND tp.deleted_at IS NULL AND m.deleted_at IS NULL
        ");
        $stmt->execute([$matchId]);
        $deckIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($deckIds)) {
            recalculateDeckWinRates($pdo, array_unique($deckIds));
        }
    }
}

if (!function_exists('isDeckLocked')) {
    function isDeckLocked($pdo, $deckId) {
        if (!$deckId) return false;
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM tournament_participants tp
            JOIN tournaments t ON tp.tournament_id = t.id
            WHERE tp.deck_id = ? AND t.status = 'closed' AND tp.deleted_at IS NULL AND t.deleted_at IS NULL
        ");
        $stmt->execute([$deckId]);
        return ((int)$stmt->fetchColumn() > 0);
    }
}
