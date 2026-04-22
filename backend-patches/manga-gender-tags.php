<?php
/**
 * manga-gender-tags.php
 *
 * INSTRUCCIONES:
 * 1. Sube este archivo a la carpeta raíz de WordPress (donde está wp-config.php).
 * 2. Accede: https://mangamukai.com/manga-gender-tags.php?secret=mukai_gender_2024_secure
 * 3. El script crea los términos "Mujer" y "Hombre" en la taxonomía 'genres'
 *    y los asigna a cada manga según sus géneros existentes.
 * 4. BORRA el archivo del servidor cuando termine.
 */

define('SECRET_KEY', 'mukai_gender_2024_secure');

$secret = $_GET['secret'] ?? '';
if ($secret !== SECRET_KEY) {
    http_response_code(403);
    die('Acceso denegado.');
}

require_once __DIR__ . '/wp-load.php';

set_time_limit(0);
header('Content-Type: text/plain; charset=utf-8');
ob_implicit_flush(true);
ob_end_flush();

// ---------------------------------------------------------------------------
// Géneros que indican MUJER (en español, tal como están en la BD)
// ---------------------------------------------------------------------------
$GENEROS_MUJER = [
    'romance', 'romance obsesivo', 'romance escolar', 'romance erótico',
    'romance tl', 'drama', 'reencarnación', 'reencarnacion',
    'comedia', 'protagonista femenina fuerte', 'harén inverso', 'haren inverso',
    'madre', 'madrastra', 'niños', 'ninos', 'bebés', 'bebes',
    'otome', 'gl', 'yuri', 'industry', 'industria del entretenimiento',
    'ceo', 'presidente', 'trabajo de oficina', 'vampiros', 'vampiro',
    'castigo', 'manhwa',
];

// ---------------------------------------------------------------------------
// Géneros que indican HOMBRE
// ---------------------------------------------------------------------------
$GENEROS_HOMBRE = [
    'harem', 'acción', 'accion', 'action', 'deportes', 'sports',
    'manga juvenil de acción', 'manga juvenil de accion',
    'shounen', 'shonen', 'seinen', 'mecha', 'batalla',
];

// ---------------------------------------------------------------------------
// Crear / obtener término en la taxonomía 'genres'
// ---------------------------------------------------------------------------
function obtener_o_crear_genero(string $nombre): int {
    $term = get_term_by('name', $nombre, 'genres');
    if ($term) return (int) $term->term_id;
    $r = wp_insert_term($nombre, 'genres');
    if (is_wp_error($r)) {
        echo "ERROR creando término '{$nombre}': " . $r->get_error_message() . "\n";
        return 0;
    }
    echo "Término creado: '{$nombre}' (ID {$r['term_id']})\n";
    return (int) $r['term_id'];
}

$ID_MUJER  = obtener_o_crear_genero('Mujer');
$ID_HOMBRE = obtener_o_crear_genero('Hombre');

if (!$ID_MUJER || !$ID_HOMBRE) die("Error creando términos.\n");

// ---------------------------------------------------------------------------
// Procesar todos los mangas
// ---------------------------------------------------------------------------
$mangas = get_posts([
    'post_type'      => 'manga',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'fields'         => 'ids',
    'no_found_rows'  => true,
]);

echo "Total mangas a procesar: " . count($mangas) . "\n\n";

$procesados = 0;
$asignados  = ['Mujer' => 0, 'Hombre' => 0, 'Ambos' => 0, 'Sin datos' => 0];

foreach ($mangas as $manga_id) {
    $procesados++;

    // Géneros actuales del manga
    $terms     = wp_get_post_terms($manga_id, 'genres', ['fields' => 'all']);
    $ids_act   = array_map(fn($t) => $t->term_id, $terms);
    $names_low = array_map(fn($t) => mb_strtolower($t->name), $terms);

    $tiene_mujer  = in_array($ID_MUJER,  $ids_act, true);
    $tiene_hombre = in_array($ID_HOMBRE, $ids_act, true);

    // Ya tiene los dos → saltar
    if ($tiene_mujer && $tiene_hombre) continue;

    $es_mujer  = $tiene_mujer  || array_intersect($names_low, $GENEROS_MUJER)  !== [];
    $es_hombre = $tiene_hombre || array_intersect($names_low, $GENEROS_HOMBRE) !== [];

    // Si no hay géneros claros → revisar descripción del post
    if (!$es_mujer && !$es_hombre) {
        $post    = get_post($manga_id);
        $desc    = mb_strtolower($post->post_content ?? '');
        $titulo  = mb_strtolower($post->post_title ?? '');
        $palabras_mujer  = ['princesa','duquesa','condesa','reina','dama','protagonista','amor','enamorad','romance','ella '];
        $palabras_hombre = ['guerrero','caballero','espadachin','sistema','nivel','dungeon','monstruo','héroe'];
        foreach ($palabras_mujer  as $p) { if (str_contains($desc.$titulo, $p)) { $es_mujer  = true; break; } }
        foreach ($palabras_hombre as $p) { if (str_contains($desc.$titulo, $p)) { $es_hombre = true; break; } }
    }

    // Default: si no se detecta nada, asignar Mujer (el 95% de esta BD es femenino)
    if (!$es_mujer && !$es_hombre) $es_mujer = true;

    $nuevos = [];
    if ($es_mujer  && !$tiene_mujer)  $nuevos[] = $ID_MUJER;
    if ($es_hombre && !$tiene_hombre) $nuevos[] = $ID_HOMBRE;

    if (!empty($nuevos)) {
        wp_set_object_terms($manga_id, array_merge($ids_act, $nuevos), 'genres', false);
        $titulo     = get_the_title($manga_id);
        $genero_str = implode('+', array_map(fn($id) => ($id === $ID_MUJER ? 'Mujer' : 'Hombre'), $nuevos));
        echo "  [{$procesados}] #{$manga_id} → {$genero_str} | {$titulo}\n";

        if ($es_mujer && $es_hombre)    $asignados['Ambos']++;
        elseif ($es_mujer)              $asignados['Mujer']++;
        else                            $asignados['Hombre']++;
    }
}

echo "\n=== COMPLETADO ===\n";
echo "Procesados : {$procesados}\n";
foreach ($asignados as $k => $v) echo "{$k}: {$v}\n";

// Limpiar caché del catálogo para que se regenere
delete_transient('mm_catalog_v1');
echo "\nCaché del catálogo limpiada.\n";
echo "\nBORRA ESTE ARCHIVO DEL SERVIDOR.\n";
