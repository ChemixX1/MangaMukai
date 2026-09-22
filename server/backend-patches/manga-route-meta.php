<?php
/**
 * Sirve la aplicacion React con un <head> SEO propio para cada ruta.
 *
 * /manga/{id} tiene su propio handler (manga-social-meta.php). Este cubre el
 * resto: portada, colecciones, paginas informativas, capitulos y las rutas
 * privadas que deben quedar fuera del indice.
 *
 * Importante: si cambian titulos o descripciones aqui, hay que reflejarlo en
 * src/config/seoRoutes.ts para que la navegacion cliente diga lo mismo.
 */

$wp_root = dirname(__FILE__, 2);
$index_file = $wp_root . '/index.html';

if (!file_exists($index_file)) {
    http_response_code(503);
    exit;
}

$site_url = 'https://mangamukai.com';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = '/' . trim((string) $path, '/');
$path = $path === '/' ? '/' : rtrim($path, '/');

/**
 * Cache en disco. La clave incluye la fecha del index.html para que un deploy
 * nuevo (con otros hashes de JS) invalide todas las rutas cacheadas.
 */
$shell_stamp = (string) filemtime($index_file);
$cache_file = sys_get_temp_dir() . '/mm_route_' . md5($path . '|' . $shell_stamp) . '.html';
$cache_ttl = 900; // 15 minutos

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    header('Content-Type: text/html; charset=UTF-8');
    header('Content-Language: es');
    header('Cache-Control: no-cache, must-revalidate');
    header('X-MM-Route-Cache: hit');
    readfile($cache_file);
    exit;
}

if (!file_exists($wp_root . '/wp-load.php')) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($index_file);
    exit;
}

// wp-load.php, los plugins y el tema se incluyen en el ambito global de este
// script, asi que cualquier variable suya con el mismo nombre pisa a las de
// aqui. Con $path clobbereado, isset($static_routes[$path]) lanzaba
// "Illegal offset type" y toda ruta React caia con error 500.
$mm_route_ctx = [
    'wp_root'    => $wp_root,
    'index_file' => $index_file,
    'site_url'   => $site_url,
    'path'       => $path,
    'cache_file' => $cache_file,
];

require_once $wp_root . '/wp-load.php';

$wp_root    = $mm_route_ctx['wp_root'];
$index_file = $mm_route_ctx['index_file'];
$site_url   = $mm_route_ctx['site_url'];
$path       = $mm_route_ctx['path'];
$cache_file = $mm_route_ctx['cache_file'];

/* -------------------------------------------------------------------------
 * Utilidades
 * ---------------------------------------------------------------------- */

/** Portada del manga con los tres origenes que usa el resto del sitio. */
function mm_route_cover($post_id) {
    $cover_id = get_post_thumbnail_id($post_id);
    $custom = get_post_meta($post_id, 'manga_cover', true);
    $legacy = get_post_meta($post_id, 'ero_cover', true);

    if (!$cover_id && is_numeric($custom)) $cover_id = absint($custom);
    if (!$cover_id && is_numeric($legacy)) $cover_id = absint($legacy);

    $url = $cover_id ? wp_get_attachment_url($cover_id) : '';
    if (!$url && is_string($custom) && filter_var($custom, FILTER_VALIDATE_URL)) $url = $custom;
    if (!$url && is_string($legacy) && filter_var($legacy, FILTER_VALIDATE_URL)) $url = $legacy;

    return $url ? set_url_scheme($url, 'https') : '';
}

