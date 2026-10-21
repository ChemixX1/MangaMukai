<?php

$wp_root = dirname(__FILE__, 2);
$index_file = $wp_root . '/index.html';

if (!file_exists($wp_root . '/wp-load.php') || !file_exists($index_file)) {
    http_response_code(503);
    exit;
}

require_once $wp_root . '/wp-load.php';
require_once __DIR__ . '/seo-common.php';

$id = absint($_GET['id'] ?? 0);
$post = $id ? get_post($id) : null;

if (!$post || $post->post_type !== 'manga' || $post->post_status !== 'publish') {
    mm_seo_not_found($index_file, 'Historia no disponible');
}

$site_url = 'https://mangamukai.com';
$url = $site_url . '/manga/' . $post->ID;
$title = html_entity_decode(wp_strip_all_tags($post->post_title), ENT_QUOTES, 'UTF-8');
$seo_title = $title . ' | MangaMukai';
$synopsis = get_post_meta($post->ID, 'manga_description', true) ?: $post->post_content;
$synopsis = trim(preg_replace('/\s+/u', ' ', strip_shortcodes(wp_strip_all_tags($synopsis))));
$description = 'Lee ' . $title . ' en español en MangaMukai. ' . ($synopsis ?: 'Consulta su sinopsis y todos los capítulos disponibles.');
$description = mb_substr($description, 0, 200);

$cover_id = get_post_thumbnail_id($post->ID);
$custom_cover = get_post_meta($post->ID, 'manga_cover', true);
$legacy_cover = get_post_meta($post->ID, 'ero_cover', true);

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
if (!$cover_url) {
    $cover_url = $site_url . '/favicon.svg';
}
$cover_url = set_url_scheme($cover_url, 'https');

$width = 0;
$height = 0;
if ($cover_id) {
    $metadata = wp_get_attachment_metadata($cover_id);
    $width = isset($metadata['width']) ? absint($metadata['width']) : 0;
    $height = isset($metadata['height']) ? absint($metadata['height']) : 0;
}

$genres = [];
foreach (['wp-manga-genre', 'genres', 'category'] as $taxonomy) {
    $terms = get_the_terms($post->ID, $taxonomy);
    if ($terms && !is_wp_error($terms)) {
        $genres = array_merge($genres, wp_list_pluck($terms, 'name'));
    }
}
$genres = array_values(array_unique(array_filter($genres)));

$original_title = trim((string) get_post_meta($post->ID, 'ero_japanese', true));
$author = trim((string) get_post_meta($post->ID, 'ero_author', true));
$image_id = $url . '#primaryimage';
$book_id = $url . '#book';
$webpage_id = $url . '#webpage';

$image_object = [
    '@type' => 'ImageObject',
    '@id' => $image_id,
    'url' => $cover_url,
    'contentUrl' => $cover_url,
    'name' => 'Portada de ' . $title,
    'caption' => 'Portada de ' . $title . ' en MangaMukai',
    'representativeOfPage' => true,
];
if ($width) {
    $image_object['width'] = $width;
}
if ($height) {
    $image_object['height'] = $height;
}

$book = [
    '@type' => 'Book',
    '@id' => $book_id,
    'name' => $title,
    'description' => $description,
    'url' => $url,
    'image' => ['@id' => $image_id],
    'inLanguage' => 'es',
    'datePublished' => mm_seo_date($post->post_date_gmt),
    'dateModified' => mm_seo_date($post->post_modified_gmt),
    'publisher' => [
        '@type' => 'Organization',
        'name' => 'MangaMukai',
        'url' => $site_url,
    ],
];
if ($original_title) {
    $book['alternateName'] = $original_title;
}
if ($genres) {
    $book['genre'] = $genres;
}
if ($author) {
    $book['author'] = [
        '@type' => 'Person',
        'name' => $author,
    ];
}

$adult = mm_seo_is_adult(mm_seo_tags($post->ID));
if ($adult) $book['isFamilyFriendly'] = false;
$graph = [
        [
            '@type' => 'WebSite',
            '@id' => $site_url . '/#website',
            'url' => $site_url . '/',
            'name' => 'MangaMukai',
            'inLanguage' => 'es',
        ],
        $image_object,
        $book,
        [
            '@type' => 'WebPage',
            '@id' => $webpage_id,
            'url' => $url,
            'name' => $seo_title,
            'description' => $description,
            'inLanguage' => 'es',
            'isPartOf' => ['@id' => $site_url . '/#website'],
            'mainEntity' => ['@id' => $book_id],
            'primaryImageOfPage' => ['@id' => $image_id],
            'datePublished' => mm_seo_date($post->post_date_gmt),
            'dateModified' => mm_seo_date($post->post_modified_gmt),
        ],
    ];

$escape = static fn($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$noscript = '<noscript><main><h1>' . $escape($title) . '</h1><img src="' .
    $escape($cover_url) . '" alt="' . $escape('Portada de ' . $title) .
    '" width="' . ($width ?: 750) . '" height="' . ($height ?: 1060) .
    '"><p>' . $escape($description) . '</p></main></noscript>';
$html = mm_seo_render($index_file, [
    'title' => $seo_title, 'description' => $description, 'canonical' => $url,
    'image' => $cover_url, 'type' => 'book', 'adult' => $adult,
], $graph, $noscript);

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');
header('Content-Language: es');
echo $html;
