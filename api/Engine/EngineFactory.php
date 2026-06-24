<?php
require_once 'LigaEngine.php';
require_once 'CopaEngine.php';
require_once 'SuizoEngine.php';
require_once 'HibridoEngine.php';

class EngineFactory
{
    public static function getEngine($pdo, $tournamentId)
    {
        $stmt = $pdo->prepare("SELECT structure FROM tournaments WHERE id = ?");
        $stmt->execute([$tournamentId]);
        $structure = strtolower($stmt->fetchColumn());

        switch ($structure) {
            case 'liga':
                return new LigaEngine($pdo, $tournamentId);
            case 'copa':
                return new CopaEngine($pdo, $tournamentId);
            case 'suizo':
                return new SuizoEngine($pdo, $tournamentId);
            case 'híbrido':
            case 'hibrido':
                return new HibridoEngine($pdo, $tournamentId);
            default:
                throw new Exception("Estructura de torneo no soportada: $structure");
        }
    }
}