/** Ultimos mangas publicados con portada y generos, para listas e ItemList. */
function mm_route_latest_mangas($limit = 24, $pattern = '') {
    global $wpdb;

    $pool = $pattern ? max($limit * 8, 160) : $limit;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT ID, post_title, post_modified_gmt
         FROM {$wpdb->posts}
         WHERE post_type = 'manga' AND post_status = 'publish'
         ORDER BY post_modified_gmt DESC
         LIMIT %d",
        $pool
    ));

    $items = [];
    foreach ($rows as $row) {
        if (count($items) >= $limit) break;

        if ($pattern) {
            $terms = [];
            foreach (['wp-manga-genre', 'genres', 'category'] as $taxonomy) {
                $found = get_the_terms($row->ID, $taxonomy);
                if ($found && !is_wp_error($found)) $terms = array_merge($terms, wp_list_pluck($found, 'name'));
            }
            $terms[] = (string) get_post_meta($row->ID, 'ero_type', true);
            if (!preg_match($pattern, implode(' ', array_filter($terms)))) continue;
        }

        $cover = mm_route_cover($row->ID);
        if (!$cover) continue;

        $items[] = [
            'id' => (int) $row->ID,
            'title' => html_entity_decode(wp_strip_all_tags($row->post_title), ENT_QUOTES, 'UTF-8'),
            'cover' => $cover,
            'url' => 'https://mangamukai.com/manga/' . (int) $row->ID,
            'modified' => $row->post_modified_gmt,
        ];
    }

    return $items;
}

/** ItemList de mangas: cada entrada lleva su portada para Google Imagenes. */
function mm_route_item_list($items, $list_url, $list_name) {
    $elements = [];
    foreach ($items as $position => $item) {
        $elements[] = [
            '@type' => 'ListItem',
            'position' => $position + 1,
            'url' => $item['url'],
            'name' => $item['title'],
            'image' => $item['cover'],
        ];
    }

    return [
        '@type' => 'ItemList',
        '@id' => $list_url . '#itemlist',
        'name' => $list_name,
        'numberOfItems' => count($elements),
        'itemListElement' => $elements,
    ];
}

/** Rejilla estatica para lectores sin JS y para descubrir portadas al rastrear. */
function mm_route_noscript_grid($heading, $intro, $items) {
    $html = '<noscript><main><h1>' . esc_html($heading) . '</h1><p>' . esc_html($intro) . '</p><ul>';
    foreach ($items as $item) {
        $html .= '<li><a href="' . esc_url($item['url']) . '">'
            . '<img src="' . esc_url($item['cover']) . '" alt="' . esc_attr('Portada del manga ' . $item['title']) . '" width="350" height="500" loading="lazy" />'
            . '<span>' . esc_html($item['title']) . '</span></a></li>';
    }
    return $html . '</ul></main></noscript>';
}

function mm_route_breadcrumbs($trail) {
    $elements = [];
    foreach ($trail as $position => $crumb) {
        $elements[] = [
            '@type' => 'ListItem',
            'position' => $position + 1,
            'name' => $crumb['name'],
            'item' => $crumb['url'],
        ];
    }
    return ['@type' => 'BreadcrumbList', 'itemListElement' => $elements];
}

/* -------------------------------------------------------------------------
 * Definicion de rutas
 * ---------------------------------------------------------------------- */

$adult_pattern = '/\+19|adult|ecchi|hentai|hot|er[oó]tico|maduro|harem|yuri/i';
$mono_pattern = '/b\/?n|blanco|negro|shounen|seinen|acci[oó]n|manga juvenil/i';

