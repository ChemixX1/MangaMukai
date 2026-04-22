<?php
/**
 * manga-gender-tags.php
 *
 * INSTRUCCIONES:
 * 1. Sube este archivo a la carpeta raíz de WordPress (donde está wp-config.php).
 * 2. Accede desde el navegador: https://mangamukai.com/manga-gender-tags.php?secret=CAMBIA_ESTO
 * 3. El script crea los tags "Hombre" y "Mujer" si no existen y los asigna
 *    a cada post según sus tags de género actuales.
 * 4. Borra el archivo del servidor cuando termine.
 *
 * SEGURIDAD: cambia SECRET_KEY antes de subir.
 */

define('SECRET_KEY', 'mukai_gender_2024_secure');

// --- Autenticación básica ---
$secret = $_GET['secret'] ?? '';
if ($secret !== SECRET_KEY) {
    http_response_code(403);
    die('Acceso denegado.');
}

// Cargar WordPress
require_once __DIR__ . '/wp-load.php';

// Tiempo sin límite para proceso largo
set_time_limit(0);

// Salida inmediata en el navegador
ob_implicit_flush(true);
ob_end_flush();
header('Content-Type: text/plain; charset=utf-8');

// ---------------------------------------------------------------------------
// Géneros que indican contenido para MUJER
// ---------------------------------------------------------------------------
$GENEROS_MUJER = [
    'shoujo', 'shojo', 'josei', 'romance', 'yaoi', 'bl', 'boys love',
    'boys-love', 'shounen ai', 'shounen-ai', 'yuri', 'gl', 'girls love',
    'girls-love', 'otome', 'slice of life', 'slice-of-life',
];

// ---------------------------------------------------------------------------
// Géneros que indican contenido para HOMBRE
// ---------------------------------------------------------------------------
$GENEROS_HOMBRE = [
    'shounen', 'shonen', 'seinen', 'ecchi', 'harem', 'isekai',
    'acción', 'accion', 'action', 'aventura', 'adventure', 'mecha',
    'deportes', 'sports', 'super poderes', 'super-poderes',
];

// ---------------------------------------------------------------------------
// Crear / obtener IDs de los tags globales
// ---------------------------------------------------------------------------
function obtener_o_crear_tag(string $nombre): int {
    $term = get_term_by('name', $nombre, 'post_tag');
    if ($term) return (int) $term->term_id;
    $r = wp_insert_term($nombre, 'post_tag');
    if (is_wp_error($r)) {
        echo "ERROR creando tag '{$nombre}': " . $r->get_error_message() . "\n";
        return 0;
    }
    echo "Tag creado: '{$nombre}' (ID {$r['term_id']})\n";
    return (int) $r['term_id'];
}

$ID_MUJER  = obtener_o_crear_tag('Mujer');
$ID_HOMBRE = obtener_o_crear_tag('Hombre');

if (!$ID_MUJER || !$ID_HOMBRE) {
    die("No se pudieron crear los tags de género.\n");
}

// ---------------------------------------------------------------------------
// Procesar todos los posts en lotes
// ---------------------------------------------------------------------------
$pagina    = 1;
$por_pagina = 50;
$procesados = 0;
$asignados  = 0;

echo "=== Iniciando asignación de tags de género ===\n\n";

do {
    $args = [
        'post_type'      => 'post',
        'post_status'    => 'publish',
        'posts_per_page' => $por_pagina,
        'paged'          => $pagina,
        'fields'         => 'ids',
    ];
    $query = new WP_Query($args);
    $ids   = $query->posts;

    if (empty($ids)) break;

    foreach ($ids as $post_id) {
        $procesados++;

        // Obtener tags actuales del post como strings
        $tags_actuales = wp_get_post_tags($post_id, ['fields' => 'names']);
        $tags_lower    = array_map('mb_strtolower', $tags_actuales);
        $tag_ids_act   = wp_get_post_tags($post_id, ['fields' => 'ids']);

        // Evitar duplicar si el tag ya está asignado
        $tiene_mujer  = in_array($ID_MUJER,  $tag_ids_act, true);
        $tiene_hombre = in_array($ID_HOMBRE, $tag_ids_act, true);

        if ($tiene_mujer && $tiene_hombre) {
            // Ya tiene ambos — saltar
            continue;
        }

        // Determinar género basándose en los tags existentes
        $es_mujer  = false;
        $es_hombre = false;

        foreach ($tags_lower as $t) {
            if (!$es_mujer  && in_array($t, $GENEROS_MUJER,  true)) $es_mujer  = true;
            if (!$es_hombre && in_array($t, $GENEROS_HOMBRE, true)) $es_hombre = true;
        }

        // Si no se detectó género por tags, intentar con categorías
        if (!$es_mujer && !$es_hombre) {
            $cats = wp_get_post_categories($post_id, ['fields' => 'names']);
            foreach (array_map('mb_strtolower', $cats) as $c) {
                if (!$es_mujer  && in_array($c, $GENEROS_MUJER,  true)) $es_mujer  = true;
                if (!$es_hombre && in_array($c, $GENEROS_HOMBRE, true)) $es_hombre = true;
            }
        }

        // Añadir los tags que correspondan (append = true para no borrar existentes)
        $nuevos = [];
        if ($es_mujer  && !$tiene_mujer)  $nuevos[] = $ID_MUJER;
        if ($es_hombre && !$tiene_hombre) $nuevos[] = $ID_HOMBRE;

        if (!empty($nuevos)) {
            wp_set_post_tags($post_id, array_merge($tag_ids_act, $nuevos), false);
            $titulo = get_the_title($post_id);
            $genero_str = implode('+', array_map(
                fn($id) => ($id === $ID_MUJER ? 'Mujer' : 'Hombre'),
                $nuevos
            ));
            echo "  [{$procesados}] Post #{$post_id} → {$genero_str} | {$titulo}\n";
            $asignados++;
        }
    }

    echo "\n--- Lote {$pagina} procesado ({$procesados} posts hasta ahora) ---\n\n";
    $pagina++;

} while (count($ids) === $por_pagina);

echo "\n=== COMPLETADO ===\n";
echo "Posts procesados : {$procesados}\n";
echo "Tags asignados   : {$asignados}\n";
echo "\nBORRA ESTE ARCHIVO DEL SERVIDOR.\n";
