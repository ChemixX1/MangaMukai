<?php
/**
 * Plugin Name: MangaMukai Chapter Category Fix
 * Description: Al crear un capitulo desde una serie, el tema mangareader (assets/js/autopick-manga.js) intenta marcar la categoria de la serie y muestra "Cannot auto select post category" cuando la casilla no existe. Este mu-plugin localiza (o crea) la categoria de la serie y la deja marcada sin avisos.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

function mm_ccf_term_payload(WP_Term $term): array {
    return ['term_id' => (int) $term->term_id, 'name' => (string) $term->name, 'slug' => (string) $term->slug];
}

/**
 * Categoria (taxonomia "category") de una serie. Orden de busqueda: meta guardada
 * por el tema, slug igual al de la serie, nombre igual al titulo. Si no existe y
 * se permite, la crea con el mismo nombre y slug que la serie (es la convencion
 * del tema: una categoria por serie para agrupar sus capitulos).
 */
function mm_ccf_series_category(int $manga_id, bool $allow_create): array {
    $manga = get_post($manga_id);
    if (!$manga || $manga->post_type !== 'manga') {
        return ['category' => null, 'created' => false, 'error' => 'La serie no existe.'];
    }

    $title = trim(wp_strip_all_tags((string) $manga->post_title));
    $slug  = $manga->post_name ?: sanitize_title($title);

    $candidates = [];
    foreach (['ero_category', 'ero_cat', 'manga_category', 'ts_category', '_manga_category', 'category_id'] as $key) {
        $stored = get_post_meta($manga_id, $key, true);
        if (is_numeric($stored) && (int) $stored > 0) $candidates[] = get_term((int) $stored, 'category');
    }
    if ($slug !== '') $candidates[] = get_term_by('slug', $slug, 'category');
    if ($title !== '') $candidates[] = get_term_by('name', $title, 'category');

    foreach ($candidates as $term) {
        if ($term instanceof WP_Term && $term->taxonomy === 'category') {
            return ['category' => mm_ccf_term_payload($term), 'created' => false, 'error' => ''];
        }
    }

    if ($title === '') return ['category' => null, 'created' => false, 'error' => 'La serie no tiene titulo.'];
    if (!$allow_create) return ['category' => null, 'created' => false, 'error' => 'No existe una categoria para esta serie.'];

    $result = wp_insert_term($title, 'category', ['slug' => $slug]);
    if (is_wp_error($result)) {
        $existing = (int) $result->get_error_data('term_exists');
        $term = $existing ? get_term($existing, 'category') : null;
        if ($term instanceof WP_Term) return ['category' => mm_ccf_term_payload($term), 'created' => false, 'error' => ''];
        return ['category' => null, 'created' => false, 'error' => $result->get_error_message()];
    }

    $term = get_term((int) $result['term_id'], 'category');
    return [
        'category' => $term instanceof WP_Term ? mm_ccf_term_payload($term) : null,
        'created'  => $term instanceof WP_Term,
        'error'    => $term instanceof WP_Term ? '' : 'No se pudo leer la categoria creada.',
    ];
}

add_action('rest_api_init', static function () {
    register_rest_route('mangamukai/v1', '/admin/chapter-category', [
        'methods'             => WP_REST_Server::READABLE,
        'permission_callback' => static function () {
            return current_user_can('edit_posts');
        },
        'callback'            => static function (WP_REST_Request $request) {
            $manga_id = absint($request->get_param('manga'));
            if (!$manga_id) return new WP_Error('mm_ccf_invalid', 'Falta el ID de la serie.', ['status' => 400]);
            $data = mm_ccf_series_category($manga_id, current_user_can('manage_categories'));
            $response = rest_ensure_response(['success' => $data['category'] !== null] + $data);
            $response->header('Cache-Control', 'no-store');
            return $response;
        },
    ]);
});

