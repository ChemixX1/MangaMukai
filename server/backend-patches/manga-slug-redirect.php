<?php
/**
 * Redirects legacy WordPress manga slugs to the canonical React manga URL.
 */

$wp_root = dirname(__FILE__, 2);
$index_file = $wp_root . '/index.html';

if (!file_exists($wp_root . '/wp-load.php') || !file_exists($index_file)) {
    http_response_code(503);
    exit;
}

require_once $wp_root . '/wp-load.php';

$slug = sanitize_title(wp_unslash($_GET['slug'] ?? ''));
$post = $slug ? get_page_by_path($slug, OBJECT, 'manga') : null;

if ($post && $post->post_status === 'publish') {
    header('Cache-Control: public, max-age=86400');
    wp_redirect('https://mangamukai.com/manga/' . $post->ID, 301, 'MangaMukai');
    exit;
}

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
readfile($index_file);
