<?php

/**
 * Módulo para el cálculo del Ránking Oficial Kick On
 */

function ensureOfficialRankingSchema($pdo) {
    // Evitar hacer DDLs si la tabla ya existe para no provocar un Implicit Commit en MySQL
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'official_ranking_history'");
        if ($stmt->fetch() !== false) {
            return; // La tabla ya existe, asumimos que el esquema está completo
        }
    } catch (Exception $e) {
        // En caso de error en la consulta de verificación, continuamos con precaución
    }

    // 1. Añadir tournament_level a tournaments
    try {
        $pdo->exec("ALTER TABLE tournaments ADD COLUMN tournament_level ENUM('tienda', 'regional', 'nacional') DEFAULT 'tienda'");
    } catch (Exception $e) {}

    // 2. Cambiar fair_play_team_id a VARCHAR(255) para soportar múltiples equipos separados por comas
    try {
        $pdo->exec("ALTER TABLE tournaments MODIFY COLUMN fair_play_team_id VARCHAR(255) NULL");
    } catch (Exception $e) {}

    // 3. Añadir columnas a teams
    try {
        $pdo->exec("ALTER TABLE teams ADD COLUMN official_ranking_points DECIMAL(10,2) DEFAULT 0.00");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE teams ADD COLUMN official_legacy_count INT DEFAULT 0");
    } catch (Exception $e) {}

    // 4. Crear tabla official_ranking_history
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS official_ranking_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            tournament_id INT NOT NULL,
            base_points INT NOT NULL,
            points_earned DECIMAL(10,2) NOT NULL,
            multipliers_summary VARCHAR(500) NULL,
            tournament_multiplier DECIMAL(3,1) DEFAULT 1.0,
            legacy_multiplier DECIMAL(3,1) DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
        )");
        $pdo->exec("ALTER TABLE official_ranking_history MODIFY COLUMN tournament_multiplier DECIMAL(3,1) DEFAULT 1.0");
    } catch (Exception $e) {}
}

function getElosBeforeMatch($pdo, $matchId, $teamHomeId, $teamAwayId) {
    $stmtElo = $pdo->prepare("SELECT team_id, old_elo FROM elo_history WHERE match_id = ?");
    $stmtElo->execute([$matchId]);
    $rows = $stmtElo->fetchAll();
    
    $elos = [];
    foreach ($rows as $row) {
        $elos[$row['team_id']] = (int)$row['old_elo'];
    }
    
    if (!isset($elos[$teamHomeId])) {
        $stmtHome = $pdo->prepare("SELECT current_elo FROM teams WHERE id = ?");
        $stmtHome->execute([$teamHomeId]);
        $elos[$teamHomeId] = (int)($stmtHome->fetchColumn() ?: 1200);
    }
    if (!isset($elos[$teamAwayId])) {
        $stmtAway = $pdo->prepare("SELECT current_elo FROM teams WHERE id = ?");
        $stmtAway->execute([$teamAwayId]);
        $elos[$teamAwayId] = (int)($stmtAway->fetchColumn() ?: 1200);
    }
    
    return [
        'home' => $elos[$teamHomeId],
        'away' => $elos[$teamAwayId]
    ];
}

/**
 * Calcula y aplica los puntos del Ránking Oficial para un torneo cerrado.
 */
