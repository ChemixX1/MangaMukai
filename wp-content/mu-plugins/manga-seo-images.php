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

        'Allow: /assets/',
        'Allow: /wp-content/uploads/',
        'Allow: /wp-includes/js/',

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
            && !preg_match('~/sitemap-react(?:-[0-9]+)?\.xml$~', $location);
    }));

    global $wpdb;
    $count = (int) $wpdb->get_var(
        "SELECT COUNT(*) FROM {$wpdb->posts}
         WHERE post_type = 'manga' AND post_status = 'publish'"
    );
    for ($page = 1; $page <= max(1, (int) ceil($count / 5000)); $page++) {
        $indexes[] = [
            'loc' => 'https://mangamukai.com/sitemap-react' . ($page === 1 ? '' : '-' . $page) . '.xml',
            'count' => min(5000, max(0, $count - ($page - 1) * 5000)) + ($page === 1 ? 14 : 0),
        ];
    }

    return $indexes;
}, 20);

function mm_seo_clear_caches() {
    $temp = sys_get_temp_dir();
    foreach (['/mm_route_*.html', '/mm_manga_image_sitemap_*.xml', '/mm_chapter_sitemap_*.xml'] as $pattern) {
        foreach ((array) glob($temp . $pattern) as $file) {
            @unlink($file);
        }
    }
}

add_action('save_post', static function ($post_id, $post) {
    if (!wp_is_post_revision($post_id) && in_array($post->post_type, ['manga', 'post'], true)) {
        mm_seo_clear_caches();
    }
}, 20, 2);
add_action('deleted_post', 'mm_seo_clear_caches');
add_action('set_object_terms', 'mm_seo_clear_caches');
