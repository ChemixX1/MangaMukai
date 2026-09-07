<?php
/**
 * Serves the normal React application with a server-rendered SEO head for a manga.
 */

$wp_root = dirname(__FILE__, 2);
$index_file = $wp_root . '/index.html';

if (!file_exists($wp_root . '/wp-load.php') || !file_exists($index_file)) {
    http_response_code(503);
    exit;
}

require_once $wp_root . '/wp-load.php';

$id = absint($_GET['id'] ?? 0);
$post = $id ? get_post($id) : null;

if (!$post || $post->post_type !== 'manga' || $post->post_status !== 'publish') {
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    readfile($index_file);
    exit;
}

$site_url = 'https://mangamukai.com';
$url = $site_url . '/manga/' . $post->ID;
$title = html_entity_decode(wp_strip_all_tags($post->post_title), ENT_QUOTES, 'UTF-8');
$seo_title = $title . ' - MangaMukai';
$description = trim(preg_replace('/\s+/u', ' ', wp_strip_all_tags($post->post_content)));
$description = $description ?: 'Lee ' . $title . ' online en MangaMukai.';
$description = mb_substr($description, 0, 260);

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
if (!$cover_url) {
    // Imagen sin hash servida desde public/: los bundles de /assets/ cambian de
    // nombre en cada build y se limpian, asi que no sirven como referencia fija.
    $cover_url = $site_url . '/og-default.webp';
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
$status = trim((string) get_post_meta($post->ID, 'ero_status', true));
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
    'datePublished' => mysql2date(DATE_W3C, $post->post_date_gmt ?: $post->post_date),
    'dateModified' => mysql2date(DATE_W3C, $post->post_modified_gmt ?: $post->post_modified),
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
if ($status) {
    $book['bookEdition'] = $status;
}
if ($author) {
    $book['author'] = [
        '@type' => 'Organization',
        'name' => $author,
    ];
}

$jsonld = wp_json_encode([
    '@context' => 'https://schema.org',
    '@graph' => [
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
            'datePublished' => mysql2date(DATE_W3C, $post->post_date_gmt ?: $post->post_date),
            'dateModified' => mysql2date(DATE_W3C, $post->post_modified_gmt ?: $post->post_modified),
        ],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);

$escape = static fn($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
$image_type = wp_check_filetype(parse_url($cover_url, PHP_URL_PATH))['type'] ?: 'image/webp';

$seo_head = "\n" .
    '    <title>' . $escape($seo_title) . "</title>\n" .
    '    <meta name="description" content="' . $escape($description) . "\" />\n" .
    '    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />' . "\n" .
    '    <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />' . "\n" .
    '    <meta name="googlebot-image" content="index,follow" />' . "\n" .
    '    <link rel="canonical" href="' . $escape($url) . "\" />\n" .
    '    <link rel="image_src" href="' . $escape($cover_url) . "\" />\n" .
    '    <link rel="preload" as="image" href="' . $escape($cover_url) . "\" fetchpriority=\"high\" />\n" .
    '    <meta property="og:type" content="book" />' . "\n" .
    '    <meta property="og:site_name" content="MangaMukai" />' . "\n" .
    '    <meta property="og:title" content="' . $escape($seo_title) . "\" />\n" .
    '    <meta property="og:description" content="' . $escape($description) . "\" />\n" .
    '    <meta property="og:url" content="' . $escape($url) . "\" />\n" .
    '    <meta property="og:image" content="' . $escape($cover_url) . "\" />\n" .
    '    <meta property="og:image:secure_url" content="' . $escape($cover_url) . "\" />\n" .
    '    <meta property="og:image:type" content="' . $escape($image_type) . "\" />\n" .
    ($width ? '    <meta property="og:image:width" content="' . $width . "\" />\n" : '') .
    ($height ? '    <meta property="og:image:height" content="' . $height . "\" />\n" : '') .
    '    <meta property="og:image:alt" content="' . $escape('Portada de ' . $title) . "\" />\n" .
    '    <meta property="og:locale" content="es_ES" />' . "\n" .
    '    <meta name="twitter:card" content="summary_large_image" />' . "\n" .
    '    <meta name="twitter:site" content="@MangaMukai" />' . "\n" .
    '    <meta name="twitter:title" content="' . $escape($seo_title) . "\" />\n" .
    '    <meta name="twitter:description" content="' . $escape($description) . "\" />\n" .
    '    <meta name="twitter:image" content="' . $escape($cover_url) . "\" />\n" .
    '    <meta name="twitter:image:alt" content="' . $escape('Portada de ' . $title) . "\" />\n" .
    '    <script type="application/ld+json">' . $jsonld . "</script>\n";

$html = file_get_contents($index_file);
$html = preg_replace('~<title\b[^>]*>.*?</title>\s*~is', '', $html);
$html = preg_replace('~<meta\b[^>]*(?:name|property)=["\'](?:description|robots|googlebot|googlebot-image|twitter:[^"\']+|og:[^"\']+)["\'][^>]*>\s*~i', '', $html);
$html = preg_replace('~<link\b[^>]*rel=["\'](?:canonical|image_src)["\'][^>]*>\s*~i', '', $html);
// El shell trae un JSON-LD generico de Organization/WebSite: se sustituye por el
// grafo de esta ficha para no publicar dos veces los mismos @id.
$html = preg_replace('~<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>\s*~is', '', $html);
$html = str_replace('</head>', $seo_head . '  </head>', $html);

$noscript = '<noscript><main><h1>' . $escape($title) . '</h1><img src="' .
    $escape($cover_url) . '" alt="' . $escape('Portada de ' . $title) .
    '" width="' . ($width ?: 750) . '" height="' . ($height ?: 1060) .
    '"><p>' . $escape($description) . '</p></main></noscript>';
$html = str_replace('<div id="root"></div>', '<div id="root"></div>' . $noscript, $html);

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');
header('Content-Language: es');
echo $html;
