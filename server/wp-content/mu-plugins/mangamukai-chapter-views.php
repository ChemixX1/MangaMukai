<?php
/**
 * Plugin Name: MangaMukai Chapter Views
 * Description: Contador de vistas por capitulo (no por serie) en una tabla propia, y endpoint para leerlas.
 * Version: 1.0.0
 *
 * Tabla wp_mm_chapter_view_counts: una fila por capitulo con el total acumulado.
 * Se alimenta de POST /mangamukai/v1/track-view (el lector ya lo llama al abrir
 * un capitulo) y se siembra una sola vez con lo que ya existia: el contador del
 * tema (meta wpb_post_views_count) mas las filas de wp_mm_chapter_views.
 *
 *   GET /mangamukai/v1/chapters/views?ids=1,2,3  ->  { success, views: { "1": 120, ... } }
 */

if (!defined('ABSPATH')) exit;

function mm_chapter_views_table(): string {
    global $wpdb;
    return $wpdb->prefix . 'mm_chapter_view_counts';
}

/** Crea la tabla y siembra los totales existentes (solo la primera vez). */
function mm_chapter_views_install(): void {
    if (get_option('mm_chapter_view_counts_seeded')) return;
    global $wpdb;
    $table = mm_chapter_views_table();
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE {$table} (
        chapter_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL DEFAULT 0,
        views bigint(20) unsigned NOT NULL DEFAULT 0,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (chapter_id),
        KEY manga_id (manga_id)
    ) {$charset};");

    $now = current_time('mysql');
    // 1. Contador del tema por capitulo (posts con ero_seri).
    $wpdb->query($wpdb->prepare("
        INSERT INTO {$table} (chapter_id, manga_id, views, updated_at)
        SELECT p.ID, CAST(pm_s.meta_value AS UNSIGNED), COALESCE(CAST(pm_v.meta_value AS UNSIGNED), 0), %s
        FROM {$wpdb->posts} p
        JOIN {$wpdb->postmeta} pm_s ON pm_s.post_id = p.ID AND pm_s.meta_key = 'ero_seri'
        LEFT JOIN {$wpdb->postmeta} pm_v ON pm_v.post_id = p.ID AND pm_v.meta_key = 'wpb_post_views_count'
        WHERE p.post_type = 'post' AND p.post_status = 'publish'
        ON DUPLICATE KEY UPDATE views = VALUES(views)
    ", $now));

    // 2. Vistas registradas por el lector (una fila por vista) desde que existe el tracker.
    $raw = $wpdb->prefix . 'mm_chapter_views';
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $raw)) === $raw) {
        $wpdb->query($wpdb->prepare("
            INSERT INTO {$table} (chapter_id, manga_id, views, updated_at)
            SELECT chapter_id, manga_id, COUNT(*), %s FROM {$raw} GROUP BY chapter_id, manga_id
            ON DUPLICATE KEY UPDATE views = views + VALUES(views)
        ", $now));
    }

    update_option('mm_chapter_view_counts_seeded', '1', false);
}
add_action('init', 'mm_chapter_views_install', 30);

/** Cada vista que registra el lector (POST /track-view con exito) suma uno al capitulo. */
add_filter('rest_request_after_callbacks', 'mm_chapter_views_count_track', 10, 3);
function mm_chapter_views_count_track($response, $handler, $request) {
    if (!($request instanceof WP_REST_Request) || $request->get_method() !== 'POST') return $response;
    if ((string) $request->get_route() !== '/mangamukai/v1/track-view') return $response;
    if (is_wp_error($response)) return $response;
    $data = $response instanceof WP_REST_Response ? $response->get_data() : null;
    if (is_array($data) && array_key_exists('success', $data) && !$data['success']) return $response;

    $chapter_id = absint($request->get_param('chapter_id'));
    $manga_id = absint($request->get_param('manga_id'));
    if (!$chapter_id) return $response;

    global $wpdb;
    $wpdb->query($wpdb->prepare(
        'INSERT INTO ' . mm_chapter_views_table() . ' (chapter_id, manga_id, views, updated_at) VALUES (%d, %d, 1, %s)
         ON DUPLICATE KEY UPDATE views = views + 1, manga_id = IF(manga_id = 0, VALUES(manga_id), manga_id), updated_at = VALUES(updated_at)',
        $chapter_id, $manga_id, current_time('mysql')
    ));
    return $response;
}

/** GET /chapters/views?ids=... -> vistas por capitulo (maximo 200 ids por peticion). */
add_action('rest_api_init', function () {
    register_rest_route('mangamukai/v1', '/chapters/views', [
        'methods' => WP_REST_Server::READABLE,
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $request) {
            global $wpdb;
            $ids = array_values(array_unique(array_filter(array_map('absint', explode(',', (string) $request->get_param('ids'))))));
            $ids = array_slice($ids, 0, 200);
            $views = array_fill_keys(array_map('strval', $ids), 0);
            if ($ids) {
                $in = implode(',', $ids);
                $rows = $wpdb->get_results("SELECT chapter_id, views FROM " . mm_chapter_views_table() . " WHERE chapter_id IN ({$in})", ARRAY_A);
                foreach ((array) $rows as $row) $views[(string) $row['chapter_id']] = (int) $row['views'];
            }
            return rest_ensure_response(['success' => true, 'views' => $views]);
        },
    ]);
});
