<?php
require_once 'db.php';
require_once 'deck_utils.php';

// Desactivar reporte de errores en el output para no romper el JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];

// Autoinicialización de tablas si no existen
function initTables($pdo) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS decks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            user_id INT NOT NULL,
            team_id INT DEFAULT NULL,
            is_active TINYINT(1) DEFAULT 0,
            likes INT DEFAULT 0,
            win_rate DECIMAL(5,2) DEFAULT 0.00,
            format VARCHAR(50) DEFAULT 'ESTÁNDAR',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Migraciones preventivas para tablas existentes
        $migrations = [
            "ALTER TABLE decks ADD COLUMN is_active TINYINT(1) DEFAULT 0 AFTER team_id",
            "ALTER TABLE decks ADD COLUMN likes INT DEFAULT 0 AFTER is_active",
            "ALTER TABLE decks ADD COLUMN win_rate DECIMAL(5,2) DEFAULT 0.00 AFTER likes",
            "ALTER TABLE decks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER win_rate",
            "ALTER TABLE decks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
            "ALTER TABLE decks ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT' AFTER team_id",
            "ALTER TABLE decks ADD COLUMN format VARCHAR(50) DEFAULT 'ESTÁNDAR' AFTER status"
        ];

        foreach ($migrations as $sql) {
            try {
                $pdo->exec($sql);
            } catch (Exception $e) {
                // La columna probablemente ya existe
            }
        }

        // Borramos tabla vieja si existe para forzar el nuevo esquema pedido por el usuario
        // Solo haz esto si estás seguro de que está en desarrollo, de lo contrario usa ALTER
        // Como el usuario pidió específicamente estas columnas, vamos a asegurar que existan así.
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS deck_cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            deck_id INT NOT NULL,
            card_id VARCHAR(50) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            zone VARCHAR(20) DEFAULT NULL,
            FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Tabla para registrar qué usuarios dan like a qué mazos
        $pdo->exec("CREATE TABLE IF NOT EXISTS deck_likes (
            deck_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (deck_id, user_id),
            FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Migración por si la tabla ya existía sin la columna quantity o zone
        try {
            $pdo->exec("ALTER TABLE deck_cards ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER card_id");
            $pdo->exec("ALTER TABLE deck_cards DROP COLUMN slot_type");
            $pdo->exec("ALTER TABLE deck_cards DROP COLUMN slot_index");
        } catch (Exception $e) {
            // Ya estaba migrada o no existía la vieja
        }

        try {
            $pdo->exec("ALTER TABLE deck_cards ADD COLUMN zone VARCHAR(20) DEFAULT NULL AFTER quantity");
        } catch (Exception $e) {
            // La columna ya existía
        }
    } catch (PDOException $e) {
        error_log("Error in initTables: " . $e->getMessage());
    }
}

initTables($pdo);

switch ($method) {
    case 'GET':
        if (isset($_GET['action'])) {
            if ($_GET['action'] === 'public') {
                getPublicDecks($pdo, $_GET['filter'] ?? 'TENDENCIAS', $_GET['limit'] ?? 10, $_GET['offset'] ?? 0, $_GET['user_id'] ?? null);
            } elseif ($_GET['action'] === 'top_cards') {
                getTopCards($pdo, $_GET['type'] ?? null);
            }
        } elseif (isset($_GET['id'])) {
            getDeckDetail($pdo, $_GET['id'], $_GET['user_id'] ?? null);
        } elseif (isset($_GET['user_id'])) {
            getUserDecks($pdo, $_GET['user_id'], $_GET['requester_id'] ?? null);
        } elseif (isset($_GET['team_id'])) {
            getTeamDecks($pdo, $_GET['team_id']);
        } else {
            sendResponse(["message" => "Faltan parámetros"], 400);
        }
        break;
    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] === 'like') {
            if (isset($_GET['id'])) {
                likeDeck($pdo, $_GET['id']);
            } else {
                sendResponse(["message" => "ID requerido"], 400);
            }
        } else {
            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data) {
                sendResponse(["message" => "Datos inválidos"], 400);
            }
            saveDeck($pdo, $data);
        }
        break;
    case 'DELETE':
        if (isset($_GET['id'])) {
            deleteDeck($pdo, $_GET['id']);
        } else {
            sendResponse(["message" => "ID requerido"], 400);
        }
        break;
    default:
        sendResponse(["message" => "Método no permitido"], 405);
        break;
}

