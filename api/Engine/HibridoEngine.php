<?php
require_once 'BaseEngine.php';
require_once 'LigaEngine.php';
require_once 'CopaEngine.php';

class HibridoEngine extends BaseEngine
{

    public function canStart()
    {
        $participants = $this->getParticipants();
        return count($participants) >= 4; // Mínimo para grupos y fase final
    }

    public function generateFixture($seedingMethod = 'random', $params = [])
    {
        $participants = $this->getParticipants(true);
        $numGroups = $params['num_groups'] ?? 1;

        if ($seedingMethod === 'manual' && isset($params['custom_groups'])) {
            // Grupos predefinidos por el usuario (mapeo de team_id a nombre de grupo)
            $groups = [];
            foreach ($params['custom_groups'] as $groupName => $teamIds) {
                $groupTeams = [];
                foreach ($teamIds as $tid) {
                    $found = array_filter($participants, fn($p) => $p['team_id'] == $tid);
                    if (!empty($found)) {
                        $groupTeams[] = reset($found);
                    }
                }
                $groups[$groupName] = $groupTeams;
            }
        } else {
            if ($seedingMethod === 'ranking' || $seedingMethod === 'elo') {
                $this->sortParticipantsByRanking($participants);
            } elseif ($seedingMethod === 'random') {
                shuffle($participants);
            }

            // Distribuir en grupos (serpiente para ELO/ranking o simple para random)
            $groups = [];
            for ($i = 0; $i < $numGroups; $i++) {
                $groups[chr(65 + $i)] = [];
            }

            foreach ($participants as $idx => $p) {
                $groupIndex = $idx % $numGroups;
                // Para ELO/ranking usamos distribución tipo serpiente
                if (($seedingMethod === 'elo' || $seedingMethod === 'ranking') && (floor($idx / $numGroups) % 2 !== 0)) {
                    $groupIndex = ($numGroups - 1) - $groupIndex;
                }
                $groupName = chr(65 + $groupIndex);
                $groups[$groupName][] = $p;
            }
        }

        $matchesCreated = 0;
        foreach ($groups as $groupName => $groupTeams) {
            $matchesCreated += $this->generateGroupMatches($groupTeams, $groupName);
        }

        return $matchesCreated;
    }

    private function generateGroupMatches($teams, $groupName)
    {
        $teamIds = array_column($teams, 'team_id');
        if (count($teamIds) % 2 !== 0) {
            $teamIds[] = null; // BYE
        }

        $n = count($teamIds);
        $rounds = $n - 1;
        $matchesCreated = 0;

        for ($r = 0; $r < $rounds; $r++) {
            for ($i = 0; $i < $n / 2; $i++) {
                $home = $teamIds[$i];
                $away = $teamIds[$n - 1 - $i];

                if ($home !== null && $away !== null) {
                    $this->createMatch($home, $away, $r + 1, $groupName);
                    $matchesCreated++;
                }
            }
            // Rotate teams (keep index 0 fixed)
            $last = array_pop($teamIds);
            array_splice($teamIds, 1, 0, [$last]);
        }
        return $matchesCreated;
    }

    public function onMatchCompleted($matchId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM matches WHERE id = ?");
        $stmt->execute([$matchId]);
        $match = $stmt->fetch();

        if ($match['group_name']) {
            // Actualizamos la tabla de clasificación ya que estamos en fase de grupos
            $this->updateStandings();
            
            // Lógica de fase de grupos terminada -> generar brackets
            $this->checkAndGeneratePlayoffs();
        } else {
            // Lógica de avance en brackets (como Copa)
            (new CopaEngine($this->pdo, $this->tournamentId))->onMatchCompleted($matchId);
        }
    }