$static_routes = [
    '/' => [
        'kind' => 'home',
        'title' => 'MangaMukai — Leer manga online gratis en español',
        'description' => 'Lee manga online gratis y en español en MangaMukai: manhwa, manhua, romance, acción, fantasía, seinen y contenido +19. Capítulos nuevos cada día con lector rápido.',
        'heading' => 'Leer manga online gratis en español',
        'intro' => 'Catálogo de manga, manhwa y manhua en español con capítulos nuevos cada día.',
        'list' => ['pattern' => '', 'limit' => 30],
    ],
    '/biblioteca' => [
        'kind' => 'collection',
        'title' => 'Biblioteca de manga en español — Catálogo completo | MangaMukai',
        'description' => 'Catálogo completo de manga, manhwa y manhua en español: filtra por género, tipo y público, y lee online gratis en MangaMukai.',
        'heading' => 'Biblioteca de manga en español',
        'intro' => 'Todo el catálogo de MangaMukai: busca por título, género o tipo y lee gratis.',
        'list' => ['pattern' => '', 'limit' => 48],
    ],
    '/manga-19' => [
        'kind' => 'collection',
        'title' => 'Mangas +19 en español — Colección para adultos | MangaMukai',
        'description' => 'Colección +19 de MangaMukai: manga y manhwa para adultos en español, con romance, drama y fantasía madura. Solo para mayores de edad.',
        'heading' => 'Mangas +19 en español',
        'intro' => 'Selección madura de manga y manhwa en español. Contenido para mayores de 18 años.',
        'list' => ['pattern' => $adult_pattern, 'limit' => 36],
        'adult' => true,
    ],
    '/manga-bn' => [
        'kind' => 'collection',
        'title' => 'Manga en blanco y negro — Shounen, seinen y acción | MangaMukai',
        'description' => 'Manga clásico en blanco y negro: shounen, seinen y acción en español, con capítulos nuevos y lector optimizado en MangaMukai.',
        'heading' => 'Manga en blanco y negro',
        'intro' => 'Historias clásicas, acción y tinta pura para lectores de manga tradicional.',
        'list' => ['pattern' => $mono_pattern, 'limit' => 36],
    ],
    '/nosotros' => [
        'kind' => 'page',
        'title' => 'Sobre MangaMukai — Quiénes somos',
        'description' => 'Conoce al equipo de MangaMukai, cómo trabajamos las traducciones y qué encontrarás en nuestro catálogo de manga en español.',
        'heading' => 'Sobre MangaMukai',
    ],
    '/contacto' => [
        'kind' => 'page',
        'title' => 'Contacto — MangaMukai',
        'description' => 'Escríbenos para sugerencias, reportes de capítulos, colaboraciones o dudas sobre tu cuenta de MangaMukai.',
        'heading' => 'Contacto',
    ],
    '/legal' => [
        'kind' => 'page',
        'title' => 'Términos de uso y privacidad — MangaMukai',
        'description' => 'Términos de uso, política de privacidad y tratamiento de datos de los lectores de MangaMukai.',
        'heading' => 'Términos y privacidad',
    ],
    '/privacidad' => [
        'kind' => 'page',
        'title' => 'Política de privacidad | MangaMukai',
        'description' => 'Qué datos recoge MangaMukai, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos.',
        'heading' => 'Política de privacidad',
    ],
    '/terminos' => [
        'kind' => 'page',
        'title' => 'Términos de servicio | MangaMukai',
        'description' => 'Condiciones de uso de MangaMukai: cuentas, Mukai Coins, contenido +19, conducta permitida y responsabilidad.',
        'heading' => 'Términos de servicio',
    ],
    '/normas-comunidad' => [
        'kind' => 'page',
        'title' => 'Normas de la comunidad | MangaMukai',
        'description' => 'Reglas de convivencia de la comunidad y la mensajería de MangaMukai, y cómo se modera.',
        'heading' => 'Normas de la comunidad',
    ],
    '/cookies' => [
        'kind' => 'page',
        'title' => 'Política de cookies | MangaMukai',
        'description' => 'Qué cookies y almacenamiento local usa MangaMukai, para qué sirven y cómo puedes gestionarlos.',
        'heading' => 'Política de cookies',
    ],
];

// Rutas privadas o transaccionales: se sirven, pero fuera del indice.
$private_routes = [
    '/perfil' => 'Mi perfil',
    '/saved' => 'Mis guardados',
    '/recargar' => 'Recargar monedas',
    '/pago-exitoso' => 'Pago completado',
    '/auth/login' => 'Iniciar sesión',
    '/auth/register' => 'Crear cuenta',
];

$route = null;
$chapter = null;