function getDeckDetail($pdo, $id, $userId = null) {
    try {
        $selectHasLiked = "";
        if ($userId) {
            $selectHasLiked = ", (SELECT 1 FROM deck_likes dl WHERE dl.deck_id = d.id AND dl.user_id = " . (int)$userId . ") as has_liked";
        }
        $stmt = $pdo->prepare("SELECT d.*, u.username as author, u.profile_image as authorAvatar $selectHasLiked FROM decks d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?");
        $stmt->execute([$id]);
        $deck = $stmt->fetch();

        if (!$deck) {
            sendResponse(["error" => "Mazo no encontrado"], 404);
        }

        $stmt_cards = $pdo->prepare("SELECT dc.*, c.name, c.image_url, c.type, c.rarity, c.category, c.cost, c.stats_attack, c.stats_defense, c.nationality, c.shirt_color, c.ability, c.ability_text, c.is_fan
                                     FROM deck_cards dc 
                                     JOIN cards c ON dc.card_id = c.id 
                                     WHERE dc.deck_id = ?");
        $stmt_cards->execute([$id]);
        $deck['cards'] = $stmt_cards->fetchAll();
        $deck['is_locked'] = isDeckLocked($pdo, $id);

        sendResponse($deck);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener detalle: " . $e->getMessage()], 500);
    }
}

function getUserDecks($pdo, $userId, $requesterId = null) {
    try {
        $where = "d.user_id = ?";
        if ((string)$userId !== (string)$requesterId) {
            $where .= " AND (d.status = 'PUBLIC' OR (d.status IS NULL AND d.is_active = 1))";
        }
        $stmt = $pdo->prepare("SELECT d.*, 
                               (SELECT COUNT(*) FROM deck_cards dc WHERE dc.deck_id = d.id) as card_count 
                               FROM decks d 
                               WHERE $where 
                               ORDER BY d.updated_at DESC");
        $stmt->execute([$userId]);
        sendResponse($stmt->fetchAll());
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener mazos: " . $e->getMessage()], 500);
    }
}

function getTeamDecks($pdo, $teamId) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM decks WHERE team_id = ? AND (status = 'PUBLIC' OR is_active = 1) ORDER BY updated_at DESC");
        $stmt->execute([$teamId]);
        sendResponse($stmt->fetchAll());
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener mazos: " . $e->getMessage()], 500);
    }
}

