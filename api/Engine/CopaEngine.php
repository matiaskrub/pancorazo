<?php
require_once 'BaseEngine.php';

class CopaEngine extends BaseEngine
{

    public function canStart()
    {
        $participants = $this->getParticipants();
        $count = count($participants);
        // Debe ser potencia de 2 o requerirá BYEs automáticos
        return $count >= 2;
    }

    public function generateFixture($seedingMethod = 'random', $params = [])
    {
        $participants = $this->getParticipants();
        $count = count($participants);

        if ($seedingMethod === 'manual' && isset($params['matches'])) {
            $matchesCreated = 0;
            foreach ($params['matches'] as $m) {
                $this->createMatch($m['home_id'], $m['away_id'], $m['round'] ?? 1, null, $m['stage'] ?? null, $m['bracket_index'] ?? null);
                $matchesCreated++;
            }

            // Generar slots vacíos para las siguientes rondas
            $count = count($participants);
            $pow2 = 1;
            while ($pow2 < $count)
                $pow2 *= 2;

            $stages = [
                1 => 'Final',
                2 => 'Semifinal',
                4 => 'Cuartos',
                8 => 'Octavos',
                16 => 'Dieciseisavos',
                32 => 'Treintaidosavos'
            ];

            $tempCount = ($pow2 / 2) / 2;
            $round = 2;
            while ($tempCount >= 1) {
                $sName = $stages[$tempCount] ?? "Ronda de $tempCount";
                for ($j = 0; $j < $tempCount; $j++) {
                    $this->createMatch(null, null, $round, null, $sName, $j);
                }
                $tempCount /= 2;
                $round++;
            }

            return $matchesCreated;
        }

        if ($seedingMethod === 'random') {
            shuffle($participants);
        } elseif ($seedingMethod === 'ranking' || $seedingMethod === 'elo') {
            $this->sortParticipantsByRanking($participants);
        }

        // Determinar tamaño del bracket (potencia de 2)
        $pow2 = 1;
        while ($pow2 < $count)
            $pow2 *= 2;

        $stages = [
            1 => 'Final',
            2 => 'Semifinal',
            4 => 'Cuartos',
            8 => 'Octavos',
            16 => 'Dieciseisavos',
            32 => 'Treintaidosavos'
        ];

        $currentStageCount = $pow2 / 2;
        $stageName = $stages[$currentStageCount] ?? "Ronda de $currentStageCount";

        $matchesCreated = 0;
        $stmt = $this->pdo->prepare("SELECT match_format FROM tournaments WHERE id = ?");
        $stmt->execute([$this->tournamentId]);
        $tournamentData = $stmt->fetch();
        $isHomeAway = ($tournamentData['match_format'] ?? 'single') === 'home_away';

        $byes = []; // Mapeo de bracket_index en Ronda 1 a team_id para equipos que pasan directo
        
        // Primera Ronda
        for ($i = 0; $i < $currentStageCount; $i++) {
            $home = $participants[$i] ?? null;
            $away = $participants[$pow2 - 1 - $i] ?? null;

            $homeId = $home ? $home['team_id'] : null;
            $awayId = $away ? $away['team_id'] : null;

            if (!$homeId && !$awayId)
                continue;

            // Si ambos equipos están presentes, se crea el partido normal
            if ($homeId && $awayId) {
                $this->createMatch($homeId, $awayId, 1, null, $stageName, $i);

                if ($isHomeAway) {
                    // Generar partido de vuelta (invirtiendo localía)
                    $this->createMatch($awayId, $homeId, 1, null, $stageName, $i);
                }
                $matchesCreated++;
            } else {
                // BYE: Solo hay un equipo, pasa directamente a la siguiente fase
                $winnerId = $homeId ?: $awayId;
                $byes[$i] = $winnerId;
                // No incrementamos matchesCreated ya que no se genera un partido en DB
            }
        }

        // Generar slots para las siguientes rondas hasta la final
        $tempCount = $currentStageCount / 2;
        $round = 2;
        while ($tempCount >= 1) {
            $sName = $stages[$tempCount] ?? "Ronda de $tempCount";
            for ($j = 0; $j < $tempCount; $j++) {
                $hId = null;
                $aId = null;

                // Si estamos en la Ronda 2, revisamos si algún equipo vino de un BYE en la Ronda 1
                if ($round === 2) {
                    $idxHome = $j * 2;
                    $idxAway = $j * 2 + 1;
                    if (isset($byes[$idxHome])) $hId = $byes[$idxHome];
                    if (isset($byes[$idxAway])) $aId = $byes[$idxAway];
                }

                $this->createMatch($hId, $aId, $round, null, $sName, $j);
                if ($isHomeAway) {
                    $this->createMatch($hId, $aId, $round, null, $sName, $j);
                }
            }

            // Si acabamos de crear la Final y el torneo tiene tercer puesto, creamos ese match extra
            if ($tempCount == 1 && ($tournamentData['has_third_place'] ?? 0)) {
                $this->createMatch(null, null, $round, null, 'Tercer Puesto', 0);
            }

            $tempCount /= 2;
            $round++;
        }

        return $matchesCreated;
    }

