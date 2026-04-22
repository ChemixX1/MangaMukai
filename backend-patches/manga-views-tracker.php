<?php
/**
 * Plugin Name: MangaMukai Views Tracker
 * Description: Registra visitas a capítulos y genera rankings populares semanal/mensual/histórico.
 * Version: 1.0
 */

if (!defined('ABSPATH')) exit;

// ─── TABLA: crear en primer uso ───────────────────────────────────────────────
function mm_ensure_views_table(): void {
    if (get_transient('mm_views_table_v1')) return;
    global $wpdb;
    $table   = $wpdb->prefix . 'mm_chapter_views';
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("
        CREATE TABLE IF NOT EXISTS {$table} (
            id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            chapter_id BIGINT UNSIGNED NOT NULL,
            manga_id   BIGINT UNSIGNED NOT NULL,
            viewed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_chapter  (chapter_id),
            KEY idx_manga    (manga_id),
            KEY idx_date     (viewed_at),
            KEY idx_manga_dt (manga_id, viewed_at)
        ) {$charset};
    ");
    set_transient('mm_views_table_v1', 1, YEAR_IN_SECONDS);
}

add_action('rest_api_init', function () {
    mm_ensure_views_table();

    // POST /mangamukai/v1/track-view
    register_rest_route('mangamukai/v1', '/track-view', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_track_view',
        'permission_callback' => '__return_true',
    ]);

    // GET /mangamukai/v1/popular-women?period=weekly|monthly|historical
    register_rest_route('mangamukai/v1', '/popular-women', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_popular_women',
        'permission_callback' => '__return_true',
        'args' => [
            'period'  => ['default' => 'historical', 'sanitize_callback' => 'sanitize_text_field'],
            'refresh' => ['default' => '0',          'sanitize_callback' => 'sanitize_text_field'],
        ],
    ]);

    // GET /mangamukai/v1/related/{id} — mangas relacionados por géneros + visitas
    register_rest_route('mangamukai/v1', '/related/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_related',
        'permission_callback' => '__return_true',
        'args'                => [
            'id'    => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
            'limit' => ['default' => '10', 'sanitize_callback' => 'absint'],
        ],
    ]);

    // GET /mangamukai/v1/latest-women — últimas actualizaciones con datos de capítulo
    register_rest_route('mangamukai/v1', '/latest-women', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_latest_women',
        'permission_callback' => '__return_true',
        'args' => [
            'limit'   => ['default' => '18', 'sanitize_callback' => 'absint'],
            'refresh' => ['default' => '0',  'sanitize_callback' => 'sanitize_text_field'],
        ],
    ]);
});

// ─── REGISTRAR VISITA ─────────────────────────────────────────────────────────
function mm_handle_track_view(WP_REST_Request $req): WP_REST_Response {
    $chapter_id = (int) $req->get_param('chapter_id');
    $manga_id   = (int) $req->get_param('manga_id');

    if (!$chapter_id || !$manga_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'Parámetros requeridos'], 400);
    }

    global $wpdb;
    $wpdb->insert(
        $wpdb->prefix . 'mm_chapter_views',
        ['chapter_id' => $chapter_id, 'manga_id' => $manga_id, 'viewed_at' => current_time('mysql')],
        ['%d', '%d', '%s']
    );

    // Invalidar caches
    delete_transient('mm_popular_women_weekly');
    delete_transient('mm_popular_women_monthly');
    delete_transient('mm_popular_women_historical');

    return new WP_REST_Response(['success' => true], 200);
}

// ─── POPULARES MUJERES ────────────────────────────────────────────────────────
function mm_handle_popular_women(WP_REST_Request $req): WP_REST_Response {
    $period  = $req->get_param('period') ?: 'historical';
    $refresh = $req->get_param('refresh') === '1';

    $cache_key = 'mm_popular_women_' . $period;
    if (!$refresh) {
        $cached = get_transient($cache_key);
        if ($cached !== false) return new WP_REST_Response($cached, 200);
    }

    global $wpdb;
    $table    = $wpdb->prefix . 'mm_chapter_views';
    $has_data = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}") > 0;

    $response = $has_data
        ? mm_popular_from_views($table, $period)
        : mm_popular_fallback($period);

    $ttl = ($period === 'historical') ? 3600 : 1800;
    set_transient($cache_key, $response, $ttl);

    return new WP_REST_Response($response, 200);
}