if (isset($static_routes[$path])) {
    $route = $static_routes[$path];
} elseif (isset($private_routes[$path])) {
    $route = ['kind' => 'private', 'title' => $private_routes[$path] . ' | MangaMukai', 'description' => 'Área privada de MangaMukai.'];
} elseif (preg_match('~^/(auth|usuarios)/~', $path)) {
    $route = ['kind' => 'private', 'title' => 'MangaMukai', 'description' => 'Área privada de MangaMukai.'];
} elseif (preg_match('~^/read/(\d+)$~', $path, $matches)) {
    $chapter_post = get_post((int) $matches[1]);
    if ($chapter_post && $chapter_post->post_status === 'publish') {
        $manga_id = absint(get_post_meta($chapter_post->ID, 'ero_seri', true));
        $manga = $manga_id ? get_post($manga_id) : null;
        if ($manga && $manga->post_type === 'manga' && $manga->post_status === 'publish') {
            $chapter = [
                'post' => $chapter_post,
                'manga' => $manga,
                'number' => (string) get_post_meta($chapter_post->ID, 'ero_chapter', true),
            ];
            $route = ['kind' => 'chapter'];
        }
    }
    if (!$route) {
        $route = ['kind' => 'private', 'title' => 'Capítulo no disponible | MangaMukai', 'description' => 'Este capítulo ya no está disponible en MangaMukai.'];
    }
}

if (!$route) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($index_file);
    exit;
}

/* -------------------------------------------------------------------------
 * Construccion del head
 * ---------------------------------------------------------------------- */

$canonical = $site_url . ($path === '/' ? '/' : $path);
$robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
$og_type = 'website';
$items = [];
$noscript = '';
$graph = [];
$extra_meta = '';

$organization = [
    '@type' => 'Organization',
    '@id' => $site_url . '/#organization',
    'name' => 'MangaMukai',
    'url' => $site_url . '/',
    'logo' => [
        '@type' => 'ImageObject',
        'url' => function_exists('get_site_icon_url') && get_site_icon_url() ? get_site_icon_url() : $site_url . '/favicon.svg',
    ],
    'sameAs' => [
        'https://www.facebook.com/MangaAyanokouji/',
        'https://x.com/MangaMukai',
        'https://www.instagram.com/mangamukai/',
        'https://t.me/+J6TE0l401vRhZTYx',
    ],
];

$website = [
    '@type' => 'WebSite',
    '@id' => $site_url . '/#website',
    'url' => $site_url . '/',
    'name' => 'MangaMukai',
    'inLanguage' => 'es',
    'publisher' => ['@id' => $site_url . '/#organization'],
    'potentialAction' => [
        '@type' => 'SearchAction',
        'target' => [
            '@type' => 'EntryPoint',
            'urlTemplate' => $site_url . '/biblioteca?buscar={search_term_string}',
        ],
        'query-input' => 'required name=search_term_string',
    ],
];

if ($route['kind'] === 'private') {
    $robots = 'noindex,follow';
}

if (in_array($route['kind'], ['home', 'collection'], true)) {
    $items = mm_route_latest_mangas($route['list']['limit'], $route['list']['pattern']);
    $noscript = mm_route_noscript_grid($route['heading'], $route['intro'], $items);
}

$share_image = $items ? $items[0]['cover'] : (function_exists('get_site_icon_url') && get_site_icon_url() ? get_site_icon_url() : $site_url . '/favicon.svg');
$title = isset($route['title']) ? $route['title'] : 'MangaMukai';
$description = isset($route['description']) ? $route['description'] : '';