    private function checkAndGeneratePlayoffs()
    {
        // Verificar si todos los partidos de grupos terminaron (excluyendo Walkovers y Completados)
        // Agregamos PENDING con resultados como terminados para no bloquear la generación
        $sqlCount = "SELECT COUNT(*) FROM matches 
                     WHERE tournament_id = ? 
                     AND group_name IS NOT NULL 
                     AND deleted_at IS NULL
                     AND (
                        UPPER(status) NOT IN ('PLAYED', 'WALKOVER', 'COMPLETED', 'PENDING')
                        OR (UPPER(status) = 'PENDING' AND (score_home IS NULL OR score_away IS NULL))
                     )";
        $stmt = $this->pdo->prepare($sqlCount);
        $stmt->execute([$this->tournamentId]);
        
        if ($stmt->fetchColumn() == 0) {
            // Comprobar si ya se generaron los playoffs para no duplicar
            $stmtCheck = $this->pdo->prepare("SELECT COUNT(*) FROM matches WHERE tournament_id = ? AND stage IS NOT NULL AND deleted_at IS NULL");
            $stmtCheck->execute([$this->tournamentId]);
            if ($stmtCheck->fetchColumn() > 0) {
                return; // Ya se generaron
            }

            // Asegurar que los standings estén lo más frescos posible
            $this->updateStandings();

            // Determinar cuántos grupos hay
            $stmtGroups = $this->pdo->prepare("SELECT DISTINCT group_name FROM tournament_standings WHERE tournament_id = ? AND group_name IS NOT NULL ORDER BY group_name");
            $stmtGroups->execute([$this->tournamentId]);
            $groups = $stmtGroups->fetchAll(PDO::FETCH_COLUMN);
            $numGroups = count($groups);

            if ($numGroups == 0) return;

            // Extraer configuraciones del torneo guardadas
            $stmtSetup = $this->pdo->prepare("SELECT engine_settings FROM tournaments WHERE id = ?");
            $stmtSetup->execute([$this->tournamentId]);
            $settingsJson = $stmtSetup->fetchColumn();
            $settings = $settingsJson ? json_decode($settingsJson, true) : [];
            
            $qualifiersPerGroup = (int)($settings['qualifiers_per_group'] ?? 2);
            $bestWildcards = (int)($settings['best_wildcards'] ?? 0);

            // Determinar clasificados por grupo según la configuración
            $teamsToAdvance = [];
            foreach ($groups as $g) {
                // Selecciona los clasificados top de este grupo
                $limit = (int)$qualifiersPerGroup;
                $stmtQ = $this->pdo->prepare("SELECT team_id FROM tournament_standings WHERE tournament_id = ? AND group_name = ? ORDER BY pts DESC, dg DESC, gf DESC LIMIT $limit");
                $stmtQ->execute([$this->tournamentId, $g]);
                $teamsToAdvance[$g] = $stmtQ->fetchAll(PDO::FETCH_COLUMN);
            }

            // Seleccionar los "Mejores Wildcard" adicionales
            // (Los top generales que no entraron directo en el corte anterior)
            $wildcardTeams = [];
            if ($bestWildcards > 0) {
                // Juntamos todos los equipos que ya clasificaron directo para excluirlos
                $alreadyAdvancedIds = [];
                foreach ($teamsToAdvance as $teamList) {
                    $alreadyAdvancedIds = array_merge($alreadyAdvancedIds, $teamList);
                }
                
                $placeholders = count($alreadyAdvancedIds) > 0 ? str_repeat('?,', count($alreadyAdvancedIds) - 1) . '?' : '0';
                
                // 1. Obtener todos los equipos restantes agrupados por su grupo
                $sqlRemaining = "SELECT * FROM tournament_standings 
                                WHERE tournament_id = ? 
                                AND group_name IS NOT NULL 
                                AND team_id NOT IN ($placeholders) 
                                ORDER BY group_name, pts DESC, dg DESC, gf DESC";
                
                $stmtRemaining = $this->pdo->prepare($sqlRemaining);
                $paramsRemaining = count($alreadyAdvancedIds) > 0 ? array_merge([$this->tournamentId], $alreadyAdvancedIds) : [$this->tournamentId];
                $stmtRemaining->execute($paramsRemaining);
                $remainingStats = $stmtRemaining->fetchAll(PDO::FETCH_ASSOC);

                $remainingByGroup = [];
                foreach ($remainingStats as $rs) {
                    $remainingByGroup[$rs['group_name']][] = $rs;
                }

                // 2. Seleccionar por posición (Mejores 3eros de todos los grupos, luego mejores 4tos, etc.)
                $pos = 0;
                while (count($wildcardTeams) < $bestWildcards) {
                    $candidatesAtPos = [];
                    foreach ($remainingByGroup as $gName => $teams) {
                        if (isset($teams[$pos])) {
                            $candidatesAtPos[] = $teams[$pos];
                        }
                    }
                    
                    if (empty($candidatesAtPos)) break; // No quedan más equipos

                    // Ordenar candidatos de esta posición por desempeño
                    usort($candidatesAtPos, function($a, $b) {
                        if ($b['pts'] !== $a['pts']) return $b['pts'] - $a['pts'];
                        if ($b['dg'] !== $a['dg']) return $b['dg'] - $a['dg'];
                        return $b['gf'] - $a['gf'];
                    });

                    // Añadir a wildcards hasta completar cupos
                    foreach ($candidatesAtPos as $c) {
                        if (count($wildcardTeams) < $bestWildcards) {
                            $wildcardTeams[] = $c['team_id'];
                        }
                    }
                    $pos++;
                }
            }

            $useCrossGroups = ($bestWildcards == 0 && $qualifiersPerGroup == 2 && ($numGroups % 2 == 0));
            if ($useCrossGroups) {
                $leftSide = [];
                $rightSide = [];
                for ($gIdx = 0; $gIdx < $numGroups; $gIdx += 2) {
                    $gA = $groups[$gIdx];
                    $gB = $groups[$gIdx + 1];
                    
                    $a1 = $teamsToAdvance[$gA][0] ?? null;
                    $a2 = $teamsToAdvance[$gA][1] ?? null;
                    $b1 = $teamsToAdvance[$gB][0] ?? null;
                    $b2 = $teamsToAdvance[$gB][1] ?? null;

                    $leftSide[] = $a1;
                    $leftSide[] = $b2;

                    $rightSide[] = $b1;
                    $rightSide[] = $a2;
                }
                $qualifiedTeams = array_merge($leftSide, $rightSide);
            } else {
                $qualifiedTeams = [];
                
                // Unir clasificados por grupo en un pool general para ordenar
                $directQualifiersPool = [];
                for ($rank = 0; $rank < $qualifiersPerGroup; $rank++) {
                   foreach ($groups as $g) {
                       if (isset($teamsToAdvance[$g][$rank])) {
                           $directQualifiersPool[] = $teamsToAdvance[$g][$rank];
                       }
                   }
                }

                // Unimos pool directo con los Wildcards
                $allAdvancingTeams = array_merge($directQualifiersPool, $wildcardTeams);
                
                // Matemáticas de Potencias de Dos para cruces
                $totalClasificados = count($allAdvancingTeams);
                $pow2 = 1;
                while ($pow2 * 2 <= $totalClasificados) $pow2 *= 2;
                if ($pow2 < 2) $pow2 = 2; // Minimun final es de 2 (Final direct)
                
                // Si hay más clasificados de los que caben en la potencia, reducimos (poco probable con settings correctos, pero seguridad ante todo)
                $limitTop = min($pow2 / 2, ceil(count($allAdvancingTeams) / 2));
                $limitBottom = $pow2 - $limitTop;

                $tops = array_slice($allAdvancingTeams, 0, $limitTop);
                $bottoms = array_slice($allAdvancingTeams, $limitTop, $limitBottom);

                // Cruces: El mejor vs el Peor
                for ($i=0; $i<$pow2/2; $i++) {
                   $qualifiedTeams[] = $tops[$i] ?? null;
                   $qualifiedTeams[] = $bottoms[count($bottoms) - 1 - $i] ?? null; 
                }
            }

            $count = count($qualifiedTeams);
            if ($count < 2) return;

            $pow2 = 1;
            while ($pow2 < $count) $pow2 *= 2;

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

            // Obtener variables de torneo
            $stmtT = $this->pdo->prepare("SELECT match_format, has_third_place FROM tournaments WHERE id = ?");
            $stmtT->execute([$this->tournamentId]);
            $tournamentData = $stmtT->fetch();
            $isHomeAway = ($tournamentData['match_format'] ?? 'single') === 'home_away';

            $stmtRound = $this->pdo->prepare("SELECT MAX(round) FROM matches WHERE tournament_id = ? AND deleted_at IS NULL");
            $stmtRound->execute([$this->tournamentId]);
            $baseRound = ((int)$stmtRound->fetchColumn() ?: 1) + 1;
            
            $byes = []; // Mapeo de bracket_index en la primera ronda de playoffs a team_id para BYEs
            
            // 1. Crear los de la ronda actual (Ronda 1 de playoffs = baseRound)
            for ($i = 0; $i < $currentStageCount; $i++) {
                $homeId = $qualifiedTeams[$i * 2] ?? null;
                $awayId = $qualifiedTeams[$i * 2 + 1] ?? null;

                if ($homeId && $awayId) {
                    $this->createMatch($homeId, $awayId, $baseRound, null, $stageName, $i);
                    
                    if ($isHomeAway) { 
                        $this->createMatch($awayId, $homeId, $baseRound, null, $stageName, $i);
                    }
                } else {
                    // BYE: Un equipo sin rival pasa directo a la siguiente fase
                    $winnerId = $homeId ?: $awayId;
                    if ($winnerId) {
                        $byes[$i] = $winnerId;
                    }
                }
            }

            // 2. Generar slots vacíos hasta la final pre-generados
            $tempCount = $currentStageCount / 2;
            $roundOffset = 1;
            while ($tempCount >= 1) {
                $sName = $stages[$tempCount] ?? "Ronda de $tempCount";
                for ($j = 0; $j < $tempCount; $j++) {
                    $hId = null;
                    $aId = null;

                    // Si es la ronda inmediatamente posterior a la actual, inyectamos los que tuvieron BYE
                    if ($roundOffset === 1) {
                        $idxH = $j * 2;
                        $idxA = $j * 2 + 1;
                        if (isset($byes[$idxH])) $hId = $byes[$idxH];
                        if (isset($byes[$idxA])) $aId = $byes[$idxA];
                    }

                    $this->createMatch($hId, $aId, $baseRound + $roundOffset, null, $sName, $j);
                    if ($isHomeAway) {
                       $this->createMatch($hId, $aId, $baseRound + $roundOffset, null, $sName, $j);
                    }
                }
                
                if ($tempCount == 1 && ($tournamentData['has_third_place'] ?? 0)) {
                    $this->createMatch(null, null, $baseRound + $roundOffset, null, 'Tercer Puesto', 0);
                }
                
                $tempCount /= 2;
                $roundOffset++;
            }
        }
    }

    public function updateStandings()
    {
        return (new LigaEngine($this->pdo, $this->tournamentId))->updateStandings();
    }

    public function getPodium()
    {
        return (new CopaEngine($this->pdo, $this->tournamentId))->getPodium();
    }
}