// ─── POPULAR DESDE TABLA DE VISITAS ──────────────────────────────────────────
function mm_popular_from_views(string $table, string $period): array {
    global $wpdb;
    $df = mm_date_filter($period, 'viewed_at');

    $rows = $wpdb->get_results($wpdb->prepare("
        SELECT manga_id, COUNT(*) AS total_views,
               (
                   SELECT chapter_id FROM {$table} sub
                   WHERE sub.manga_id = main.manga_id {$df}
                   GROUP BY chapter_id ORDER BY COUNT(*) DESC LIMIT 1
               ) AS pop_chapter_id
        FROM {$table} main
        WHERE 1=1 {$df}
        GROUP BY manga_id
        ORDER BY total_views DESC
        LIMIT 20
    ", []), ARRAY_A);

    if (empty($rows)) return mm_popular_fallback($period);

    $generos_mujer = mm_generos_mujer();
    $mangas = [];
    foreach ($rows as $row) {
        $item = mm_build_manga_item((int)$row['manga_id'], (int)$row['total_views'], (int)$row['pop_chapter_id'], $generos_mujer);
        if ($item) $mangas[] = $item;
        if (count($mangas) >= 12) break;
    }

    if (count($mangas) < 4) return mm_popular_fallback($period);

    return ['success' => true, 'mangas' => $mangas, 'period' => $period, 'source' => 'tracked'];
}

// ─── POPULAR FALLBACK (wpb_post_views o fecha) ───────────────────────────────
function mm_popular_fallback(string $period): array {
    global $wpdb;

    // Para histórico: usar wpb_post_views_count de capítulos (suma por manga)
    // Para semanal/mensual: mangas más recientes (fallback mientras no hay datos)
    // Para weekly/mensual sin datos de tracking: usar histórico (mejor UX que lista vacía)
    // Para histórico: usar wpb_post_views_count de capítulos
    if ($period === 'historical') {
        $rows = $wpdb->get_results("
            SELECT pm_s.meta_value AS manga_id,
                   SUM(COALESCE(CAST(pm_v.meta_value AS UNSIGNED), 0)) AS total_views,
                   (
                       SELECT p2.ID FROM {$wpdb->posts} p2
                       JOIN {$wpdb->postmeta} pm_s2 ON pm_s2.post_id = p2.ID AND pm_s2.meta_key = 'ero_seri'
                       LEFT JOIN {$wpdb->postmeta} pm_v2 ON pm_v2.post_id = p2.ID AND pm_v2.meta_key = 'wpb_post_views_count'
                       WHERE pm_s2.meta_value = pm_s.meta_value AND p2.post_type = 'post' AND p2.post_status = 'publish'
                       ORDER BY CAST(COALESCE(pm_v2.meta_value, '0') AS UNSIGNED) DESC LIMIT 1
                   ) AS pop_chapter_id
            FROM {$wpdb->postmeta} pm_s
            JOIN {$wpdb->posts} p ON p.ID = pm_s.post_id AND p.post_type = 'post' AND p.post_status = 'publish'
            LEFT JOIN {$wpdb->postmeta} pm_v ON pm_v.post_id = p.ID AND pm_v.meta_key = 'wpb_post_views_count'
            WHERE pm_s.meta_key = 'ero_seri'
            GROUP BY pm_s.meta_value
            ORDER BY total_views DESC
            LIMIT 30
        ", ARRAY_A);
    } else {
        // Sin datos semanales/mensuales: usar mangas recientes con primer capítulo
        $rows = $wpdb->get_results("
            SELECT p.ID AS manga_id, 0 AS total_views,
                   (
                       SELECT p2.ID FROM {$wpdb->posts} p2
                       JOIN {$wpdb->postmeta} pm_s2 ON pm_s2.post_id = p2.ID AND pm_s2.meta_key = 'ero_seri'
                       JOIN {$wpdb->postmeta} pm_ch2 ON pm_ch2.post_id = p2.ID AND pm_ch2.meta_key = 'ero_chapter'
                       WHERE pm_s2.meta_value = p.ID AND p2.post_type = 'post' AND p2.post_status = 'publish'
                       ORDER BY CAST(pm_ch2.meta_value AS UNSIGNED) ASC LIMIT 1
                   ) AS pop_chapter_id
            FROM {$wpdb->posts} p
            WHERE p.post_type = 'manga' AND p.post_status = 'publish'
              AND EXISTS (
                SELECT 1 FROM {$wpdb->postmeta} pm_ex
                JOIN {$wpdb->posts} p_ex ON p_ex.ID = pm_ex.post_id
                WHERE pm_ex.meta_key = 'ero_seri'
                  AND CAST(pm_ex.meta_value AS UNSIGNED) = p.ID
                  AND p_ex.post_type = 'post'
                  AND p_ex.post_status = 'publish'
              )
            ORDER BY p.post_date DESC
            LIMIT 30
        ", ARRAY_A);
    }

    if (empty($rows)) {
        $rows = $wpdb->get_results("
            SELECT ID AS manga_id, 0 AS total_views, NULL AS pop_chapter_id
            FROM {$wpdb->posts}
            WHERE post_type = 'manga' AND post_status = 'publish'
            ORDER BY post_date DESC LIMIT 30
        ", ARRAY_A);
    }

    $generos_mujer = mm_generos_mujer();
    $mangas = [];
    foreach ($rows as $row) {
        $item = mm_build_manga_item((int)$row['manga_id'], (int)$row['total_views'], (int)($row['pop_chapter_id'] ?? 0), $generos_mujer);
        if ($item) $mangas[] = $item;
        if (count($mangas) >= 12) break;
    }

    return ['success' => true, 'mangas' => $mangas, 'period' => $period, 'source' => 'fallback'];
}

// ─── ÚLTIMAS ACTUALIZACIONES MUJERES (con datos de capítulo) ─────────────────
function mm_handle_latest_women(WP_REST_Request $req): WP_REST_Response {
    $limit   = min((int)($req->get_param('limit') ?: 18), 36);
    $refresh = $req->get_param('refresh') === '1';

    $cache_key = 'mm_latest_women_v1';
    if (!$refresh) {
        $cached = get_transient($cache_key);
        if ($cached !== false) return new WP_REST_Response($cached, 200);
    }

    global $wpdb;

    // Capítulos más recientes agrupados por serie (ero_seri)
    $chapter_rows = $wpdb->get_results("
        SELECT
            pm_s.meta_value       AS manga_id,
            p.ID                  AS chapter_id,
            p.post_date           AS ch_date,
            pm_ch.meta_value      AS ch_num,
            pm_sell.meta_value    AS sell_meta
        FROM {$wpdb->postmeta} pm_s
        JOIN {$wpdb->posts} p ON p.ID = pm_s.post_id
                              AND p.post_type = 'post'
                              AND p.post_status = 'publish'
        JOIN (
            SELECT meta_value AS seri, MAX(p2.post_date) AS max_date
            FROM {$wpdb->postmeta} pm2
            JOIN {$wpdb->posts} p2 ON p2.ID = pm2.post_id
                                  AND p2.post_type = 'post'
                                  AND p2.post_status = 'publish'
            WHERE pm2.meta_key = 'ero_seri'
            GROUP BY seri
        ) latest ON latest.seri = pm_s.meta_value AND p.post_date = latest.max_date
        JOIN {$wpdb->postmeta} pm_ch ON pm_ch.post_id = p.ID AND pm_ch.meta_key = 'ero_chapter'
        LEFT JOIN {$wpdb->postmeta} pm_sell ON pm_sell.post_id = p.ID AND pm_sell.meta_key = 'myCRED_sell_content'
        WHERE pm_s.meta_key = 'ero_seri'
        ORDER BY p.post_date DESC
        LIMIT 60
    ", ARRAY_A);

    $generos_mujer = mm_generos_mujer();
    $seen_mangas   = [];
    $mangas        = [];

    foreach ($chapter_rows as $row) {
        $manga_id = (int)$row['manga_id'];
        if (isset($seen_mangas[$manga_id])) continue;

        $post = get_post($manga_id);
        if (!$post || $post->post_type !== 'manga' || $post->post_status !== 'publish') continue;

        // Filtrar género
        $terms  = get_the_terms($manga_id, 'genres') ?: [];
        $genres = is_wp_error($terms) ? [] : array_map(fn($t) => $t->name, $terms);
        $gl     = array_map('mb_strtolower', $genres);
        $es_hombre = !empty(array_intersect($gl, ['harem','acción','accion','action','shounen','shonen','seinen','mecha','battle']));
        $es_mujer  = !empty(array_intersect($gl, $generos_mujer)) || empty($genres);
        if ($es_hombre && !$es_mujer) continue;

        // Cover
        $thumb_id = get_post_thumbnail_id($manga_id);
        $cover    = $thumb_id ? wp_get_attachment_url($thumb_id) : 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada';
        $tipo     = get_post_meta($manga_id, 'ero_type', true) ?: 'Manga';

        // Capítulo info
        $sell    = maybe_unserialize($row['sell_meta']);
        $is_paid = is_array($sell) && ($sell['status'] ?? '') === 'enabled' && floatval($sell['price'] ?? 0) > 0;

        $seen_mangas[$manga_id] = true;
        $mangas[] = [
            'id'      => $manga_id,
            'titulo'  => $post->post_title,
            'portada' => $cover,
            'fecha'   => $post->post_date,
            'tipo'    => $tipo,
            'genres'  => $genres,
            'genero'  => 'Mujer',
            'capitulosRecientes' => [[
                'id'       => (int)$row['chapter_id'],
                'numero'   => $row['ch_num'] ?: '1',
                'esGratis' => !$is_paid,
                'fecha'    => $row['ch_date'],
            ]],
        ];

        if (count($mangas) >= $limit) break;
    }

    $response = ['success' => true, 'mangas' => $mangas, 'total' => count($mangas)];
    set_transient($cache_key, $response, 300); // Cache 5 min — siempre "fresco"
    return new WP_REST_Response($response, 200);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function mm_generos_mujer(): array {
    return [
        'romance','drama','reencarnación','reencarnacion','romance obsesivo','comedia',
        'protagonista femenina fuerte','harén inverso','haren inverso','madre','madrastra',
        'otome','gl','yuri','ceo','presidente','manhwa','romance escolar','romance erótico',
        'romance tl','shoujo','shojo','josei','yaoi','bl','boys love','mujer',
        'industria del entretenimiento','vampiro','vampiros',
    ];
}

function mm_date_filter(string $period, string $col = 'viewed_at'): string {
    return match ($period) {
        'weekly'  => "AND {$col} >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
        'monthly' => "AND {$col} >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
        default   => '',
    };
}

function mm_build_manga_item(int $manga_id, int $views, int $pop_ch_id, array $generos_mujer): ?array {
    $post = get_post($manga_id);
    if (!$post || $post->post_status !== 'publish' || $post->post_type !== 'manga') return null;

    $terms  = get_the_terms($manga_id, 'genres') ?: [];
    $genres = is_wp_error($terms) ? [] : array_map(fn($t) => $t->name, $terms);
    $gl     = array_map('mb_strtolower', $genres);

    $es_hombre = !empty(array_intersect($gl, ['harem','acción','accion','action','shounen','shonen','seinen','mecha','battle']));
    $es_mujer  = !empty(array_intersect($gl, $generos_mujer)) || empty($genres);
    if ($es_hombre && !$es_mujer) return null;

    $thumb_id = get_post_thumbnail_id($manga_id);
    $cover    = $thumb_id ? wp_get_attachment_url($thumb_id) : 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada';
    $tipo     = get_post_meta($manga_id, 'ero_type', true) ?: 'Manga';
    $desc     = wp_strip_all_tags($post->post_content);
    if (strlen($desc) > 400) $desc = substr($desc, 0, 397) . '...';

    // Capítulo más popular — si no viene uno específico, buscar el primero de la serie
    if (!$pop_ch_id) {
        global $wpdb;
        $pop_ch_id = (int) $wpdb->get_var($wpdb->prepare("
            SELECT p.ID FROM {$wpdb->posts} p
            JOIN {$wpdb->postmeta} pm_s ON pm_s.post_id = p.ID AND pm_s.meta_key = 'ero_seri' AND CAST(pm_s.meta_value AS UNSIGNED) = %d
            JOIN {$wpdb->postmeta} pm_c ON pm_c.post_id = p.ID AND pm_c.meta_key = 'ero_chapter'
            WHERE p.post_type = 'post' AND p.post_status = 'publish'
            ORDER BY CAST(pm_c.meta_value AS UNSIGNED) ASC LIMIT 1
        ", $manga_id));
    }

    $ch = null;
    if ($pop_ch_id) {
        $ch_post = get_post($pop_ch_id);
        $sell    = get_post_meta($pop_ch_id, 'myCRED_sell_content', true);
        $is_paid = is_array($sell) && ($sell['status'] ?? '') === 'enabled' && floatval($sell['price'] ?? 0) > 0;
        $ch_num  = get_post_meta($pop_ch_id, 'ero_chapter', true) ?: '1';
        $free_at = null;
        if ($is_paid && !empty($sell['expire']) && $ch_post) {
            $days    = intval($sell['expire']);
            $free_at = $days > 0 ? gmdate('c', strtotime($ch_post->post_date_gmt) + $days * DAY_IN_SECONDS) : null;
        }
        $ch = [
            'id'       => $pop_ch_id,
            'numero'   => $ch_num,
            'esGratis' => !$is_paid,
            'fecha'    => $ch_post ? $ch_post->post_date : '',
            'free_at'  => $free_at,
        ];
    }

    return [
        'id'          => $manga_id,
        'titulo'      => $post->post_title,
        'portada'     => $cover,
        'fecha'       => $post->post_date,
        'tipo'        => $tipo,
        'genres'      => $genres,
        'genero'      => 'Mujer',
        'descripcion' => $desc ?: 'Lee esta historia en MangaMukai.',
        'totalViews'  => $views,
        'capitulosRecientes' => $ch ? [$ch] : [],
    ];
}

// ─── RELACIONADOS ─────────────────────────────────────────────────────────────
function mm_handle_related(WP_REST_Request $req): WP_REST_Response {
    $manga_id = (int) $req->get_param('id');
    $limit    = min((int)($req->get_param('limit') ?: 10), 20);

    $cache_key = "mm_related_v2_{$manga_id}";
    $cached    = get_transient($cache_key);
    if ($cached !== false) return new WP_REST_Response($cached, 200);

    global $wpdb;
    
    // 0. Obtener info del manga actual para comparar
    $current_post = get_post($manga_id);
    if (!$current_post) return new WP_REST_Response(['success' => true, 'mangas' => []], 200);
    
    $current_tipo   = get_post_meta($manga_id, 'ero_type', true);
    $current_status = get_post_meta($manga_id, 'ero_status', true);
    
    // Extraer palabras clave del título (más de 3 letras)
    $title_clean = preg_replace('/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/u', '', $current_post->post_title);
    $keywords = array_filter(explode(' ', $title_clean), fn($w) => mb_strlen($w) > 3);
    $keywords = array_slice($keywords, 0, 5); // Tomar máximo 5 palabras

    // 1. Obtener géneros/etiquetas del manga actual
    $genres = [];
    $taxonomies = ['wp-manga-genre', 'wp-manga-tag', 'genres', 'category'];
    foreach ($taxonomies as $tax) {
        $terms = get_the_terms($manga_id, $tax);
        if ($terms && !is_wp_error($terms)) {
            $genres = array_unique(array_merge($genres, array_map(fn($t) => $t->name, $terms)));
        }
    }
    
    // Fallback: manga_tags meta
    if (empty($genres)) {
        $tags_raw = get_post_meta($manga_id, 'manga_tags', true);
        if (!empty($tags_raw)) {
            $tags_data = maybe_unserialize($tags_raw);
            if (is_array($tags_data)) {
                $genres = array_values(array_filter(array_map('strval', $tags_data)));
            }
        }
    }

    // 2. Construir Query de Candidatos
    // Usamos una tabla temporal de IDs de series que tienen capítulos para filtrar rápido
    $series_with_chapters_sql = "SELECT DISTINCT meta_value FROM {$wpdb->postmeta} WHERE meta_key = 'ero_seri'";
    
    $select = "
        SELECT 
            p.ID, p.post_title, p.post_date,
            att.guid           AS cover_url,
            pm_tipo.meta_value AS tipo,
            pm_cv.meta_value   AS custom_cover,
            pm_st.meta_value   AS status,
            0                  AS score
    ";
    
    $from = "
        FROM {$wpdb->posts} p
        LEFT JOIN {$wpdb->postmeta} pm_thumb ON pm_thumb.post_id = p.ID AND pm_thumb.meta_key = '_thumbnail_id'
        LEFT JOIN {$wpdb->posts} att          ON att.ID = pm_thumb.meta_value
        LEFT JOIN {$wpdb->postmeta} pm_tipo   ON pm_tipo.post_id = p.ID AND pm_tipo.meta_key = 'ero_type'
        LEFT JOIN {$wpdb->postmeta} pm_cv     ON pm_cv.post_id = p.ID AND pm_cv.meta_key = 'manga_cover'
        LEFT JOIN {$wpdb->postmeta} pm_st     ON pm_st.post_id = p.ID AND pm_st.meta_key = 'ero_status'
    ";
    
    $where = "
        WHERE p.post_type = 'manga' 
          AND p.post_status = 'publish' 
          AND p.ID != %d
          AND p.ID IN ($series_with_chapters_sql)
    ";

    // Buscamos candidatos que compartan géneros O tengan palabras clave en el título
    $candidate_ids = [];
    if (!empty($genres) || !empty($keywords)) {
        $genre_placeholders = !empty($genres) ? implode(',', array_fill(0, count($genres), '%s')) : "''";
        
        $search_where = $where;
        $search_args = [$manga_id];
        
        $genre_clause = "";
        if (!empty($genres)) {
            $search_args = array_merge($genres, $search_args);
            $genre_clause = "EXISTS (
                SELECT 1 FROM {$wpdb->term_relationships} tr_inner
                JOIN {$wpdb->term_taxonomy} tt_inner ON tt_inner.term_taxonomy_id = tr_inner.term_taxonomy_id
                JOIN {$wpdb->terms} t_inner ON t_inner.term_id = tt_inner.term_id
                WHERE tr_inner.object_id = p.ID 
                  AND tt_inner.taxonomy IN ('wp-manga-genre', 'wp-manga-tag', 'genres', 'category')
                  AND t_inner.name IN ($genre_placeholders)
            )";
        }
        
        $keyword_clause = "";
        if (!empty($keywords)) {
            $k_parts = [];
            foreach ($keywords as $kw) {
                $k_parts[] = "p.post_title LIKE %s";
                $search_args[] = '%' . $kw . '%';
            }
            $keyword_clause = "(" . implode(' OR ', $k_parts) . ")";
        }
        
        $final_search_clause = $genre_clause ?: "1=1";
        if ($keyword_clause) {
            $final_search_clause = "($final_search_clause OR $keyword_clause)";
        }
        
        $candidates = $wpdb->get_results(
            $wpdb->prepare("$select $from $search_where AND $final_search_clause LIMIT 100", ...$search_args),
            ARRAY_A
        );
    } else {
        $candidates = [];
    }

    // 3. Fallback: si hay pocos candidatos, rellenar con los más recientes con capítulos
    if (count($candidates) < $limit) {
        $exclude_ids = array_merge([$manga_id], array_column($candidates, 'ID'));
        $exclude_placeholders = implode(',', array_fill(0, count($exclude_ids), '%d'));
        
        $more = $wpdb->get_results(
            $wpdb->prepare(
                "$select $from $where AND p.ID NOT IN ($exclude_placeholders) ORDER BY p.post_date DESC LIMIT 20",
                ...$exclude_ids
            ),
            ARRAY_A
        );
        $candidates = array_merge($candidates, $more);
    }

    if (empty($candidates)) {
        return new WP_REST_Response(['success' => true, 'mangas' => []], 200);
    }

    // 4. Scoring dinámico en PHP para mayor flexibilidad
    foreach ($candidates as &$c) {
        $score = 0;
        $cid = (int)$c['ID'];
        
        // Coincidencia de géneros
        $c_genres = [];
        foreach ($taxonomies as $tax) {
            $t = get_the_terms($cid, $tax);
            if ($t && !is_wp_error($t)) {
                $c_genres = array_merge($c_genres, array_map(fn($term) => $term->name, $t));
            }
        }
        $common = array_intersect($genres, $c_genres);
        $score += count($common) * 10;
        $c['shared_count'] = count($common);
        $c['all_genres'] = array_values(array_unique($c_genres));
        
        // Coincidencia de Tipo
        if ($current_tipo && $c['tipo'] === $current_tipo) $score += 15;
        
        // Coincidencia de Estado
        if ($current_status && $c['status'] === $current_status) $score += 5;
        
        // Coincidencia de Título
        foreach ($keywords as $kw) {
            if (stripos($c['post_title'], $kw) !== false) $score += 20;
        }
        
        $c['final_score'] = $score;
    }
    unset($c);

    // Ordenar por score
    usort($candidates, fn($a, $b) => $b['final_score'] <=> $a['final_score']);

    // 5. Construir respuesta final
    $mangas = [];
    foreach (array_slice($candidates, 0, $limit) as $c) {
        $mangas[] = [
            'id'           => (int)$c['ID'],
            'titulo'       => $c['post_title'],
            'portada'      => $c['custom_cover'] ?: ($c['cover_url'] ?: 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada'),
            'tipo'         => $c['tipo'] ?: 'Manga',
            'genres'       => array_slice($c['all_genres'], 0, 3),
            'totalViews'   => 0, // Podría integrarse con el tracker si fuera necesario
            'sharedGenres' => (int)$c['shared_count'],
        ];
    }

    $response = ['success' => true, 'mangas' => $mangas];
    if (!empty($mangas)) {
        set_transient($cache_key, $response, 3600); // 1 hora de caché
    }
    return new WP_REST_Response($response, 200);
}
