<?php
/**
 * StandingsHelper.php
 * Funciones compartidas para la gestión de clasificaciones en torneos.
 */

/**
 * Obtiene la clasificación del torneo usando el caché o calculando si es necesario
 */
function getTournamentStandings($pdo, $id, $returnOnly = false)
{
    try {
        // Intentar leer desde el caché primero
        $stmt = $pdo->prepare("SELECT ts.*, t.name, t.logo_url, t.slug FROM tournament_standings ts JOIN teams t ON ts.team_id = t.id WHERE ts.tournament_id = ? ORDER BY pts DESC, dg DESC, gf DESC");
        $stmt->execute([$id]);
        $standings = $stmt->fetchAll();

        if (empty($standings)) {
            // Si está vacío, calculamos y guardamos por primera vez
            $standings = updateTournamentStandings($pdo, $id);
        }

        if ($returnOnly)
            return $standings;
        sendResponse($standings);
    } catch (Exception $e) {
        sendResponse(["error" => "Error al obtener posiciones: " . $e->getMessage()], 500);
    }
}

/**
 * Calcula y actualiza el caché de posiciones con lógica de H2H complejo
 */
function updateTournamentStandings($pdo, $id)
{
    // Nota: Se han eliminado las sentencias CREATE/ALTER TABLE de aquí porque
    // en MySQL provocan un "Implicit Commit", rompiendo las transacciones
    // de registerMatch y startTournament.

    // 2. Obtener todos los equipos e inicializar tabla base
    $stmtTeams = $pdo->prepare("SELECT t.id, t.name, t.logo_url FROM teams t JOIN tournament_participants tp ON t.id = tp.team_id WHERE tp.tournament_id = ? AND tp.is_waiting = 0 AND tp.deleted_at IS NULL");
    $stmtTeams->execute([$id]);
    $teams = $stmtTeams->fetchAll();

    $standings = [];
    foreach ($teams as $team) {
        $standings[$team['id']] = [
            'team_id' => $team['id'],
            'pj' => 0,
            'pg' => 0,
            'pe' => 0,
            'pp' => 0,
            'gf' => 0,
            'gc' => 0,
            'dg' => 0,
            'pts' => 0,
            'yellow_cards' => 0,
            'red_cards' => 0,
            'fair_play_score' => 0,
            'group_name' => null
        ];
    }

    // 3. Obtener partidos (incluyendo PENDING y SCHEDULED para extraer el grupo de los equipos)
    $stmtMatches = $pdo->prepare("SELECT * FROM matches WHERE tournament_id = ? AND status IN ('Played', 'Walkover', 'PENDING', 'SCHEDULED') AND deleted_at IS NULL");
    $stmtMatches->execute([$id]);
    $matches = $stmtMatches->fetchAll();

    // 4. Procesar resultados
    foreach ($matches as $m) {
        $h = $m['team_home_id'];
        $a = $m['team_away_id'];
        if (!isset($standings[$h]) || !isset($standings[$a]))
            continue;

        // Asignar grupo basado en el partido si no lo tiene
        if ($m['group_name']) {
            $standings[$h]['group_name'] = $m['group_name'];
            $standings[$a]['group_name'] = $m['group_name'];
        }

        // Si es PENDING sin score, o es SCHEDULED, solo contamos el grupo si existe
        if (strtoupper($m['status']) === 'SCHEDULED' || ($m['status'] === 'PENDING' && $m['score_home'] === null && $m['score_away'] === null)) {
            continue;
        }

        $standings[$h]['pj']++;
        $standings[$a]['pj']++;
        $standings[$h]['gf'] += (int) ($m['score_home'] ?? 0);
        $standings[$h]['gc'] += (int) ($m['score_away'] ?? 0);
        $standings[$a]['gf'] += (int) ($m['score_away'] ?? 0);
        $standings[$a]['gc'] += (int) ($m['score_home'] ?? 0);

        if ($m['score_home'] > $m['score_away']) {
            $standings[$h]['pg']++;
            $standings[$h]['pts'] += 3;
            $standings[$a]['pp']++;
        } elseif ($m['score_home'] < $m['score_away']) {
            $standings[$a]['pg']++;
            $standings[$a]['pts'] += 3;
            $standings[$h]['pp']++;
        } else {
            $standings[$h]['pe']++;
            $standings[$h]['pts'] += 1;
            $standings[$a]['pe']++;
            $standings[$a]['pts'] += 1;
        }
    }

    // 4b. Obtener conteo de tarjetas amarillas y rojas
    $stmtCards = $pdo->prepare("
        SELECT me.team_id, me.event, COUNT(*) as qty
        FROM match_events me
        JOIN matches m ON me.match_id = m.id
        WHERE m.tournament_id = ? 
          AND m.deleted_at IS NULL 
          AND m.status IN ('Played', 'Walkover', 'PENDING')
          AND NOT (m.status = 'PENDING' AND m.score_home IS NULL AND m.score_away IS NULL)
        GROUP BY me.team_id, me.event
    ");
    $stmtCards->execute([$id]);
    $cardEvents = $stmtCards->fetchAll();

    foreach ($cardEvents as $ce) {
        $tid = $ce['team_id'];
        if (isset($standings[$tid])) {
            if ($ce['event'] === 'YELLOW_CARD') {
                $standings[$tid]['yellow_cards'] += (int)$ce['qty'];
            } elseif ($ce['event'] === 'RED_CARD') {
                $standings[$tid]['red_cards'] += (int)$ce['qty'];
            }
        }
    }

    // 5. Calcular DG y Fair Play Score
    foreach ($standings as &$s) {
        $s['dg'] = $s['gf'] - $s['gc'];
        $s['fair_play_score'] = ($s['yellow_cards'] * 1) + ($s['red_cards'] * 3);
    }
    unset($s);

    // 6. Ordenar y Guardar en Caché
    $pdo->prepare("DELETE FROM tournament_standings WHERE tournament_id = ?")->execute([$id]);
    $stmtInsert = $pdo->prepare("INSERT INTO tournament_standings (tournament_id, team_id, pj, pg, pe, pp, gf, gc, dg, pts, yellow_cards, red_cards, fair_play_score, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    // Convertir a array para ordenar
    $standingsList = array_values($standings);
    usort($standingsList, function ($a, $b) {
        // Primero por grupo si existen
        if ($a['group_name'] !== $b['group_name']) {
            return strcmp($a['group_name'], $b['group_name']);
        }
        if ($b['pts'] !== $a['pts'])
            return $b['pts'] - $a['pts'];
        if ($b['dg'] !== $a['dg'])
            return $b['dg'] - $a['dg'];
        return $b['gf'] - $a['gf'];
    });

    $finalStandings = [];
    foreach ($standingsList as $s) {
        $stmtInsert->execute([$id, $s['team_id'], $s['pj'], $s['pg'], $s['pe'], $s['pp'], $s['gf'], $s['gc'], $s['dg'], $s['pts'], $s['yellow_cards'], $s['red_cards'], $s['fair_play_score'], $s['group_name']]);

        // Obtener info del equipo para el retorno
        $stmtT = $pdo->prepare("SELECT name, logo_url, slug FROM teams WHERE id = ?");
        $stmtT->execute([$s['team_id']]);
        $tInfo = $stmtT->fetch();

        $s['name'] = $tInfo['name'] ?? 'Equipo Desconocido';
        $s['logo_url'] = $tInfo['logo_url'] ?? null;
        $s['slug'] = $tInfo['slug'] ?? '';
        $finalStandings[] = $s;
    }

    return $finalStandings;
}
?>