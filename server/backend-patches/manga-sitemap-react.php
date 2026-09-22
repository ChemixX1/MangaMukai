<?php
/**
 * Image sitemap for canonical React manga URLs.
 */

$wp_root = dirname(__FILE__, 2);
if (!file_exists($wp_root . '/wp-load.php')) {
    http_response_code(503);
    exit;
}

require_once $wp_root . '/wp-load.php';

$cache_file = sys_get_temp_dir() . '/mm_manga_image_sitemap_v2.xml';
$cache_ttl = HOUR_IN_SECONDS;

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    header('Content-Type: application/xml; charset=UTF-8');
    header('Cache-Control: public, max-age=' . $cache_ttl);
    header('X-Robots-Tag: noindex, follow');
    readfile($cache_file);
    exit;
}

global $wpdb;
$mangas = $wpdb->get_results(
    "SELECT ID, post_modified_gmt
     FROM {$wpdb->posts}
     WHERE post_type = 'manga' AND post_status = 'publish'
     ORDER BY post_modified_gmt DESC
     LIMIT 50000"
);

$xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
$xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
$xml .= '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

// Rutas fijas de la aplicacion React. Sin esto solo se envian fichas de manga y
// la portada y las colecciones dependen de que Google las descubra por enlaces.
$newest = $mangas ? mysql2date(DATE_W3C, $mangas[0]->post_modified_gmt, false) : gmdate(DATE_W3C);
foreach (['/', '/biblioteca', '/manga-19', '/manga-bn', '/nosotros', '/contacto', '/legal', '/privacidad', '/terminos', '/normas-comunidad', '/cookies'] as $static_path) {
    $xml .= "  <url>\n";
    $xml .= '    <loc>' . esc_xml('https://mangamukai.com' . $static_path) . "</loc>\n";
    $xml .= '    <lastmod>' . esc_xml($newest) . "</lastmod>\n";
    $xml .= "  </url>\n";
}

foreach ($mangas as $manga) {
    $url = 'https://mangamukai.com/manga/' . $manga->ID;
    $modified = mysql2date(DATE_W3C, $manga->post_modified_gmt, false);
    $cover_id = get_post_thumbnail_id($manga->ID);
    $custom_cover = get_post_meta($manga->ID, 'manga_cover', true);
    $legacy_cover = get_post_meta($manga->ID, 'ero_cover', true);

    if (!$cover_id && is_numeric($custom_cover)) {
        $cover_id = absint($custom_cover);
    }
    if (!$cover_id && is_numeric($legacy_cover)) {
        $cover_id = absint($legacy_cover);
    }

    $cover_url = $cover_id ? wp_get_attachment_url($cover_id) : '';
    if (!$cover_url && is_string($custom_cover) && filter_var($custom_cover, FILTER_VALIDATE_URL)) {
        $cover_url = $custom_cover;
    }

    $xml .= "  <url>\n";
    $xml .= '    <loc>' . esc_xml($url) . "</loc>\n";
    $xml .= '    <lastmod>' . esc_xml($modified) . "</lastmod>\n";

    if ($cover_url) {
        $xml .= "    <image:image>\n";
        $xml .= '      <image:loc>' . esc_xml(set_url_scheme($cover_url, 'https')) . "</image:loc>\n";
        $xml .= "    </image:image>\n";
    }

    $xml .= "  </url>\n";
}

$xml .= "</urlset>\n";
file_put_contents($cache_file, $xml, LOCK_EX);

header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=' . $cache_ttl);
header('X-Robots-Tag: noindex, follow');
echo $xml;
