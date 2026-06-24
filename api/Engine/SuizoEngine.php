<?php
require_once 'BaseEngine.php';

class SuizoEngine extends BaseEngine
{

    public function canStart()
    {
        $participants = $this->getParticipants();
        return count($participants) >= 2;
    }

    public function generateFixture($seedingMethod = 'random', $params = [])
    {
        if ($seedingMethod === 'manual' && isset($params['matches'])) {
            $matchesCreated = 0;
            foreach ($params['matches'] as $m) {
                $this->createMatch($m['home_id'], $m['away_id'], $m['round'] ?? 1);
                $matchesCreated++;
            }
            return $matchesCreated;
        }

        // En Suizo, la primera ronda se suele generar por ELO o Aleatorio
        $participants = $this->getParticipants();
        $count = count($participants);

        if ($seedingMethod === 'random') {
            shuffle($participants);
        } else {
            $this->sortParticipantsByRanking($participants);
        }

        $matchesCreated = 0;
        for ($i = 0; $i < $count; $i += 2) {
            if (isset($participants[$i + 1])) {
                $this->createMatch($participants[$i]['team_id'], $participants[$i + 1]['team_id'], 1);
                $matchesCreated++;
            }
        }
        return $matchesCreated;
    }

    public function onMatchCompleted($matchId)
    {
        // En torneos suizos, el administrador suele generar la siguiente ronda manualmente 
        // después de que TODOS los partidos de la ronda actual terminen.
        // Pero actualizamos standings para tener el ranking listo.
        $this->updateStandings();
    }

    public function generateNextRound()
    {
        // 1. Obtener clasificación actual
        $stmt = $this->pdo->prepare("SELECT team_id FROM tournament_standings WHERE tournament_id = ? ORDER BY pts DESC, dg DESC, gf DESC");
        $stmt->execute([$this->tournamentId]);
        $ranking = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($ranking)) {
            throw new Exception("No hay datos de clasificación para generar la siguiente ronda.");
        }

        // 2. Determinar número de ronda
        $stmtRound = $this->pdo->prepare("SELECT MAX(round) FROM matches WHERE tournament_id = ? AND deleted_at IS NULL");
        $stmtRound->execute([$this->tournamentId]);
        $lastRound = $stmtRound->fetchColumn() ?: 0;
        $nextRound = $lastRound + 1;

        // 3. Obtener historial de enfrentamientos (incluyendo BYEs)
        $stmtHistory = $this->pdo->prepare("
            SELECT team_home_id, team_away_id FROM matches 
            WHERE tournament_id = ? AND deleted_at IS NULL
        ");
        $stmtHistory->execute([$this->tournamentId]);
        $historyRaw = $stmtHistory->fetchAll();
        $history = []; // [team1_id => [team2_id => true, ...]]

        foreach ($historyRaw as $row) {
            $h = $row['team_home_id'];
            $a = $row['team_away_id'] ?: 0; // 0 representará un BYE

            if ($h) {
                $history[$h][$a] = true;
            }
            if ($a) {
                $history[$a][$h] = true;
            }
        }

        // 4. Algoritmo de emparejamiento con Backtracking para evitar repeticiones
        $pairings = $this->findValidPairings($ranking, $history);

        if ($pairings === null) {
            throw new Exception("¡Atención! Es matemáticamente imposible generar una nueva ronda sin repetir rivales con los equipos actuales.");
        }

        // 5. Crear los partidos
        $matchesCreated = 0;
        foreach ($pairings as $pair) {
            $this->createMatch($pair[0], $pair[1], $nextRound);
            $matchesCreated++;
        }

        return $matchesCreated;
    }

    /**
     * Busca una combinación de emparejamientos válida usando recursión
     */
    private function findValidPairings($teams, $history, $currentPairings = [])
    {
        if (empty($teams)) {
            return $currentPairings;
        }

        $team1 = array_shift($teams);

        // Si solo queda un equipo, recibe un BYE (rival id = null, representado aquí como 0 para el historial)
        if (empty($teams)) {
            if (isset($history[$team1][0])) {
                return null; // El equipo ya tuvo un BYE
            }
            return array_merge($currentPairings, [[$team1, null]]);
        }

        // Intentar emparejar team1 con cada uno de los rivales restantes
        for ($i = 0; $i < count($teams); $i++) {
            $team2 = $teams[$i];

            // ¿Han jugado ya?
            if (isset($history[$team1][$team2])) {
                continue;
            }

            // Es válido, probamos esta rama
            $remaining = $teams;
            array_splice($remaining, $i, 1);

            $result = $this->findValidPairings($remaining, $history, array_merge($currentPairings, [[$team1, $team2]]));
            if ($result !== null) {
                return $result;
            }
        }

        // Si ningún emparejamiento funcionó para team1, esta rama no es válida
        return null;
    }

    public function updateStandings()
    {
        return updateTournamentStandings($this->pdo, $this->tournamentId);
    }

    public function getPodium()
    {
        $stmt = $this->pdo->prepare("SELECT team_id FROM tournament_standings WHERE tournament_id = ? ORDER BY pts DESC, dg DESC, gf DESC LIMIT 3");
        $stmt->execute([$this->tournamentId]);
        $teamIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $podium = [];
        foreach ($teamIds as $index => $teamId) {
            $podium[] = [
                'team_id' => $teamId,
                'position' => $index + 1
            ];
        }
        return $podium;
    }
}
