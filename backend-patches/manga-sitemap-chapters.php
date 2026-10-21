<?php

$wp_root = dirname(__FILE__, 2);
if (!file_exists($wp_root . '/wp-load.php')) {
    http_response_code(503);
    exit;
}

require_once $wp_root . '/wp-load.php';
require_once __DIR__ . '/seo-common.php';

$site_url = 'https://mangamukai.com';
$per_page = 5000;
$page = isset($_GET['page']) ? absint($_GET['page']) : 0;

$cache_file = sys_get_temp_dir() . '/mm_chapter_sitemap_' . filemtime(__FILE__) . '_' . $page . '.xml';
$cache_ttl = HOUR_IN_SECONDS;

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    header('Content-Type: application/xml; charset=UTF-8');
    header('Cache-Control: public, max-age=' . $cache_ttl);
    header('X-Robots-Tag: noindex, follow');
    readfile($cache_file);
    exit;
}

global $wpdb;

$from = "FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key = 'ero_seri'
         INNER JOIN {$wpdb->posts} m ON m.ID = pm.meta_value AND m.post_type = 'manga' AND m.post_status = 'publish'
         WHERE p.post_type = 'post' AND p.post_status = 'publish'";

if ($page < 1) {
    $total = (int) $wpdb->get_var("SELECT COUNT(*) {$from}");
    $pages = max(1, (int) ceil($total / $per_page));

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    for ($index = 1; $index <= $pages; $index++) {
        $xml .= "  <sitemap>\n";
        $xml .= '    <loc>' . esc_xml($site_url . '/sitemap-chapters-' . $index . '.xml') . "</loc>\n";
        // Per-file modification dates are unknown; do not copy one global date.
        $xml .= "  </sitemap>\n";
    }
    $xml .= "</sitemapindex>\n";
} else {
    $offset = ($page - 1) * $per_page;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT p.ID, p.post_modified_gmt {$from} ORDER BY p.ID ASC LIMIT %d OFFSET %d",
        $per_page,
        $offset
    ));

    if (!$rows && $page > 1) { http_response_code(404); exit; }
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($rows as $row) {
        $xml .= "  <url>\n";
        $xml .= '    <loc>' . esc_xml($site_url . '/read/' . (int) $row->ID) . "</loc>\n";
        $modified = mm_seo_date($row->post_modified_gmt);
        if ($modified) $xml .= '    <lastmod>' . esc_xml($modified) . "</lastmod>\n";
        $xml .= "  </url>\n";
    }
    $xml .= "</urlset>\n";
}

@file_put_contents($cache_file, $xml, LOCK_EX);

header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=' . $cache_ttl);
header('X-Robots-Tag: noindex, follow');
echo $xml;