function processOfficialRanking($pdo, $tournamentId, $stats, $tournamentLevel, $podium) {
    ensureOfficialRankingSchema($pdo);
    if (!$stats || !is_array($stats)) {
        $stats = [];
    }

    // Obtener información base del torneo
    $stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
    $stmt->execute([$tournamentId]);
    $tournament = $stmt->fetch();

    if (!$tournament || !$tournament['is_jo']) {
        return; // Solo aplica para torneos JO
    }

    // 1. Obtener partidos jugados del torneo (excluyendo programados y eliminados, pero INCLUYENDO walkovers)
    $stmtMatches = $pdo->prepare("SELECT id, team_home_id, team_away_id, score_home, score_away, status, is_wo FROM matches 
                                  WHERE tournament_id = ? 
                                    AND score_home IS NOT NULL 
                                    AND score_away IS NOT NULL 
                                    AND LOWER(status) != 'scheduled'
                                    AND deleted_at IS NULL");
    $stmtMatches->execute([$tournamentId]);
    $matches = $stmtMatches->fetchAll();

    // Sumar Victorias y Empates con la nueva fórmula de diferencia de ELO
    $teamBasePoints = [];
    foreach ($matches as $m) {
        $homeId = $m['team_home_id'];
        $awayId = $m['team_away_id'];
        $scoreHome = $m['score_home'];
        $scoreAway = $m['score_away'];
        $status = $m['status'] ?? '';
        $isWo = $m['is_wo'] ?? 0;

        if (!isset($teamBasePoints[$homeId])) $teamBasePoints[$homeId] = 0;
        if (!isset($teamBasePoints[$awayId])) $teamBasePoints[$awayId] = 0;

        $isWalkover = (strtolower($status) === 'walkover') || ($isWo == 1);

        if ($isWalkover) {
            // Regla permanente: el ganador del Walkover suma +10 puntos base sin importar el ELO
            if ($scoreHome > $scoreAway) {
                $teamBasePoints[$homeId] += 10;
            } elseif ($scoreAway > $scoreHome) {
                $teamBasePoints[$awayId] += 10;
            }
            continue; // Omitir el cálculo de ELO y el flujo habitual para este partido
        }

        if (defined('FORCE_1200_ELO') && FORCE_1200_ELO) {
            $eloHome = 1200;
            $eloAway = 1200;
        } else {
            $elos = getElosBeforeMatch($pdo, $m['id'], $homeId, $awayId);
            $eloHome = $elos['home'];
            $eloAway = $elos['away'];
        }

        if ($scoreHome > $scoreAway) {
            // Home gana, Away pierde
            if ($eloAway - $eloHome > 100) {
                $teamBasePoints[$homeId] += 20; // Matagigantes
            } else {
                $teamBasePoints[$homeId] += 10;
            }
            $teamBasePoints[$awayId] += 0;
        } elseif ($scoreAway > $scoreHome) {
            // Away gana, Home pierde
            if ($eloHome - $eloAway > 100) {
                $teamBasePoints[$awayId] += 20; // Matagigantes
            } else {
                $teamBasePoints[$awayId] += 10;
            }
            $teamBasePoints[$homeId] += 0;
        } else {
            // Empate
            $diff = abs($eloHome - $eloAway);
            if ($diff <= 100) {
                $teamBasePoints[$homeId] += 5;
                $teamBasePoints[$awayId] += 5;
            } else {
                if ($eloHome > $eloAway) {
                    $teamBasePoints[$homeId] += 2; // Favorito recibe 2
                    $teamBasePoints[$awayId] += 8; // Débil recibe 8
                } else {
                    $teamBasePoints[$awayId] += 2; // Favorito recibe 2
                    $teamBasePoints[$homeId] += 8; // Débil recibe 8
                }
            }
        }
    }

    // Obtener todos los participantes reales del torneo para asegurar base participativa (10pts)
    $stmtParts = $pdo->prepare("SELECT team_id FROM tournament_participants WHERE tournament_id = ?");
    $stmtParts->execute([$tournamentId]);
    $participants = $stmtParts->fetchAll(PDO::FETCH_COLUMN);

    foreach ($participants as $teamId) {
        if (!isset($teamBasePoints[$teamId])) {
            $teamBasePoints[$teamId] = 0;
        }
    }

    // 2. Multiplicadores y escala de torneo
    $levelMultiplier = 1.0;
    if ($tournamentLevel === 'regional' || $tournamentLevel === 'ascenso') $levelMultiplier = 1.5;
    if ($tournamentLevel === 'nacional' || $tournamentLevel === 'oro') $levelMultiplier = 2.0;

    $topScorerId = $stats['top_scorer_team_id'] ?? null;
    $bestDefenseId = $stats['best_defense_team_id'] ?? null;
    
    // Obtener los IDs de equipos de Fair Play seleccionados por el usuario
    $fairPlayIds = [];
    if (!empty($stats['fair_play_team_id'])) {
        if (is_array($stats['fair_play_team_id'])) {
            foreach ($stats['fair_play_team_id'] as $part) {
                $partTrim = trim((string)$part);
                if ($partTrim !== '') {
                    $fairPlayIds[] = (int)$partTrim;
                }
            }
        } else {
            $fpParts = explode(',', (string)$stats['fair_play_team_id']);
            foreach ($fpParts as $part) {
                $partTrim = trim($part);
                if ($partTrim !== '') {
                    $fairPlayIds[] = (int)$partTrim;
                }
            }
        }
    }

    // Si no se seleccionó ninguno manualmente, se calcula de forma automatizada usando standings
    if (empty($fairPlayIds)) {
        $fairPlayScores = [];
        foreach ($participants as $teamId) {
            $fairPlayScores[$teamId] = 0;
        }

        if (!function_exists('updateTournamentStandings')) {
            require_once 'StandingsHelper.php';
        }
        try {
            $standings = updateTournamentStandings($pdo, $tournamentId);
            foreach ($standings as $row) {
                $tid = $row['team_id'];
                if (isset($fairPlayScores[$tid])) {
                    $fairPlayScores[$tid] = (int)($row['fair_play_score'] ?? 0);
                }
            }
        } catch (Throwable $e) {
            // Silenciosamente capturar errores y mantener los valores en 0
        }

        $minFPScore = null;
        if (!empty($fairPlayScores)) {
            $minFPScore = min($fairPlayScores);
        }

        if ($minFPScore !== null) {
            foreach ($fairPlayScores as $teamId => $fps) {
                if ($fps == $minFPScore) {
                    $fairPlayIds[] = (int)$teamId;
                }
            }
        }
    }

    // Cantidad dinámica de podios según número de participantes reales (un podio cada dos, máx 4)
    $allowedPodiumPlaces = min(4, floor(count($participants) / 2));

    $podiumIds = [];
    foreach($podium as $pos => $tid) {
        if ($pos >= 1 && $pos <= $allowedPodiumPlaces) {
             $podiumIds[$tid] = $pos;
        }
    }

    // Preparar update masivo
    $stmtUpdateTeam = $pdo->prepare("UPDATE teams SET official_ranking_points = official_ranking_points + ?, official_legacy_count = ? WHERE id = ?");
    $stmtInsertHistory = $pdo->prepare("INSERT INTO official_ranking_history (team_id, tournament_id, base_points, points_earned, multipliers_summary, tournament_multiplier, legacy_multiplier) VALUES (?, ?, ?, ?, ?, ?, ?)");

    // Pre-cargar todos los legados actuales para evitar consultas en el loop
    $currentLegacys = [];
    if (!empty($participants)) {
        $stmtLegacy = $pdo->prepare("SELECT id, official_legacy_count FROM teams WHERE id IN (" . implode(',', array_map('intval', $participants)) . ")");
        $stmtLegacy->execute();
        foreach($stmtLegacy->fetchAll() as $row) {
            $currentLegacys[$row['id']] = (int)$row['official_legacy_count'];
        }
    }

    // Comprobar participación en torneos anteriores
    $stmtCheckPart = $pdo->prepare("SELECT 1 FROM tournament_participants WHERE tournament_id = ? AND team_id = ?");

    foreach ($teamBasePoints as $teamId => $basePoints) {
        // Calcular Legado (Rango de torneos)
        $currentLegacy = $currentLegacys[$teamId] ?? 0;

        // Obtener la región del dueño del equipo
        $stmtOwner = $pdo->prepare("SELECT u.region FROM teams t JOIN users u ON t.owner_user_id = u.id WHERE t.id = ?");
        $stmtOwner->execute([$teamId]);
        $teamRegion = $stmtOwner->fetchColumn();
        if ($teamRegion === false) {
            $teamRegion = null;
        }

        // Buscar los últimos 2 torneos JO cerrados antes de este que sean elegibles para este equipo
        // (tomando en cuenta torneos invitacionales y restricciones multiregionales)
        $stmtPrevJo = $pdo->prepare("
            SELECT t.id FROM tournaments t
            WHERE t.is_jo = 1 
              AND t.status = 'closed' 
              AND t.id != :curr_id 
              AND t.end_date <= :end_date
              -- Regla de Invitacional: si es invitacional, el equipo debe haber participado
              AND (t.is_invitational = 0 OR EXISTS (
                  SELECT 1 FROM tournament_participants tp 
                  WHERE tp.tournament_id = t.id AND tp.team_id = :team_id
              ))
              -- Regla de Región: si el torneo tiene regiones permitidas, la región del equipo debe estar en la lista
              AND (
                  NOT EXISTS (SELECT 1 FROM tournament_regions trg WHERE trg.tournament_id = t.id)
                  OR (:team_region IS NOT NULL AND EXISTS (
                      SELECT 1 FROM tournament_regions trg 
                      WHERE trg.tournament_id = t.id AND trg.region_id = :team_region
                  ))
              )
            ORDER BY t.end_date DESC 
            LIMIT 2
        ");
        $stmtPrevJo->execute([
            ':curr_id' => $tournamentId,
            ':end_date' => $tournament['end_date'] ?? date('Y-m-d H:i:s'),
            ':team_id' => $teamId,
            ':team_region' => ($teamRegion !== null && $teamRegion !== '') ? (int)$teamRegion : null
        ]);
        $prevTournaments = $stmtPrevJo->fetchAll(PDO::FETCH_COLUMN);
        $prevT1 = $prevTournaments[0] ?? null;
        $prevT2 = $prevTournaments[1] ?? null;

        // Comprobar participación en torneos anteriores
        $playedT1 = false;
        if ($prevT1) {
            $stmtCheckPart->execute([$prevT1, $teamId]);
            $playedT1 = (bool)$stmtCheckPart->fetch();
        }

        $playedT2 = false;
        if ($prevT2) {
            $stmtCheckPart->execute([$prevT2, $teamId]);
            $playedT2 = (bool)$stmtCheckPart->fetch();
        }

        $newLegacyCount = 1;
        if ($currentLegacy > 0) {
            if ($prevT1 && $prevT2) {
                if (!$playedT1 && !$playedT2) {
                    $newLegacyCount = 1; // Faltó a los 2 elegibles anteriores, se reinicia.
                } else {
                    $newLegacyCount = $currentLegacy + 1;
                }
            } else {
                // Menos de 2 torneos elegibles previos, no se puede reiniciar por faltar a 2.
                $newLegacyCount = $currentLegacy + 1;
            }
        } else {
            $newLegacyCount = 1;
        }

        // Determinar multiplicador de Legado
        $legacyMultiplier = 1.0;
        if ($newLegacyCount == 3) $legacyMultiplier = 1.2;
        if ($newLegacyCount == 4) $legacyMultiplier = 1.4;
        if ($newLegacyCount == 5) $legacyMultiplier = 1.6;
        if ($newLegacyCount == 6) $legacyMultiplier = 1.8;
        if ($newLegacyCount >= 7) $legacyMultiplier = 2.0;

        // Calcular Multiplicadores de Desempeño (Aditivos)
        $bonosAplicados = [];
        $bonusDesempeno = 0.0;

        if (isset($podiumIds[$teamId])) {
            $puesto = $podiumIds[$teamId];
            if ($puesto == 1) {
                $bonusDesempeno += 0.40;
                $bonosAplicados[] = "1° Lugar (+40%)";
            } elseif ($puesto == 2) {
                $bonusDesempeno += 0.30;
                $bonosAplicados[] = "2° Lugar (+30%)";
            } elseif ($puesto == 3) {
                $bonusDesempeno += 0.20;
                $bonosAplicados[] = "3° Lugar (+20%)";
            } elseif ($puesto == 4) {
                $bonusDesempeno += 0.10;
                $bonosAplicados[] = "4° Lugar (+10%)";
            }
        }
        if ($topScorerId == $teamId) {
            $bonusDesempeno += 0.20;
            $bonosAplicados[] = "Goleador (+20%)";
        }
        if ($bestDefenseId == $teamId) {
            $bonusDesempeno += 0.20;
            $bonosAplicados[] = "Muro (+20%)";
        }

        // Fair Play
        if (in_array((int)$teamId, $fairPlayIds) || in_array((string)$teamId, $fairPlayIds)) {
            $bonusDesempeno += 0.20;
            $bonosAplicados[] = "Fair Play (+20%)";
        }

        $multDesempeno = 1.0 + $bonusDesempeno;
        
        // Asistencia Base
        $asistencia = 10;
        
        // Fórmula final
        $puntosCanchaBonificados = $basePoints * $multDesempeno;
        $puntosNivelados = $puntosCanchaBonificados * $levelMultiplier;
        $puntosConLegado = $puntosNivelados * $legacyMultiplier;
        
        $puntosGanados = $puntosConLegado + $asistencia;

        $resumen = implode(' * ', $bonosAplicados);

        // Guardar
        $stmtInsertHistory->execute([
            $teamId,
            $tournamentId,
            $basePoints,
            $puntosGanados,
            $resumen,
            $levelMultiplier,
            $legacyMultiplier
        ]);

        $stmtUpdateTeam->execute([
            $puntosGanados,
            $newLegacyCount,
            $teamId
        ]);
    }
}
?>