if ($route['kind'] === 'chapter') {
    $manga_title = html_entity_decode(wp_strip_all_tags($chapter['manga']->post_title), ENT_QUOTES, 'UTF-8');
    $number = trim($chapter['number']);
    $label = $number !== '' ? 'Capítulo ' . $number : html_entity_decode(wp_strip_all_tags($chapter['post']->post_title), ENT_QUOTES, 'UTF-8');
    $manga_url = $site_url . '/manga/' . $chapter['manga']->ID;
    $cover = mm_route_cover($chapter['manga']->ID);
    $share_image = $cover ?: $share_image;
    $og_type = 'article';

    $title = $manga_title . ' ' . $label . ' — Leer online en español | MangaMukai';
    $description = 'Lee ' . $manga_title . ' ' . $label . ' online y en español, gratis y en alta calidad en MangaMukai.';

    $graph[] = [
        '@type' => 'PublicationIssue',
        '@id' => $canonical . '#chapter',
        'name' => $manga_title . ' ' . $label,
        'issueNumber' => $number !== '' ? $number : null,
        'url' => $canonical,
        'inLanguage' => 'es',
        'datePublished' => mysql2date(DATE_W3C, $chapter['post']->post_date_gmt ?: $chapter['post']->post_date),
        'dateModified' => mysql2date(DATE_W3C, $chapter['post']->post_modified_gmt ?: $chapter['post']->post_modified),
        'image' => $cover ?: null,
        'isPartOf' => [
            '@type' => 'Book',
            '@id' => $manga_url . '#book',
            'name' => $manga_title,
            'url' => $manga_url,
        ],
    ];
    $graph[] = mm_route_breadcrumbs([
        ['name' => 'Inicio', 'url' => $site_url . '/'],
        ['name' => $manga_title, 'url' => $manga_url],
        ['name' => $label, 'url' => $canonical],
    ]);

    $noscript = '<noscript><main><h1>' . esc_html($manga_title . ' ' . $label) . '</h1>'
        . ($cover ? '<img src="' . esc_url($cover) . '" alt="' . esc_attr('Portada del manga ' . $manga_title) . '" width="350" height="500" />' : '')
        . '<p>' . esc_html($description) . '</p>'
        . '<p><a href="' . esc_url($manga_url) . '">Ver todos los capítulos de ' . esc_html($manga_title) . '</a></p></main></noscript>';
}

if ($route['kind'] === 'home') {
    $graph[] = [
        '@type' => 'CollectionPage',
        '@id' => $canonical . '#webpage',
        'url' => $canonical,
        'name' => $title,
        'description' => $description,
        'inLanguage' => 'es',
        'isPartOf' => ['@id' => $site_url . '/#website'],
        'about' => ['@id' => $site_url . '/#organization'],
    ];
    if ($items) $graph[] = mm_route_item_list($items, $canonical, 'Últimas actualizaciones de manga');
} elseif ($route['kind'] === 'collection') {
    $graph[] = [
        '@type' => 'CollectionPage',
        '@id' => $canonical . '#webpage',
        'url' => $canonical,
        'name' => $title,
        'description' => $description,
        'inLanguage' => 'es',
        'isPartOf' => ['@id' => $site_url . '/#website'],
    ];
    $graph[] = mm_route_breadcrumbs([
        ['name' => 'Inicio', 'url' => $site_url . '/'],
        ['name' => $route['heading'], 'url' => $canonical],
    ]);
    if ($items) $graph[] = mm_route_item_list($items, $canonical, $route['heading']);
    if (!empty($route['adult'])) {
        // Etiqueta el bloque adulto sin arrastrar al resto del dominio en SafeSearch.
        $extra_meta .= '    <meta name="rating" content="adult" />' . "\n";
        $extra_meta .= '    <meta name="RATING" content="RTA-5042-1996-1400-1577-RTA" />' . "\n";
    }
} elseif ($route['kind'] === 'page') {
    $graph[] = [
        '@type' => 'WebPage',
        '@id' => $canonical . '#webpage',
        'url' => $canonical,
        'name' => $title,
        'description' => $description,
        'inLanguage' => 'es',
        'isPartOf' => ['@id' => $site_url . '/#website'],
    ];
    $graph[] = mm_route_breadcrumbs([
        ['name' => 'Inicio', 'url' => $site_url . '/'],
        ['name' => $route['heading'], 'url' => $canonical],
    ]);
    $noscript = '<noscript><main><h1>' . esc_html($route['heading']) . '</h1><p>' . esc_html($description) . '</p></main></noscript>';
}

