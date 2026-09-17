<?php
/**
 * Plugin Name: MangaMukai Latest Views
 * Description: Anade totalViews (vistas reales por serie) a /mangamukai/v1/latest-men, /latest-women y /catalog, sumando wpb_post_views_count de los capitulos por ero_seri, igual que hace /popular. Es aditivo: no modifica el resto de la respuesta.
 * Version: 1.1.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Enriquecer las respuestas de latest-men / latest-women / catalog con totalViews.
 * Corre despues del handler (tambien sobre la respuesta cacheada), agrega solo
 * el campo totalViews a cada manga y no altera nada mas.
 *
 * El catalogo trae todas las series (~500): su mapa de vistas se guarda en un
 * transient el mismo tiempo que el propio catalogo para no sumar los capitulos
 * de todas las series en cada peticion. ?refresh=1 lo recalcula.
 */
define('MM_CATALOG_VIEWS_TRANSIENT', 'mm_catalog_views_map');
define('MM_CATALOG_VIEWS_TTL', 15 * 60); // igual que mm_catalog_v2

add_filter('rest_post_dispatch', 'mm_latest_views_enrich', 20, 3);

function mm_latest_views_enrich($response, $server, $request) {
    if (!($response instanceof WP_REST_Response) || !($request instanceof WP_REST_Request)) {
        return $response;
    }

    $route      = (string) $request->get_route();
    $is_catalog = strpos($route, '/mangamukai/v1/catalog') !== false;
    if (!$is_catalog
        && strpos($route, '/mangamukai/v1/latest-men') === false
        && strpos($route, '/mangamukai/v1/latest-women') === false) {
        return $response;
    }

    $data = $response->get_data();
    if (empty($data['mangas']) || !is_array($data['mangas'])) {
        return $response;
    }

    $ids = [];
    foreach ($data['mangas'] as $manga) {
        if (isset($manga['id'])) {
            $ids[] = (int) $manga['id'];
        }
    }
    $ids = array_values(array_unique(array_filter($ids)));
    if (empty($ids)) {
        return $response;
    }

    if ($is_catalog) {
        $views = $request->get_param('refresh') === '1' ? false : get_transient(MM_CATALOG_VIEWS_TRANSIENT);
        if (!is_array($views)) {
            $views = mm_latest_views_map($ids);
            set_transient(MM_CATALOG_VIEWS_TRANSIENT, $views, MM_CATALOG_VIEWS_TTL);
        }
    } else {
        $views = mm_latest_views_map($ids);
    }

    foreach ($data['mangas'] as &$manga) {
        $id = isset($manga['id']) ? (int) $manga['id'] : 0;
        $manga['totalViews'] = isset($views[$id]) ? (int) $views[$id] : 0;
    }
    unset($manga);

    $response->set_data($data);
    return $response;
}

/**
 * Devuelve [manga_id => total_views] sumando wpb_post_views_count de los
 * capitulos (posts con meta ero_seri = manga_id). Una sola consulta en bloque.
 * Misma logica que mm_popular_fallback_fill('historical') del tracker.
 *
 * @param int[] $ids
 * @return array<int,int>
 */
function mm_latest_views_map(array $ids): array {
    global $wpdb;

    $ids = array_values(array_unique(array_map('intval', array_filter($ids))));
    if (empty($ids)) return [];

    $in  = implode(',', $ids);
    $map = array_fill_keys($ids, 0);

    $rows = $wpdb->get_results("
        SELECT CAST(pm_s.meta_value AS UNSIGNED) AS manga_id,
               SUM(COALESCE(CAST(pm_v.meta_value AS UNSIGNED), 0)) AS total_views
        FROM {$wpdb->postmeta} pm_s
        JOIN {$wpdb->posts} p
            ON p.ID = pm_s.post_id AND p.post_type = 'post' AND p.post_status = 'publish'
        LEFT JOIN {$wpdb->postmeta} pm_v
            ON pm_v.post_id = p.ID AND pm_v.meta_key = 'wpb_post_views_count'
        WHERE pm_s.meta_key = 'ero_seri'
          AND CAST(pm_s.meta_value AS UNSIGNED) IN ({$in})
        GROUP BY pm_s.meta_value
    ", ARRAY_A);

    foreach ((array) $rows as $row) {
        $mid = (int) $row['manga_id'];
        if (isset($map[$mid])) {
            $map[$mid] = (int) $row['total_views'];
        }
    }

    return $map;
}