    public function onMatchCompleted($matchId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM matches WHERE id = ?");
        $stmt->execute([$matchId]);
        $match = $stmt->fetch();

        if (!$match || !in_array(strtoupper($match['status']), ['PLAYED', 'WALKOVER', 'COMPLETED', 'PENDING']))
            return;
        if (empty($match['stage']) || !isset($match['bracket_index']))
            return;

        $tournamentId = $match['tournament_id'];
        $stmtT = $this->pdo->prepare("SELECT match_format FROM tournaments WHERE id = ?");
        $stmtT->execute([$tournamentId]);
        $tournament = $stmtT->fetch();
        $isHomeAway = ($tournament['match_format'] ?? 'single') === 'home_away';

        $winnerId = null;

        if ($isHomeAway) {
            // Buscar partido hermano (mismo stage y bracket_index)
            $stmtPair = $this->pdo->prepare("SELECT * FROM matches WHERE tournament_id = ? AND stage = ? AND bracket_index = ?");
            $stmtPair->execute([$tournamentId, $match['stage'], $match['bracket_index']]);
            $pair = $stmtPair->fetchAll();

            if (count($pair) < 2)
                return; // Error de integridad o no es ida y vuelta real

            // Verificar si ambos están jugados
            foreach ($pair as $m) {
                if (!in_array(strtoupper($m['status']), ['PLAYED', 'WALKOVER', 'COMPLETED', 'PENDING']))
                    return;
            }

            // Calcular GLOBAL
            $score1 = 0;
            $score2 = 0;
            $team1 = $pair[0]['team_home_id'];
            $team2 = $pair[0]['team_away_id'];

            foreach ($pair as $m) {
                if ($m['team_home_id'] == $team1) {
                    $score1 += $m['score_home'];
                    $score2 += $m['score_away'];
                } else {
                    $score1 += $m['score_away'];
                    $score2 += $m['score_home'];
                }
            }

            if ($score1 > $score2) {
                $winnerId = $team1;
            } elseif ($score2 > $score1) {
                $winnerId = $team2;
            } else {
                // Empate global, ver penales del SEGUNDO partido (el que se jugó último)
                // Usualmente el segundo partido es el que define
                $lastMatch = $match; // El que acaba de completarse
                if ($lastMatch['penalties_home'] > $lastMatch['penalties_away']) {
                    $winnerId = $lastMatch['team_home_id'];
                } elseif ($lastMatch['penalties_away'] > $lastMatch['penalties_home']) {
                    $winnerId = $lastMatch['team_away_id'];
                }
            }
        } else {
            // Lógica normal de partido único
            if ($match['score_home'] > $match['score_away']) {
                $winnerId = $match['team_home_id'];
            } elseif ($match['score_away'] > $match['score_home']) {
                $winnerId = $match['team_away_id'];
            } elseif (!is_null($match['penalties_home']) && !is_null($match['penalties_away'])) {
                if ($match['penalties_home'] > $match['penalties_away']) {
                    $winnerId = $match['team_home_id'];
                } elseif ($match['penalties_away'] > $match['penalties_home']) {
                    $winnerId = $match['team_away_id'];
                }
            }
        }

        if (!$winnerId)
            return;

        // Lógica de avance
        $bIdx = (int) $match['bracket_index'];
        $nextMatchIdx = floor($bIdx / 2);
        $isSlotA = ($bIdx % 2 === 0);
        $fieldToUpdate = $isSlotA ? 'team_home_id' : 'team_away_id';
        $nextRound = (int) $match['round'] + 1;

        // Buscar el partido en la siguiente ronda con el índice calculado
        $stmtNext = $this->pdo->prepare("SELECT id FROM matches WHERE tournament_id = ? AND round = ? AND bracket_index = ?");
        $stmtNext->execute([$this->tournamentId, $nextRound, $nextMatchIdx]);
        $nextMatch = $stmtNext->fetch();

        if ($nextMatch) {
            $updateSql = "UPDATE matches SET $fieldToUpdate = ? WHERE id = ?";
            $this->pdo->prepare($updateSql)->execute([$winnerId, $nextMatch['id']]);
        }

        // Lógica de avance de PERDEDOR para Tercer Puesto
        if (strtoupper($match['stage']) === 'SEMIFINAL') {
            $loserId = ($winnerId == $match['team_home_id']) ? $match['team_away_id'] : $match['team_home_id'];
            if ($loserId) {
                // Buscar el partido de Tercer Puesto
                $stmtThird = $this->pdo->prepare("SELECT id FROM matches WHERE tournament_id = ? AND UPPER(stage) = 'TERCER PUESTO' LIMIT 1");
                $stmtThird->execute([$this->tournamentId]);
                $thirdMatch = $stmtThird->fetch();
                if ($thirdMatch) {
                    $updateSql = "UPDATE matches SET $fieldToUpdate = ? WHERE id = ?";
                    $this->pdo->prepare($updateSql)->execute([$loserId, $thirdMatch['id']]);
                }
            }
        }
    }

