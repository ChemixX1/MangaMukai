<?php
// Shared metadata only. No account secrets belong in seo-config.json.
function mm_seo_config() {
    static $config;
    if ($config === null) {
        $config = json_decode(file_get_contents(__DIR__ . '/seo-config.json'), true);
        if (!is_array($config) || empty($config['routes']['/'])) {
            throw new RuntimeException('Invalid MangaMukai SEO configuration');
        }
    }
    return $config;
}

function mm_seo_date($gmt) {
    if (!$gmt || $gmt === '0000-00-00 00:00:00') return '';
    $timestamp = strtotime($gmt . ' UTC');
    return $timestamp === false ? '' : gmdate('Y-m-d\TH:i:s\Z', $timestamp);
}

function mm_seo_tags($post_id) {
    $tags = [];
    foreach (['wp-manga-genre', 'genres', 'category'] as $taxonomy) {
        $terms = get_the_terms($post_id, $taxonomy);
        if ($terms && !is_wp_error($terms)) $tags = array_merge($tags, wp_list_pluck($terms, 'name'));
    }
    $tags[] = (string) get_post_meta($post_id, 'ero_type', true);
    return array_values(array_unique(array_filter(array_map('trim', $tags))));
}

function mm_seo_is_adult($tags) {
    foreach ($tags as $tag) {
        if (preg_match('/^(?:manga\s*)?hot$/iu', $tag)) return true;
    }
    return false;
}

function mm_seo_render($index_file, $page, $graph = [], $noscript = '') {
    $escape = static function ($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); };
    $robots = !empty($page['noindex']) ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    $head = "\n    <title>" . $escape($page['title']) . "</title>\n";
    $meta = [
        'description' => $page['description'],
        'robots' => $robots,
        'googlebot' => $robots,
        'googlebot-image' => !empty($page['noindex']) ? 'noindex' : 'index,follow',
        'twitter:card' => 'summary_large_image',
        'twitter:site' => '@MangaMukai',
        'twitter:title' => $page['title'],
        'twitter:description' => $page['description'],
        'twitter:image' => $page['image'] ?? '',
        'twitter:image:alt' => $page['title'],
    ];
    if (!empty($page['adult'])) $meta['rating'] = 'adult';
    foreach ($meta as $name => $value) {
        if ($value !== '') $head .= '    <meta name="' . $name . '" content="' . $escape($value) . "\" />\n";
    }
    foreach ([
        'type' => $page['type'] ?? 'website',
        'site_name' => 'MangaMukai',
        'locale' => 'es_ES',
        'title' => $page['title'],
        'description' => $page['description'],
        'url' => $page['canonical'],
        'image' => $page['image'] ?? '',
        'image:alt' => $page['title'],
    ] as $name => $value) {
        if ($value !== '') $head .= '    <meta property="og:' . $name . '" content="' . $escape($value) . "\" />\n";
    }
    $head .= '    <link rel="canonical" href="' . $escape($page['canonical']) . "\" />\n";
    if ($graph) {
        $json = wp_json_encode(['@context' => 'https://schema.org', '@graph' => $graph], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
        $head .= '    <script id="mm-page-schema" type="application/ld+json">' . $json . "</script>\n";
    }
    $html = file_get_contents($index_file);
    $html = preg_replace('~<title\b[^>]*>.*?</title>\s*~is', '', $html);
    $html = preg_replace('~<meta\b[^>]*(?:name|property)=["\'](?:description|robots|googlebot|googlebot-image|rating|twitter:[^"\']+|og:[^"\']+)["\'][^>]*>\s*~i', '', $html);
    $html = preg_replace('~<link\b[^>]*rel=["\'](?:canonical|image_src)["\'][^>]*>\s*~i', '', $html);
    $html = preg_replace('~<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>\s*~is', '', $html);
    $html = str_replace('</head>', $head . '  </head>', $html);
    return str_replace('<div id="root"></div>', '<div id="root"></div>' . $noscript, $html);
}

function mm_seo_not_found($index_file, $title = 'Página no encontrada') {
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('X-Robots-Tag: noindex, follow');
    echo mm_seo_render($index_file, [
        'title' => $title . ' | MangaMukai',
        'description' => 'El contenido solicitado no está disponible en MangaMukai.',
        'canonical' => mm_seo_config()['siteUrl'] . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'),
        'noindex' => true,
    ]);
    exit;
}
