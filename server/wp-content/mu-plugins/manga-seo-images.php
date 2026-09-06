<?php
/**
 * Plugin Name: MangaMukai Image SEO
 * Description: Connects canonical React manga URLs and cover images to WordPress SEO.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

add_filter('robots_txt', static function ($output, $public) {
    if (!$public) {
        return "User-agent: *\nDisallow: /\n";
    }

    return implode("\n", [
        'User-agent: *',
        'Disallow: /wp-admin/',
        'Allow: /wp-admin/admin-ajax.php',
        // El renderizado de la SPA necesita los bundles: bloquearlos deja a
        // Googlebot con una pagina vacia.
        'Allow: /assets/',
        'Allow: /wp-content/uploads/',
        'Allow: /wp-includes/js/',
        // Rutas privadas: se dejan rastreables a proposito para que Google lea
        // la etiqueta noindex que envia manga-route-meta.php.
        '',
        'User-agent: Googlebot-Image',
        'Allow: /wp-content/uploads/',
        'Allow: /assets/',
        '',
        'Sitemap: https://mangamukai.com/sitemap.xml',
        'Sitemap: https://mangamukai.com/sitemap-react.xml',
        'Sitemap: https://mangamukai.com/sitemap-chapters.xml',
        '',
    ]);
}, PHP_INT_MAX, 2);

add_filter('aioseo_sitemap_indexes', static function ($indexes) {
    $ends_with = static function ($value, $suffix) {
        return $suffix === '' || substr($value, -strlen($suffix)) === $suffix;
    };

    $indexes = array_values(array_filter((array) $indexes, static function ($index) use ($ends_with) {
        $location = isset($index['loc']) ? (string) $index['loc'] : '';
        return !$ends_with($location, '/manga-sitemap.xml')
            && !$ends_with($location, '/sitemap-react.xml');
    }));

    global $wpdb;
    $count = (int) $wpdb->get_var(
        "SELECT COUNT(*) FROM {$wpdb->posts}
         WHERE post_type = 'manga' AND post_status = 'publish'"
    );
    $last_modified = $wpdb->get_var(
        "SELECT MAX(post_modified_gmt) FROM {$wpdb->posts}
         WHERE post_type = 'manga' AND post_status = 'publish'"
    );

    $indexes[] = [
        'loc' => 'https://mangamukai.com/sitemap-react.xml',
        'lastmod' => $last_modified ? mysql2date(DATE_W3C, $last_modified, false) : gmdate(DATE_W3C),
        'count' => $count,
    ];

    return $indexes;
}, 20);

add_action('save_post_manga', static function () {
    $cache_file = sys_get_temp_dir() . '/mm_manga_image_sitemap_v2.xml';
    if (file_exists($cache_file)) {
        unlink($cache_file);
    }
});

/**
 * Publicar o editar una serie o un capitulo invalida los head SEO cacheados por
 * manga-route-meta.php y los bloques del sitemap de capitulos, para que las
 * novedades entren en el indice sin esperar al TTL.
 */
add_action('save_post', static function ($post_id, $post) {
    if (wp_is_post_revision($post_id) || !in_array($post->post_type, ['manga', 'post'], true)) {
        return;
    }

    $temp = sys_get_temp_dir();
    foreach (['/mm_route_*.html', '/mm_chapter_sitemap_*.xml'] as $pattern) {
        foreach ((array) glob($temp . $pattern) as $file) {
            @unlink($file);
        }
    }
}, 20, 2);