// Identidad del sitio en todas las rutas: los nodos de abajo la referencian
// por @id y el shell ya no aporta su JSON-LD generico cuando hay grafo.
if ($graph) {
    array_unshift($graph, $organization, $website);
}

$jsonld = $graph
    ? wp_json_encode(
        ['@context' => 'https://schema.org', '@graph' => array_map('mm_route_strip_nulls', $graph)],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP
    )
    : '';

$escape = static function ($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
};

$seo_head = "\n" .
    '    <title>' . $escape($title) . "</title>\n" .
    '    <meta name="description" content="' . $escape($description) . "\" />\n" .
    '    <meta name="robots" content="' . $escape($robots) . "\" />\n" .
    '    <meta name="googlebot" content="' . $escape($robots) . "\" />\n" .
    '    <meta name="googlebot-image" content="' . ($route['kind'] === 'private' ? 'noindex' : 'index,follow') . "\" />\n" .
    '    <link rel="canonical" href="' . $escape($canonical) . "\" />\n" .
    $extra_meta .
    '    <meta property="og:type" content="' . $escape($og_type) . "\" />\n" .
    '    <meta property="og:site_name" content="MangaMukai" />' . "\n" .
    '    <meta property="og:locale" content="es_ES" />' . "\n" .
    '    <meta property="og:title" content="' . $escape($title) . "\" />\n" .
    '    <meta property="og:description" content="' . $escape($description) . "\" />\n" .
    '    <meta property="og:url" content="' . $escape($canonical) . "\" />\n" .
    '    <meta property="og:image" content="' . $escape($share_image) . "\" />\n" .
    '    <meta property="og:image:alt" content="' . $escape($title) . "\" />\n" .
    '    <meta name="twitter:card" content="summary_large_image" />' . "\n" .
    '    <meta name="twitter:site" content="@MangaMukai" />' . "\n" .
    '    <meta name="twitter:title" content="' . $escape($title) . "\" />\n" .
    '    <meta name="twitter:description" content="' . $escape($description) . "\" />\n" .
    '    <meta name="twitter:image" content="' . $escape($share_image) . "\" />\n" .
    ($jsonld ? '    <script type="application/ld+json">' . $jsonld . "</script>\n" : '');

if ($items) {
    // La primera portada es el LCP probable de las rejillas.
    $seo_head .= '    <link rel="preload" as="image" href="' . $escape($items[0]['cover']) . "\" fetchpriority=\"high\" />\n";
}

$html = file_get_contents($index_file);
$html = preg_replace('~<title\b[^>]*>.*?</title>\s*~is', '', $html);
$html = preg_replace('~<meta\b[^>]*(?:name|property)=["\'](?:description|robots|googlebot|googlebot-image|twitter:[^"\']+|og:[^"\']+)["\'][^>]*>\s*~i', '', $html);
$html = preg_replace('~<link\b[^>]*rel=["\']canonical["\'][^>]*>\s*~i', '', $html);
// El shell trae un JSON-LD generico de Organization/WebSite: se sustituye por el
// grafo de esta ruta para no publicar dos veces los mismos @id.
if ($jsonld) {
    $html = preg_replace('~<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>\s*~is', '', $html);
}
$html = str_replace('</head>', $seo_head . '  </head>', $html);

if ($noscript) {
    $html = str_replace('<div id="root"></div>', '<div id="root"></div>' . $noscript, $html);
}

@file_put_contents($cache_file, $html, LOCK_EX);

header('Content-Type: text/html; charset=UTF-8');
header('Content-Language: es');
header('Cache-Control: no-cache, must-revalidate');
header('X-MM-Route-Cache: miss');
echo $html;

/** Quita claves nulas del grafo JSON-LD (issueNumber, image, etc.). */
function mm_route_strip_nulls($node) {
    if (!is_array($node)) return $node;
    $clean = [];
    foreach ($node as $key => $value) {
        if ($value === null || $value === '') continue;
        $clean[$key] = is_array($value) ? mm_route_strip_nulls($value) : $value;
    }
    return $clean;
}
