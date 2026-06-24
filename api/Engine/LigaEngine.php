<?php
require_once 'BaseEngine.php';

class LigaEngine extends BaseEngine
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
                if (isset($m['home_id']) || isset($m['away_id'])) {
                    $this->createMatch($m['home_id'] ?? null, $m['away_id'] ?? null, $m['round'] ?? 1);
                    $matchesCreated++;
                }
            }
            return $matchesCreated;
        }

        $participants = $this->getParticipants();
        $teams = array_column($participants, 'team_id');

        if ($seedingMethod === 'random') {
            shuffle($teams);
        } elseif ($seedingMethod === 'ranking' || $seedingMethod === 'elo') {
            $this->sortParticipantsByRanking($participants);
            $teams = array_column($participants, 'team_id');
        }

        if (count($teams) % 2 !== 0) {
            $teams[] = null; // BYE
        }

        $n = count($teams);
        $rounds = $n - 1;
        $matchesCreated = 0;

        for ($r = 0; $r < $rounds; $r++) {
            for ($i = 0; $i < $n / 2; $i++) {
                $home = $teams[$i];
                $away = $teams[$n - 1 - $i];

                if ($home !== null && $away !== null) {
                    $this->createMatch($home, $away, $r + 1);
                    $matchesCreated++;
                }
            }
            // Rotate teams (keep index 0 fixed)
            $last = array_pop($teams);
            array_splice($teams, 1, 0, [$last]);
        }
        return $matchesCreated;
    }

    public function onMatchCompleted($matchId)
    {
        // En una liga normal, solo actualizamos los standings
        $this->updateStandings();
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
