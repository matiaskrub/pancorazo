<?php

abstract class BaseEngine
{
    protected $pdo;
    protected $tournamentId;

    public function __construct($pdo, $tournamentId)
    {
        $this->pdo = $pdo;
        $this->tournamentId = $tournamentId;
    }

    /**
     * Valida si el torneo cumple requisitos (mínimo de equipos y que no exceda max_teams)
     */
    public function canStart()
    {
        $stmt = $this->pdo->prepare("SELECT min_teams, max_teams FROM tournaments WHERE id = ?");
        $stmt->execute([$this->tournamentId]);
        $tournament = $stmt->fetch();

        $participants = $this->getParticipants(true);
        $count = count($participants);

        if ($count < ($tournament['min_teams'] ?? 2)) {
            throw new Exception("El torneo requiere un mínimo de " . ($tournament['min_teams'] ?? 2) . " equipos para iniciar (hay $count).");
        }

        // Si max_teams < 99, validamos que no se exceda
        if (($tournament['max_teams'] ?? 99) < 99 && $count > $tournament['max_teams']) {
            throw new Exception("El torneo excede el máximo permitido de " . $tournament['max_teams'] . " equipos (hay $count activos). Por favor, mueve algunos equipos a la lista de espera.");
        }

        return true;
    }

    /**
     * Genera el fixture inicial del torneo
     */
    abstract public function generateFixture($seedingMethod = 'random', $params = []);

    /**
     * Maneja la lógica después de que un partido se marca como 'Played'
     */
    abstract public function onMatchCompleted($matchId);

    /**
     * Calcula y actualiza los standings (si aplica)
     */
    abstract public function updateStandings();

    /**
     * Determina el podio al finalizar el torneo
     */
    abstract public function getPodium();

    /**
     * Helper para obtener participantes no eliminados
     */
    protected function getParticipants($onlyActive = true)
    {
        $sql = "SELECT tp.*, t.name as team_name, t.current_elo as team_elo, t.official_ranking_points as team_official_points,
                       (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE ((m.team_home_id = t.id AND m.score_home > m.score_away) OR (m.team_away_id = t.id AND m.score_away > m.score_home)) AND tr.is_jo = 1) as official_wins_count,
                       (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND m.score_home = m.score_away AND m.score_home IS NOT NULL AND tr.is_jo = 1) as official_draws_count,
                       (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE ((m.team_home_id = t.id AND m.score_home < m.score_away) OR (m.team_away_id = t.id AND m.score_away < m.score_home)) AND tr.is_jo = 1) as official_losses_count,
                       (SELECT COUNT(*) FROM matches m JOIN tournaments tr ON m.tournament_id = tr.id WHERE (m.team_home_id = t.id OR m.team_away_id = t.id) AND tr.is_jo = 1) as official_total_matches
                FROM tournament_participants tp 
                JOIN teams t ON tp.team_id = t.id 
                WHERE tp.tournament_id = ? AND tp.deleted_at IS NULL";
        if ($onlyActive) {
            $sql .= " AND tp.is_waiting = 0";
        }
        $sql .= " ORDER BY tp.seed ASC, tp.id ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->tournamentId]);
        return $stmt->fetchAll();
    }

    protected function sortParticipantsByRanking(&$participants)
    {
        usort($participants, function ($a, $b) {
            // 1. Puntos de Ránking Oficial (descendente)
            $ptsA = (float)($a['team_official_points'] ?? 0);
            $ptsB = (float)($b['team_official_points'] ?? 0);
            if ($ptsB != $ptsA) {
                return ($ptsB > $ptsA) ? 1 : -1;
            }

            // 2. Rendimiento (descendente)
            $wA = (int)($a['official_wins_count'] ?? 0);
            $dA = (int)($a['official_draws_count'] ?? 0);
            $lA = (int)($a['official_losses_count'] ?? 0);
            $totalA = $wA + $dA + $lA;
            $perfA = $totalA === 0 ? 0 : ($wA * 3 + $dA) / ($totalA * 3);

            $wB = (int)($b['official_wins_count'] ?? 0);
            $dB = (int)($b['official_draws_count'] ?? 0);
            $lB = (int)($b['official_losses_count'] ?? 0);
            $totalB = $wB + $dB + $lB;
            $perfB = $totalB === 0 ? 0 : ($wB * 3 + $dB) / ($totalB * 3);

            if ($perfB != $perfA) {
                return ($perfB > $perfA) ? 1 : -1;
            }

            // 3. ELO (descendente)
            $eloA = (int)($a['team_elo'] ?? 0);
            $eloB = (int)($b['team_elo'] ?? 0);
            if ($eloB != $eloA) {
                return $eloB - $eloA;
            }

            // 4. Partidos oficiales (menor arriba, es decir, ascendente)
            $matchesA = (int)($a['official_total_matches'] ?? 0);
            $matchesB = (int)($b['official_total_matches'] ?? 0);
            return $matchesA - $matchesB;
        });
    }

    /**
     * Helper para insertar un partido
     */
    protected function createMatch($homeId, $awayId, $round, $group = null, $stage = null, $bracketIndex = null)
    {
        $stmt = $this->pdo->prepare("INSERT INTO matches (tournament_id, team_home_id, team_away_id, status, round, group_name, stage, bracket_index) 
                                     VALUES (?, ?, ?, 'SCHEDULED', ?, ?, ?, ?)");
        $stmt->execute([$this->tournamentId, $homeId, $awayId, $round, $group, $stage, $bracketIndex]);
        return $this->pdo->lastInsertId();
    }
}
