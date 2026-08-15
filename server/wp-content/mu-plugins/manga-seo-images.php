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
        'Allow: /wp-content/uploads/',
        '',
        'User-agent: Googlebot-Image',
        'Allow: /wp-content/uploads/',
        '',
        'Sitemap: https://mangamukai.com/sitemap.xml',
        'Sitemap: https://mangamukai.com/sitemap-react.xml',
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
