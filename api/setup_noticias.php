<?php
require_once 'db.php';

try {
    // Crear tabla noticias
    $sql = "CREATE TABLE IF NOT EXISTS noticias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titular VARCHAR(255) NOT NULL,
        bajada TEXT,
        foto VARCHAR(255),
        texto LONGTEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        es_titular TINYINT(1) DEFAULT 0,
        categoria VARCHAR(50) DEFAULT 'General',
        INDEX (es_titular),
        INDEX (fecha)
    )";
    
    $pdo->exec($sql);
    echo "Tabla 'noticias' creada o ya existía.\n";

    // Insertar datos de prueba si la tabla está vacía
    $stmt = $pdo->query("SELECT COUNT(*) FROM noticias");
    if ($stmt->fetchColumn() == 0) {
        $noticias = [
            [
                'titular' => '¡Bienvenidos al nuevo portal de Pancorazo!',
                'bajada' => 'Estamos emocionados de lanzar nuestra nueva sección de novedades para mantener a la comunidad informada.',
                'foto' => 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
                'texto' => '<p>Hoy es un día histórico para Pancorazo. Con el lanzamiento de esta sección, damos un paso más hacia la profesionalización de nuestra plataforma de cartas coleccionables.</p><p>Aquí encontrarás noticias sobre torneos, actualizaciones de cartas y mucho más.</p>',
                'es_titular' => 1,
                'categoria' => 'Anuncios'
            ],
            [
                'titular' => 'Gran Torneo Apertura 2024',
                'bajada' => 'Las inscripciones están abiertas para el evento más grande del año.',
                'foto' => 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
                'texto' => '<p>Prepárate para competir contra los mejores jugadores. El Torneo Apertura contará con premios increíbles y puntos para el Ranking Oficial.</p>',
                'es_titular' => 1,
                'categoria' => 'Torneos'
            ],
            [
                'titular' => 'Nuevas Cartas de Leyenda',
                'bajada' => 'Descubre a los nuevos ídolos que llegan a la colección.',
                'foto' => 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
                'texto' => '<p>La nueva expansión incluye 20 cartas legendarias que cambiarán el meta actual del juego.</p>',
                'es_titular' => 1,
                'categoria' => 'Colección'
            ],
            [
                'titular' => 'Entrevista exclusiva con el Campeón',
                'bajada' => 'Charlamos con el ganador del último Master sobre su estrategia.',
                'foto' => 'https://images.unsplash.com/photo-1511886929837-354d827aae26',
                'texto' => '<p>En una entrevista profunda, el campeón nos cuenta cómo construyó su mazo ganador y qué espera para la próxima temporada.</p>',
                'es_titular' => 1,
                'categoria' => 'Entrevistas'
            ]
        ];

        // Añadir algunas noticias normales para el grid
        for ($i = 1; $i <= 10; $i++) {
            $noticias[] = [
                'titular' => "Noticia de prueba $i",
                'bajada' => "Este es un resumen muy corto para la noticia de prueba número $i.",
                'foto' => "https://picsum.photos/seed/" . ($i + 10) . "/800/600",
                'texto' => "<p>Este es el cuerpo del texto para la noticia número $i. Contiene información relevante sobre el mundo de Pancorazo.</p>",
                'es_titular' => 0,
                'categoria' => 'Comunidad'
            ];
        }

        $stmt = $pdo->prepare("INSERT INTO noticias (titular, bajada, foto, texto, es_titular, categoria) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($noticias as $n) {
            $stmt->execute([$n['titular'], $n['bajada'], $n['foto'], $n['texto'], $n['es_titular'], $n['categoria']]);
        }
        echo "Datos de prueba insertados.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