function mm_ccf_inline_js(): string {
    return <<<'JS'
(function () {
    var cfg = window.mmChapterCategoryFix || {};
    var ALERT_PREFIX = 'Cannot auto select post category';
    var state = { done: false, busy: false };

    function termFromTheme() {
        var info = window.ts_manga_info;
        if (!info || typeof info !== 'object') return null;
        var cat = info.category;
        if (cat && typeof cat === 'object' && parseInt(cat.term_id, 10) > 0) {
            return { term_id: parseInt(cat.term_id, 10), name: cat.name || cat.cat_name || '' };
        }
        if (parseInt(cat, 10) > 0) return { term_id: parseInt(cat, 10), name: '' };
        return null;
    }

    function ensureChecked(term) {
        var id = parseInt(term && term.term_id, 10);
        if (!id) return false;
        var input = document.getElementById('in-category-' + id);
        if (!input) {
            var list = document.getElementById('categorychecklist');
            if (list) {
                var li = document.createElement('li');
                li.id = 'category-' + id;
                var label = document.createElement('label');
                label.className = 'selectit';
                input = document.createElement('input');
                input.type = 'checkbox';
                input.name = 'post_category[]';
                input.value = String(id);
                input.id = 'in-category-' + id;
                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + (term.name || ('Categoria #' + id))));
                li.appendChild(label);
                list.insertBefore(li, list.firstChild);
            } else {
                var form = document.getElementById('post');
                if (!form) return false;
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'post_category[]';
                input.value = String(id);
                input.id = 'in-category-' + id;
                form.appendChild(input);
            }
        }
        if (!input.checked) {
            input.checked = true;
            if (window.jQuery) window.jQuery(input).trigger('change');
        }
        var row = document.getElementById('category-' + id);
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
        return true;
    }

    function resolveOnServer(done) {
        var info = window.ts_manga_info;
        var mangaId = info ? parseInt(info.ID, 10) : 0;
        if (!mangaId || !cfg.endpoint || !window.fetch) return done(null);
        var url = cfg.endpoint + (cfg.endpoint.indexOf('?') >= 0 ? '&' : '?') + 'manga=' + mangaId;
        window.fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': cfg.nonce || '' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (data) { done(data && data.success && data.category ? data.category : null); })
            .catch(function () { done(null); });
    }

    function fix(reason) {
        if (state.done || state.busy) return;
        var known = termFromTheme();
        if (known && document.getElementById('in-category-' + known.term_id)) {
            state.done = true;
            ensureChecked(known);
            return;
        }
        // La casilla no existe (o el tema no trae term_id): pedimos al servidor la
        // categoria real de la serie, que la crea si hace falta, y la marcamos.
        state.busy = true;
        resolveOnServer(function (remote) {
            state.busy = false;
            state.done = true;
            var term = remote || known;
            if (term) {
                ensureChecked(term);
            } else if (window.console) {
                window.console.warn('MangaMukai: no se pudo determinar la categoria de la serie (' + reason + ').');
            }
        });
    }

    // 1) Interceptar el aviso del tema antes de que llegue al usuario.
    var nativeAlert = window.alert;
    window.alert = function (message) {
        if (typeof message === 'string' && message.indexOf(ALERT_PREFIX) === 0) {
            fix('alert');
            return undefined;
        }
        return nativeAlert.apply(window, arguments);
    };

    // 2) Marcar la categoria en cuanto cargue el editor (antes que autopick-manga.js).
    if (window.jQuery) {
        window.jQuery(function () { if (window.ts_manga_info) fix('ready'); });
    } else {
        document.addEventListener('DOMContentLoaded', function () { if (window.ts_manga_info) fix('ready'); });
    }
})();
JS;
}

add_action('admin_enqueue_scripts', static function ($hook) {
    if (!in_array($hook, ['post.php', 'post-new.php'], true)) return;
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'post') return;

    $config = [
        'endpoint' => rest_url('mangamukai/v1/admin/chapter-category'),
        'nonce'    => wp_create_nonce('wp_rest'),
    ];
    wp_register_script('mm-chapter-category-fix', false, ['jquery'], '1.0.0', false);
    wp_enqueue_script('mm-chapter-category-fix');
    wp_add_inline_script(
        'mm-chapter-category-fix',
        'window.mmChapterCategoryFix = ' . wp_json_encode($config) . ";\n" . mm_ccf_inline_js()
    );
});