function getPublicDecks($pdo, $filter, $limit, $offset, $userId = null) {
    try {
        $orderBy = "created_at DESC";
        if ($filter === 'MEJOR VALORADOS') {
            $orderBy = "likes DESC";
        } elseif ($filter === 'TENDENCIAS') {
            $orderBy = "win_rate DESC";
        }

        $limitInt = (int)$limit;
        $offsetInt = (int)$offset;

        $selectHasLiked = "";
        if ($userId) {
            $selectHasLiked = ", (SELECT 1 FROM deck_likes dl WHERE dl.deck_id = d.id AND dl.user_id = " . (int)$userId . ") as has_liked";
        }

        $sql = "SELECT d.*, u.username as author, u.profile_image as authorAvatar,
                               (SELECT COUNT(*) FROM deck_cards dc WHERE dc.deck_id = d.id) as card_count,
                               (SELECT c.image_url 
                                FROM deck_cards dc2 
                                JOIN cards c ON dc2.card_id = c.id 
                                WHERE dc2.deck_id = d.id 
                                ORDER BY 
                                    CASE c.rarity 
                                        WHEN 'LEYENDA' THEN 1 
                                        WHEN 'CLASE MUNDIAL' THEN 2 
                                        WHEN 'PROFESIONAL' THEN 3 
                                        ELSE 4 
                                    END ASC
                                LIMIT 1) as image_url
                               $selectHasLiked
                               FROM decks d
                               LEFT JOIN users u ON d.user_id = u.id
                               WHERE (d.status = 'PUBLIC' OR d.is_active = 1 OR d.status IS NULL OR d.status = '')
                               ORDER BY $orderBy
                               LIMIT $limitInt OFFSET $offsetInt";

        $stmt = $pdo->query($sql);
        $decks = $stmt->fetchAll();

        // Para cada mazo, calcular una distribución de costes ficticia o básica por ahora
        foreach ($decks as &$deck) {
            $deck['distribution'] = [rand(20, 80), rand(20, 80), rand(20, 80), rand(20, 80), rand(20, 80)];
            $deck['tag'] = strtoupper($deck['format'] ?: 'PICHANGA');
            $deck['winRate'] = number_format($deck['win_rate'] ?? 0, 1) . '%';
            
            // Obtener coste promedio considerando la cantidad de copias
            $stmt_avg = $pdo->prepare("SELECT SUM(c.cost * dc.quantity) / NULLIF(SUM(dc.quantity), 0) as avg_cost 
                                       FROM deck_cards dc 
                                       JOIN cards c ON dc.card_id = c.id 
                                       WHERE dc.deck_id = ?");
            $stmt_avg->execute([$deck['id']]);
            $avg = $stmt_avg->fetch();
            $deck['avgCost'] = number_format($avg['avg_cost'] ?? 0, 1);

            // Obtener las 4 cartas más valiosas (por rareza o cantidad)
            $stmt_cards = $pdo->prepare("SELECT c.id, c.name, c.image_url, c.rarity, dc.quantity 
                                         FROM deck_cards dc 
                                         JOIN cards c ON dc.card_id = c.id 
                                         WHERE dc.deck_id = ? 
                                         ORDER BY 
                                           CASE c.rarity 
                                             WHEN 'LEYENDA' THEN 1 
                                             WHEN 'Clase Mundial' THEN 2 
                                             WHEN 'PROFESIONAL' THEN 3 
                                             WHEN 'SEMIPROFESIONAL' THEN 4 
                                             WHEN 'AMATEUR' THEN 5 
                                             ELSE 6 
                                           END ASC, 
                                           dc.quantity DESC 
                                         LIMIT 4");
            $stmt_cards->execute([$deck['id']]);
            $deck['top_cards'] = $stmt_cards->fetchAll();
        }

        sendResponse($decks);
    } catch (Throwable $e) {
        sendResponse(["error" => "Error al obtener mazos públicos: " . $e->getMessage()], 500);
    }
}

function getTopCards($pdo, $type = null) {
    try {
        // 1. Obtener totales globales para porcentajes (Solo mazos que no son borradores)
        $stmt_total = $pdo->query("SELECT SUM(dc.quantity) as total 
                                   FROM deck_cards dc 
                                   JOIN decks d ON dc.deck_id = d.id 
                                   WHERE d.status != 'DRAFT'");
        $total_copies = $stmt_total->fetch()['total'] ?? 1;

        // 2. Obtener totales recientes (Últimos 7 días)
        $stmt_recent_total = $pdo->query("SELECT SUM(dc.quantity) as total 
                                          FROM deck_cards dc 
                                          JOIN decks d ON dc.deck_id = d.id 
                                          WHERE d.status != 'DRAFT' 
                                          AND d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $total_recent_copies = $stmt_recent_total->fetch()['total'] ?? 1;

        // 3. Preparar filtros por tipo
        $where = "WHERE d.status != 'DRAFT'";
        $params = [];
        if ($type && $type !== 'VER TODAS') {
            $where .= " AND (c.category = ? OR c.type = ?)";
            $params[] = $type;
            $params[] = $type;
        }

        // 4. Consulta principal: Ranking de cartas
        $sql = "SELECT dc.card_id as id, SUM(dc.quantity) as usage_count, 
                       c.name, c.image_url, c.rarity, c.cost, c.type, c.category,
                       AVG(d.win_rate) as avg_win_rate,
                       SUM(CASE WHEN d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN dc.quantity ELSE 0 END) as recent_usage_count
                FROM deck_cards dc
                JOIN cards c ON dc.card_id = c.id
                JOIN decks d ON dc.deck_id = d.id
                $where
                GROUP BY dc.card_id
                ORDER BY usage_count DESC
                LIMIT 10";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $cards = $stmt->fetchAll();
        
        foreach ($cards as &$card) {
            // A. Cálculo de RATING (Ignorando rareza: Base 60 + Uso + Winrate)
            $base = 60;
            
            // Bono por uso (hasta +20). Multiplicamos el porcentaje para que valores realistas (ej. 5-10% de share) alcancen un buen bono.
            $usage_pct = ($card['usage_count'] / max(1, $total_copies)) * 100;
            $usage_bonus = min(20, $usage_pct * 2); 
            
            // Bono por winrate (hasta +19 para que el máximo teórico sea 99). 100% winrate / 5.2 = ~19.2
            $winrate_bonus = ($card['avg_win_rate'] / 5.26); 

            $card['rating'] = min(99, round($base + $usage_bonus + $winrate_bonus));

            // B. Cálculo de USO (Volumen de copias %)
            $usage_rate = ($card['usage_count'] / $total_copies) * 100;
            $card['usageRate'] = number_format($usage_rate, 1) . '% USO';

            // C. Cálculo de TENDENCIA (Velocidad de creación)
            // Comparamos el "share" de uso reciente vs el "share" de uso histórico
            $historical_share = $card['usage_count'] / $total_copies;
            $recent_share = $total_recent_copies > 0 ? ($card['recent_usage_count'] / $total_recent_copies) : 0;
            
            // Si no hay datos recientes, la tendencia es 0
            if ($card['recent_usage_count'] == 0) {
                $card['isUp'] = false;
                $card['trend'] = '0.0%';
            } else {
                $diff = ($recent_share - $historical_share) * 100;
                $card['isUp'] = $diff >= 0;
                $card['trend'] = number_format(abs($diff), 1) . '%';
            }

            $card['imageUrl'] = $card['image_url'];
        }

        sendResponse($cards);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al obtener mejores cartas: " . $e->getMessage()], 500);
    }
}

function saveDeck($pdo, $data) {
    try {
        $pdo->beginTransaction();

        $id = $data['id'] ?? null;
        $name = $data['name'];
        $userId = $data['user_id'];
        $team_id = $data['team_id'] ?? null;
        $lastUpdatedAt = $data['last_updated_at'] ?? null;
        $force = isset($data['force']) && $data['force'] === true;

        if ($id && isDeckLocked($pdo, $id)) {
            $pdo->rollBack();
            sendResponse(["error" => "Este mazo está bloqueado y no puede editarse porque pertenece a un torneo finalizado."], 403);
            return;
        }

        // Optimistic Concurrency Control (Conflict Check)
        if ($id && !$force && $lastUpdatedAt) {
            $stmt_check = $pdo->prepare("SELECT updated_at FROM decks WHERE id = ?");
            $stmt_check->execute([(int)$id]);
            $db_updated_at = $stmt_check->fetchColumn();
            
            if ($db_updated_at) {
                $db_ts = strtotime($db_updated_at);
                $client_ts = strtotime($lastUpdatedAt);
                
                if ($db_ts > $client_ts + 1) {
                    $pdo->rollBack();
                    sendResponse([
                        "error" => "CONFLICT",
                        "message" => "El mazo en la nube es más reciente que tu versión local.",
                        "cloud_updated_at" => $db_updated_at
                    ], 409);
                    return;
                }
            }
        }
        
        // Manejo flexible de status (por compatibilidad con is_active antiguo si se desea)
        $status = $data['status'] ?? 'DRAFT';
        $format = $data['format'] ?? 'Pichanga';
        if (isset($data['is_active'])) {
            if ($data['is_active'] == 1 && $status === 'DRAFT') {
                $status = 'PUBLIC';
            }
        }
        $isActive = ($status === 'PUBLIC') ? 1 : 0;
        
        $cards = $data['cards'] ?? []; // Array de {card_id, slot_type}

        if ($id) {
            // Actualizar existente
            $stmt = $pdo->prepare("UPDATE decks SET name = ?, status = ?, format = ?, is_active = ?, team_id = ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$name, $status, $format, $isActive, $team_id, (int)$id, $userId]);
            
            // Limpiar cartas anteriores
            $stmt_del = $pdo->prepare("DELETE FROM deck_cards WHERE deck_id = ?");
            $stmt_del->execute([$id]);
            $deckId = $id;
        } else {
            // Crear nuevo
            $stmt = $pdo->prepare("INSERT INTO decks (name, user_id, team_id, status, format, is_active) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, (int)$userId, $team_id, $status, $format, $isActive]);
            $deckId = $pdo->lastInsertId();
        }

        // Agrupar cartas para guardar con quantity y zone
        $aggregatedCards = [];
        foreach ($cards as $card) {
            if (isset($card['card_id']) && $card['card_id'] !== null) {
                $cid = (string)$card['card_id'];
                $zone = isset($card['zone']) && !empty($card['zone']) ? (string)$card['zone'] : null;
                $key = $cid . '_' . ($zone ?? 'NULL');
                if (!isset($aggregatedCards[$key])) {
                    $aggregatedCards[$key] = [
                        'card_id' => $cid,
                        'zone' => $zone,
                        'quantity' => 0
                    ];
                }
                $aggregatedCards[$key]['quantity']++;
            }
        }

        // Insertar cartas agrupadas
        if (!empty($aggregatedCards)) {
            $stmt_ins = $pdo->prepare("INSERT INTO deck_cards (deck_id, card_id, quantity, zone) VALUES (?, ?, ?, ?)");
            foreach ($aggregatedCards as $item) {
                $stmt_ins->execute([ (int)$deckId, $item['card_id'], (int)$item['quantity'], $item['zone'] ]);
            }
        }

        // Obtener el nuevo updated_at
        $stmt_new_time = $pdo->prepare("SELECT updated_at FROM decks WHERE id = ?");
        $stmt_new_time->execute([(int)$deckId]);
        $new_updated_at = $stmt_new_time->fetchColumn();

        $pdo->commit();
        sendResponse([
            "message" => "Mazo guardado correctamente",
            "id" => $deckId,
            "updated_at" => $new_updated_at
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al guardar: " . $e->getMessage()], 500);
    }
}

function deleteDeck($pdo, $id) {
    try {
        if ($id && isDeckLocked($pdo, $id)) {
            sendResponse(["error" => "Este mazo está bloqueado y no puede eliminarse porque pertenece a un torneo finalizado."], 403);
            return;
        }
        // Asumiendo que hay una sesión para validar el dueño, pero aquí simplificamos
        $stmt = $pdo->prepare("DELETE FROM decks WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(["message" => "Mazo eliminado"]);
    } catch (PDOException $e) {
        sendResponse(["error" => "Error al eliminar: " . $e->getMessage()], 500);
    }
}

function likeDeck($pdo, $id) {
    try {
        $userId = $_GET['user_id'] ?? null;
        if (!$userId) {
            sendResponse(["error" => "Usuario requerido para dar like"], 400);
            return;
        }

        $pdo->beginTransaction();

        // Verificar si ya dio like
        $stmt_check = $pdo->prepare("SELECT 1 FROM deck_likes WHERE deck_id = ? AND user_id = ?");
        $stmt_check->execute([$id, $userId]);
        $hasLiked = $stmt_check->fetch();

        if ($hasLiked) {
            // Quitar like (Unlike)
            $stmt_del = $pdo->prepare("DELETE FROM deck_likes WHERE deck_id = ? AND user_id = ?");
            $stmt_del->execute([$id, $userId]);

            $stmt_upd = $pdo->prepare("UPDATE decks SET likes = GREATEST(0, likes - 1) WHERE id = ?");
            $stmt_upd->execute([$id]);

            $action = "unliked";
        } else {
            // Dar like
            $stmt_ins = $pdo->prepare("INSERT INTO deck_likes (deck_id, user_id) VALUES (?, ?)");
            $stmt_ins->execute([$id, $userId]);

            $stmt_upd = $pdo->prepare("UPDATE decks SET likes = likes + 1 WHERE id = ?");
            $stmt_upd->execute([$id]);

            $action = "liked";
        }

        $pdo->commit();
        sendResponse(["message" => "Operación exitosa", "action" => $action]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendResponse(["error" => "Error al procesar like: " . $e->getMessage()], 500);
    }
}
?>
