<?php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

function create_slug($text)
{
    if (!$text) return '';
    $text = mb_strtolower($text, 'UTF-8');
    $unwanted_array = array('á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n', 'ü' => 'u', 'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u', 'Ñ' => 'n', 'Ü' => 'u');
    $text = strtr($text, $unwanted_array);
    $text = preg_replace('/[^a-z0-9]/', '-', $text);
    $text = preg_replace('/-+/', '-', $text);
    return trim($text, '-');
}

if ($method !== 'GET') {
    sendResponse(["error" => "Método no permitido"], 405);
}

$season = $_GET['season'] ?? null;
$mode = $_GET['mode'] ?? 'community';

try {
    // Consulta para obtener el Salón de la Fama
    // Categorización basada en organizer_id:
    // KO - Kick On Oficial
    // KOIV - Kick On IV Región
    // KOV - Kick On V Región
    // KOM - Kick On Metropolitana
    // Novatos - Novatos
    // Otros - Otros

    $params = [];
    $whereClause = "WHERE tp.position = 1 AND t.deleted_at IS NULL AND COALESCE(t.legacy, 0) != 1 AND COALESCE(t.structure, '') != 'legacy'";

    // No limitamos el ranking por $mode para poder mostrar todas las columnas oficiales y no oficiales requeridas.

    if ($season === 'last90') {
        $activeSeasonStmt = $pdo->query("SELECT name FROM seasons WHERE is_active = 1 LIMIT 1");
        $activeSeason = $activeSeasonStmt->fetchColumn();
        if ($activeSeason) {
            $whereClause .= " AND t.season = :active_season";
            $params[':active_season'] = $activeSeason;
        } else {
            $whereClause .= " AND t.season = 'NINGUNA_TEMPORADA_ACTIVA'";
        }
    } elseif ($season) {
        $whereClause .= " AND t.season = :season";
        $params[':season'] = $season;
    }

    $sql = "
        SELECT 
            team_id,
            team_name,
            team_logo,
            team_slug,
            SUM(CASE WHEN is_jo = 1 THEN 1 ELSE 0 END) as official_trophies,
            SUM(CASE WHEN is_jo = 1 AND (tournament_type = 'barrio' OR tournament_level = 'barrio') THEN 1 ELSE 0 END) as ko_barrio_trophies,
            SUM(CASE WHEN is_jo = 1 AND (tournament_type = 'ascenso' OR tournament_level = 'ascenso') THEN 1 ELSE 0 END) as ko_ascenso_trophies,
            SUM(CASE WHEN is_jo = 1 AND (tournament_type = 'oro' OR tournament_level = 'oro') THEN 1 ELSE 0 END) as ko_oro_trophies,
            SUM(CASE WHEN is_jo = 0 THEN 1 ELSE 0 END) as comunidad_trophies,
            COUNT(*) as total_trophies,
            MAX(played_at) as last_trophy_date
        FROM (
            SELECT 
                tp.team_id,
                teams.name as team_name,
                teams.logo_url as team_logo,
                teams.slug as team_slug,
                t.end_date as played_at,
                t.is_jo,
                t.tournament_type,
                t.tournament_level,
                t.organizer_id
            FROM tournament_podiums tp
            JOIN tournaments t ON tp.tournament_id = t.id
            JOIN teams ON tp.team_id = teams.id
            $whereClause
        ) as winners
        GROUP BY team_id, team_name, team_logo, team_slug
        ORDER BY official_trophies DESC, ko_oro_trophies DESC, ko_ascenso_trophies DESC, ko_barrio_trophies DESC, total_trophies DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();

    $hallOfFame = [];
    $rank = 1;
    foreach ($results as $row) {
        // Calcular tiempo relativo para lastTrophy
        $lastTrophyStr = "Hace tiempo";
        if ($row['last_trophy_date']) {
            $time = strtotime($row['last_trophy_date']);
            $diff = time() - $time;
            $days = floor($diff / 86400);

            if ($diff < 3600) {
                $lastTrophyStr = "Hace poco";
            } elseif ($diff < 86400) {
                $lastTrophyStr = "Hace 1 día";
            } elseif ($days < 30) {
                $lastTrophyStr = "Hace " . $days . " días";
            } elseif ($days < 365) {
                $months = floor($days / 30);
                $lastTrophyStr = "Hace " . $months . " mes" . ($months > 1 ? "es" : "");
            } else {
                $years = floor($days / 365);
                $lastTrophyStr = "Hace más de " . $years . " año" . ($years > 1 ? "s" : "");
            }
        }

        $hallOfFame[] = [
            "rank" => $rank++,
            "teamName" => $row['team_name'],
            "teamSlug" => $row['team_slug'] ?? create_slug($row['team_name']),
            "division" => "CLUB VERIFICADO",
            "avatarUrl" => $row['team_logo'] ?: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . ($row['team_slug'] ?? $row['team_id']),
            "isVerified" => true,
            "trophies" => [
                "official" => (int) $row['official_trophies'],
                "ko_barrio" => (int) $row['ko_barrio_trophies'],
                "ko_ascenso" => (int) $row['ko_ascenso_trophies'],
                "ko_oro" => (int) $row['ko_oro_trophies'],
                "comunidad" => (int) $row['comunidad_trophies'],
                "total" => (int) $row['total_trophies']
            ],
            "lastTrophy" => $lastTrophyStr
        ];
    }

    // Obtener estadísticas globales de uso para el Header
    $stats = [
        'globalTournaments' => 0,
        'globalTournamentsTrend' => 0,
        'globalMatches' => 0,
        'globalMatchesTrend' => 0,
        'officialTournaments' => 0,
        'officialTournamentsTrend' => 0,
    ];

    try {
        $statsWhereT = "deleted_at IS NULL";
        $statsWhereM = "deleted_at IS NULL";

        if ($mode === 'official') {
            $statsWhereT .= " AND is_jo = 1";
            $statsWhereM .= " AND tournament_id IN (SELECT id FROM tournaments WHERE is_jo = 1)";
        }

        // Total Torneos
        $stmtT = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN end_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as trend FROM tournaments WHERE $statsWhereT");
        $resT = $stmtT->fetch(PDO::FETCH_ASSOC);
        $stats['globalTournaments'] = (int)($resT['total'] ?? 0);
        $stats['globalTournamentsTrend'] = (int)($resT['trend'] ?? 0);

        // Total Partidos
        $stmtM = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as trend FROM matches WHERE $statsWhereM");
        $resM = $stmtM->fetch(PDO::FETCH_ASSOC);
        $stats['globalMatches'] = (int)($resM['total'] ?? 0);
        $stats['globalMatchesTrend'] = (int)($resM['trend'] ?? 0);

        // Torneos Oficiales (JO)
        $stmtJ = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN end_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as trend FROM tournaments WHERE is_jo = 1 AND deleted_at IS NULL");
        $resJ = $stmtJ->fetch(PDO::FETCH_ASSOC);
        $stats['officialTournaments'] = (int)($resJ['total'] ?? 0);
        $stats['officialTournamentsTrend'] = (int)($resJ['trend'] ?? 0);
    } catch (Exception $ext) {
        $stats['error'] = $ext->getMessage();
    }

    sendResponse([
        "stats" => $stats,
        "ranking" => $hallOfFame
    ]);

} catch (PDOException $e) {
    sendResponse(["error" => "Error al obtener Salón de la Fama: " . $e->getMessage()], 500);
}
