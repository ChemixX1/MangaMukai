<?php

$wp_root = dirname(__FILE__, 2);
if (!file_exists($wp_root . '/wp-load.php')) {
    http_response_code(503);
    exit;
}

require_once $wp_root . '/wp-load.php';
require_once __DIR__ . '/seo-common.php';
$page = max(1, absint($_GET['page'] ?? 1));
$per_page = 5000;

$cache_file = sys_get_temp_dir() . '/mm_manga_image_sitemap_' . filemtime(__FILE__) . '_' . filemtime(__DIR__ . '/seo-config.json') . '_' . $page . '.xml';
$cache_ttl = HOUR_IN_SECONDS;

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    header('Content-Type: application/xml; charset=UTF-8');
    header('Cache-Control: public, max-age=' . $cache_ttl);
    header('X-Robots-Tag: noindex, follow');
    readfile($cache_file);
    exit;
}

global $wpdb;
$mangas = $wpdb->get_results($wpdb->prepare(
    "SELECT m.ID, GREATEST(m.post_modified_gmt, COALESCE(c.modified, m.post_modified_gmt)) AS modified
     FROM {$wpdb->posts} m
     LEFT JOIN (
         SELECT CAST(pm.meta_value AS UNSIGNED) AS manga_id, MAX(p.post_modified_gmt) AS modified
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key = 'ero_seri'
         WHERE p.post_type = 'post' AND p.post_status = 'publish'
         GROUP BY CAST(pm.meta_value AS UNSIGNED)
     ) c ON c.manga_id = m.ID
     WHERE m.post_type = 'manga' AND m.post_status = 'publish'
     ORDER BY m.ID ASC LIMIT %d OFFSET %d",
    $per_page, ($page - 1) * $per_page
));
if ($page > 1 && !$mangas) { http_response_code(404); exit; }

$xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
$xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
$xml .= '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

// Static pages have no trustworthy content timestamp: omit lastmod.
if ($page === 1) foreach (array_keys(mm_seo_config()['routes']) as $static_path) {
    $xml .= "  <url>\n";
    $xml .= '    <loc>' . esc_xml('https://mangamukai.com' . $static_path) . "</loc>\n";
    $xml .= "  </url>\n";
}

foreach ($mangas as $manga) {
    $url = 'https://mangamukai.com/manga/' . $manga->ID;
    $modified = mm_seo_date($manga->modified);
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

    if (!$cover_url && is_string($legacy_cover) && filter_var($legacy_cover, FILTER_VALIDATE_URL)) $cover_url = $legacy_cover;

    $xml .= "  <url>\n";
    $xml .= '    <loc>' . esc_xml($url) . "</loc>\n";
    if ($modified) $xml .= '    <lastmod>' . esc_xml($modified) . "</lastmod>\n";

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
