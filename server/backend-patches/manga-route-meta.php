<?php

$wp_root = dirname(__FILE__, 2);
$index_file = $wp_root . '/index.html';

if (!file_exists($index_file)) {
    http_response_code(503);
    exit;
}

require_once __DIR__ . '/seo-common.php';
$config = mm_seo_config();
$site_url = $config['siteUrl'];
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = '/' . trim((string) $path, '/');
$path = $path === '/' ? '/' : rtrim($path, '/');

$shell_stamp = filemtime($index_file) . '|' . filemtime(__FILE__) . '|' . filemtime(__DIR__ . '/seo-config.json') . '|' . filemtime(__DIR__ . '/seo-common.php');
$cache_file = sys_get_temp_dir() . '/mm_route_' . md5($path . '|' . $shell_stamp) . '.html';
$cache_ttl = 900;

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    header('Content-Type: text/html; charset=UTF-8');
    header('Content-Language: es');
    header('Cache-Control: no-cache, must-revalidate');
    header('X-MM-Route-Cache: hit');
    readfile($cache_file);
    exit;
}

if (!file_exists($wp_root . '/wp-load.php')) {
    http_response_code(503);
    header('Retry-After: 300');
    exit;
}

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
            if (!array_filter($terms, static function ($term) use ($pattern) { return preg_match($pattern, trim($term)); })) continue;
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

function mm_route_explore_links() {
    $links = [
        ['url' => '/#tendencia-ahora', 'title' => 'Tendencia Ahora'],
        ['url' => '/#mangas-juveniles', 'title' => 'Mangas Juveniles'],
        ['url' => '/manga-bn', 'title' => 'Mangas Blanco & Negro'],
        ['url' => '/manga-19', 'title' => 'Mangas para adultos'],
    ];
    $ranked = [];
    foreach (['popular-women', 'popular-men'] as $endpoint) {
        $request = new WP_REST_Request('GET', '/mangamukai/v1/' . $endpoint);
        $request->set_param('period', 'historical');
        $response = rest_do_request($request);
        if ($response->is_error() || $response->get_status() !== 200) continue;
        $data = $response->get_data();
        if (empty($data['success']) || empty($data['mangas']) || !is_array($data['mangas'])) continue;
        foreach ($data['mangas'] as $manga) {
            $id = absint($manga['id'] ?? 0);
            $views = (float) ($manga['totalViews'] ?? 0);
            if (!$id || $views <= 0 || empty($manga['titulo'])) continue;
            if (!isset($ranked[$id]) || $views > $ranked[$id]['views']) {
                $ranked[$id] = ['id' => $id, 'views' => $views, 'title' => wp_strip_all_tags($manga['titulo'])];
            }
        }
    }
    usort($ranked, static function ($a, $b) {
        return ($b['views'] <=> $a['views']) ?: ($a['id'] <=> $b['id']);
    });
    foreach (array_slice($ranked, 0, 2) as $manga) {
        $links[] = ['url' => '/manga/' . $manga['id'], 'title' => $manga['title']];
    }
    $links[] = ['url' => '/comunidad', 'title' => 'Comunidad Mukai'];
    $links[] = ['url' => '/chat', 'title' => 'Character Chat'];
    return $links;
}

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

$adult_pattern = '/^(?:manga\s*)?hot$/iu';
$mono_pattern = '/^(?:manga\s*)?(?:b\s*[&\/-]?\s*n|blanco\s*y?\s*negro|monocrom\w*)$/iu';

$static_routes = $config['routes'];
$static_routes['/']['list'] = ['pattern' => '', 'limit' => 30];
$static_routes['/manga-19']['list'] = ['pattern' => $adult_pattern, 'limit' => 36];
$static_routes['/manga-bn']['list'] = ['pattern' => $mono_pattern, 'limit' => 36];

$private_routes = [
    '/mensajes' => 'Mensajes',
    '/notificaciones' => 'Notificaciones',
    '/transacciones' => 'Transacciones',
    '/perfil/editar' => 'Editar perfil',
    '/tienda/pago' => 'Pago',
    '/pro/pago' => 'Pago',
    '/profile' => 'Profile',
    '/recargar' => 'Recargar monedas',
    '/recargar/pago' => 'Recargar monedas',
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
} elseif (preg_match('~^/(auth|usuarios|mensajes|chat)/|^/comunidad/publicacion/~', $path)) {
    $route = ['kind' => 'private', 'title' => 'MangaMukai', 'description' => 'Área privada de MangaMukai.'];
} elseif (preg_match('~^/read/(\d+)$~', $path, $matches)) {
    $chapter_post = get_post((int) $matches[1]);
    if ($chapter_post && $chapter_post->post_type === 'post' && $chapter_post->post_status === 'publish') {
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
        mm_seo_not_found($index_file, 'Capítulo no disponible');
    }
}

if (!$route) mm_seo_not_found($index_file);

$canonical = $site_url . ($path === '/' ? '/' : $path);
$robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
$og_type = 'website';
$items = [];
$noscript = '';
$graph = [];
$adult = !empty($route['adult']);

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
    $adult = mm_seo_is_adult(mm_seo_tags($chapter['manga']->ID));

    $title = $manga_title . ' — ' . $label . ' | MangaMukai';
    $description = 'Lee ' . $manga_title . ' — ' . $label . ' en español en MangaMukai. Consulta su disponibilidad y sigue los capítulos de la historia.';

    $graph[] = [
        '@type' => 'PublicationIssue',
        '@id' => $canonical . '#chapter',
        'name' => $manga_title . ' ' . $label,
        'issueNumber' => $number !== '' ? $number : null,
        'url' => $canonical,
        'inLanguage' => 'es',
        'datePublished' => mm_seo_date($chapter['post']->post_date_gmt),
        'dateModified' => mm_seo_date($chapter['post']->post_modified_gmt),
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
    $explore = '<noscript><nav aria-label="Explora MangaMukai"><h2>Explora MangaMukai</h2><ul>';
    foreach (mm_route_explore_links() as $link) {
        $explore .= '<li><a href="' . esc_url($site_url . $link['url']) . '">' . esc_html($link['title']) . '</a></li>';
    }
    $noscript .= $explore . '</ul><p>En Character Chat puedes conversar con tus personajes favoritos, crear tu propia historia y vivir una aventura.</p></nav></noscript>';
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
    if ($adult) $graph[0]['isFamilyFriendly'] = false;
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

if ($graph) {
    array_unshift($graph, $organization, $website);
}

$html = mm_seo_render($index_file, [
    'title' => $title,
    'description' => $description,
    'canonical' => $canonical,
    'image' => $share_image,
    'type' => $og_type,
    'adult' => $adult,
    'noindex' => $route['kind'] === 'private',
], array_map('mm_route_strip_nulls', $graph), $noscript);

@file_put_contents($cache_file, $html, LOCK_EX);

header('Content-Type: text/html; charset=UTF-8');
header('Content-Language: es');
header('Cache-Control: no-cache, must-revalidate');
header('X-MM-Route-Cache: miss');
echo $html;

function mm_route_strip_nulls($node) {
    if (!is_array($node)) return $node;
    $clean = [];
    foreach ($node as $key => $value) {
        if ($value === null || $value === '') continue;
        $clean[$key] = is_array($value) ? mm_route_strip_nulls($value) : $value;
    }
    return $clean;
}