    private function checkAndGenerateNextRound($currentRound)
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM matches WHERE tournament_id = ? AND round = ? AND status != 'Played'");
        $stmt->execute([$this->tournamentId, $currentRound]);
        $pending = $stmt->fetchColumn();

        if ($pending == 0) {
            // Obtener ganadores de la ronda actual
            $stmtWinners = $this->pdo->prepare("
                SELECT CASE WHEN score_home > score_away THEN team_home_id 
                            WHEN score_home < score_away THEN team_away_id
                            WHEN penalties_home IS NOT NULL AND penalties_away IS NOT NULL AND penalties_home > penalties_away THEN team_home_id
                            WHEN penalties_home IS NOT NULL AND penalties_away IS NOT NULL AND penalties_home < penalties_away THEN team_away_id
                            ELSE NULL END as winner_id
                FROM matches 
                WHERE tournament_id = ? AND round = ?
            ");
            $stmtWinners->execute([$this->tournamentId, $currentRound]);
            $winners = $stmtWinners->fetchAll(PDO::FETCH_COLUMN);

            if (count($winners) >= 2) {
                $nextRound = $currentRound + 1;
                for ($i = 0; $i < count($winners); $i += 2) {
                    if (isset($winners[$i + 1])) {
                        $this->createMatch($winners[$i], $winners[$i + 1], $nextRound);
                    }
                }
            }
        }
    }

    public function updateStandings()
    {
        return false; // Copa no tiene tabla de posiciones tradicional
    }

    public function getPodium()
    {
        // Buscar la Final (insensible a mayúsculas)
        $stmt = $this->pdo->prepare("SELECT * FROM matches WHERE tournament_id = ? AND UPPER(stage) IN ('FINAL', 'FINALÍSIMA') LIMIT 1");
        $stmt->execute([$this->tournamentId]);
        $match = $stmt->fetch();

        if (!$match)
            return [];

        $podium = [];

        // Determinar ganador para posición 1
        $winnerId = null;
        $loserId = null;

        if ($match['score_home'] > $match['score_away']) {
            $winnerId = $match['team_home_id'];
            $loserId = $match['team_away_id'];
        } elseif ($match['score_away'] > $match['score_home']) {
            $winnerId = $match['team_away_id'];
            $loserId = $match['team_home_id'];
        } elseif (!is_null($match['penalties_home']) && !is_null($match['penalties_away'])) {
            if ($match['penalties_home'] > $match['penalties_away']) {
                $winnerId = $match['team_home_id'];
                $loserId = $match['team_away_id'];
            } elseif ($match['penalties_away'] > $match['penalties_home']) {
                $winnerId = $match['team_away_id'];
                $loserId = $match['team_home_id'];
            }
        }

        if ($winnerId) {
            $podium[] = ['team_id' => $winnerId, 'position' => 1];
            if ($loserId) {
                $podium[] = ['team_id' => $loserId, 'position' => 2];
            }
        }

        // Buscar partido de Tercer Puesto
        $stmt3 = $this->pdo->prepare("SELECT * FROM matches WHERE tournament_id = ? AND UPPER(stage) = 'TERCER PUESTO' LIMIT 1");
        $stmt3->execute([$this->tournamentId]);
        $match3 = $stmt3->fetch();

        if ($match3) {
            $winner3Id = null;
            $loser4Id = null;

            if ($match3['score_home'] > $match3['score_away']) {
                $winner3Id = $match3['team_home_id'];
                $loser4Id = $match3['team_away_id'];
            } elseif ($match3['score_away'] > $match3['score_home']) {
                $winner3Id = $match3['team_away_id'];
                $loser4Id = $match3['team_home_id'];
            } elseif (isset($match3['penalties_home']) && isset($match3['penalties_away'])) {
                if ($match3['penalties_home'] > $match3['penalties_away']) {
                    $winner3Id = $match3['team_home_id'];
                    $loser4Id = $match3['team_away_id'];
                } elseif ($match3['penalties_away'] > $match3['penalties_home']) {
                    $winner3Id = $match3['team_away_id'];
                    $loser4Id = $match3['team_home_id'];
                }
            }

            if ($winner3Id) {
                $podium[] = ['team_id' => $winner3Id, 'position' => 3];
                if ($loser4Id) {
                    $podium[] = ['team_id' => $loser4Id, 'position' => 4];
                }
            }
        }

        return $podium;
    }
}
