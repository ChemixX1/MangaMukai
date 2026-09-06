<?php
/**
 * Plugin Name: MangaMukai Manga Editor
 * Description: Selector de tags para las fichas de manga, portada propia para cada capitulo y liberacion programada de capitulos de pago. Expone los campos en /mangamukai/v1/series/{id}/chapters sin tocar el endpoint original.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

const MM_CH_COVER   = '_mm_chapter_cover';
const MM_CH_FREE_AT = '_mm_chapter_free_at';   // UTC, 'Y-m-d H:i:s'
const MM_CH_AUTO    = '_mm_chapter_auto_free';
const MM_CH_FREED   = '_mm_chapter_freed';
const MM_CH_BACKUP  = '_mm_chapter_paid_backup';
const MM_SELL_META  = 'myCRED_sell_content';

/* =========================================================================
 * 1. TAGS DE LA FICHA DE MANGA
 * ====================================================================== */

/** mb_strtolower no siempre esta disponible en hosting compartido. */
function mm_editor_lower($value): string {
    $value = (string) $value;
    return function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
}

/**
 * Detecta donde guarda los tags este WordPress: una taxonomia asociada al tipo
 * 'manga' o un meta con la lista. Asi el selector escribe en el mismo sitio que
 * el campo de texto que se usaba a mano.
 */
function mm_editor_tag_source(): array {
    static $source = null;
    if ($source !== null) return $source;

    $taxonomies = array_diff(get_object_taxonomies('manga'), ['post_format']);
    foreach (['manga_tag', 'manga_tags', 'wp-manga-genre', 'genres', 'genero', 'post_tag', 'category'] as $preferred) {
        if (in_array($preferred, $taxonomies, true)) {
            return $source = ['type' => 'taxonomy', 'key' => $preferred];
        }
    }
    if ($taxonomies) {
        return $source = ['type' => 'taxonomy', 'key' => reset($taxonomies)];
    }

    global $wpdb;
    foreach (['manga_tags', 'manga_genre', 'ero_genre', 'ero_tags', 'ero_type'] as $meta_key) {
        $found = $wpdb->get_var($wpdb->prepare(
            "SELECT pm.meta_id FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'manga'
             WHERE pm.meta_key = %s AND pm.meta_value <> '' LIMIT 1",
            $meta_key
        ));
        if ($found) return $source = ['type' => 'meta', 'key' => $meta_key];
    }

    return $source = ['type' => 'meta', 'key' => 'manga_tags'];
}

/** Convierte cualquier formato guardado (array, serializado o "a, b") en lista. */
function mm_editor_split_tags($value): array {
    $value = maybe_unserialize($value);
    $parts = is_array($value) ? $value : preg_split('/[,|]+/u', (string) $value);
    $tags = [];
    foreach ((array) $parts as $part) {
        $part = trim(wp_strip_all_tags((string) $part));
        if ($part !== '') $tags[$part] = $part;
    }
    return array_values($tags);
}

/** Tags ya usados en el sitio: es el vocabulario que ofrece el selector. */
function mm_editor_tag_vocabulary(): array {
    $source = mm_editor_tag_source();

    if ($source['type'] === 'taxonomy') {
        $terms = get_terms(['taxonomy' => $source['key'], 'hide_empty' => false, 'number' => 500]);
        return is_wp_error($terms) ? [] : wp_list_pluck($terms, 'name');
    }

    global $wpdb;
    $rows = $wpdb->get_col($wpdb->prepare(
        "SELECT DISTINCT pm.meta_value FROM {$wpdb->postmeta} pm
         INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'manga'
         WHERE pm.meta_key = %s AND pm.meta_value <> '' LIMIT 2000",
        $source['key']
    ));

    $vocabulary = [];
    foreach ($rows as $row) {
        foreach (mm_editor_split_tags($row) as $tag) $vocabulary[mm_editor_lower($tag)] = $tag;
    }
    ksort($vocabulary);
    return array_values($vocabulary);
}

/** Tags actuales de una ficha. */
function mm_editor_post_tags($post_id): array {
    $source = mm_editor_tag_source();
    if ($source['type'] === 'taxonomy') {
        $terms = wp_get_object_terms($post_id, $source['key'], ['fields' => 'names']);
        return is_wp_error($terms) ? [] : $terms;
    }
    return mm_editor_split_tags(get_post_meta($post_id, $source['key'], true));
}

add_action('add_meta_boxes', static function () {
    add_meta_box('mm_manga_tags', 'Tags del manga (selector)', 'mm_editor_tags_box', 'manga', 'side', 'high');
    add_meta_box('mm_chapter_box', 'Capítulo MangaMukai', 'mm_editor_chapter_box', 'post', 'normal', 'high');
});

/**
 * El selector de imagenes necesita la libreria de medios. El editor clasico
 * suele cargarla con el boton "Anadir medios", pero no esta garantizado.
 */
add_action('admin_enqueue_scripts', static function ($hook) {
    // Sin filtrar por tipo de contenido: en post-new.php el post global aun no
    // esta disponible y el selector se quedaba sin biblioteca de medios.
    if (!in_array($hook, ['post.php', 'post-new.php'], true)) return;
    wp_enqueue_media();
});

function mm_editor_tags_box($post) {
    $source = mm_editor_tag_source();
    $selected = mm_editor_post_tags($post->ID);
    $vocabulary = mm_editor_tag_vocabulary();
    foreach ($selected as $tag) {
        if (!in_array($tag, $vocabulary, true)) $vocabulary[] = $tag;
    }
    $lower_selected = array_map('mm_editor_lower', $selected);

    wp_nonce_field('mm_manga_tags_save', 'mm_manga_tags_nonce');
    ?>
    <style>
        .mm-tags-search { width: 100%; margin-bottom: 8px; }
        .mm-tags-list { max-height: 260px; overflow-y: auto; border: 1px solid #dcdcde; border-radius: 4px; padding: 8px; background: #fff; }
        .mm-tags-list label { display: block; padding: 3px 2px; font-size: 13px; cursor: pointer; }
        .mm-tags-list label.mm-hidden { display: none; }
        .mm-tags-new { display: flex; gap: 6px; margin-top: 8px; }
        .mm-tags-new input { flex: 1; }
        .mm-tags-count { color: #646970; font-size: 12px; margin-top: 6px; }
    </style>
    <p class="description" style="margin-bottom:8px">
        Marca los tags. Lo que quede marcado aquí es lo que se guarda
        (<?php echo esc_html($source['type'] === 'taxonomy' ? 'taxonomía ' . $source['key'] : 'campo ' . $source['key']); ?>).
    </p>
    <input type="search" class="mm-tags-search" id="mm-tags-search" placeholder="Buscar tag..." autocomplete="off" />
    <div class="mm-tags-list" id="mm-tags-list">
        <?php if (!$vocabulary) : ?>
            <p class="description" style="margin:0">Todavía no hay tags. Escribe el primero abajo.</p>
        <?php endif; ?>
        <?php foreach ($vocabulary as $tag) : ?>
            <label>
                <input type="checkbox" name="mm_manga_tags[]" value="<?php echo esc_attr($tag); ?>"
                    <?php checked(in_array(mm_editor_lower($tag), $lower_selected, true)); ?> />
                <?php echo esc_html($tag); ?>
            </label>
        <?php endforeach; ?>
    </div>
    <div class="mm-tags-new">
        <input type="text" id="mm-tags-new-value" placeholder="Nuevo tag" />
        <button type="button" class="button" id="mm-tags-new-add">Añadir</button>
    </div>
    <p class="mm-tags-count" id="mm-tags-count"></p>
    <script>
    (function () {
        var list = document.getElementById('mm-tags-list');
        var search = document.getElementById('mm-tags-search');
        var newValue = document.getElementById('mm-tags-new-value');
        var addButton = document.getElementById('mm-tags-new-add');
        var counter = document.getElementById('mm-tags-count');
        if (!list) return;

        function refresh() {
            var total = list.querySelectorAll('input[type=checkbox]:checked').length;
            counter.textContent = total + (total === 1 ? ' tag seleccionado' : ' tags seleccionados');
        }

        search.addEventListener('input', function () {
            var needle = search.value.toLowerCase().trim();
            list.querySelectorAll('label').forEach(function (label) {
                label.classList.toggle('mm-hidden', needle !== '' && label.textContent.toLowerCase().indexOf(needle) === -1);
            });
        });

        list.addEventListener('change', refresh);

        function addTag() {
            var value = (newValue.value || '').trim();
            if (!value) return;
            var exists = false;
            list.querySelectorAll('input[type=checkbox]').forEach(function (input) {
                if (input.value.toLowerCase() === value.toLowerCase()) { input.checked = true; exists = true; }
            });
            if (!exists) {
                var label = document.createElement('label');
                var input = document.createElement('input');
                input.type = 'checkbox';
                input.name = 'mm_manga_tags[]';
                input.value = value;
                input.checked = true;
                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + value));
                list.insertBefore(label, list.firstChild);
            }
            newValue.value = '';
            search.value = '';
            search.dispatchEvent(new Event('input'));
            refresh();
        }

        addButton.addEventListener('click', addTag);
        newValue.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') { event.preventDefault(); addTag(); }
        });
        refresh();
    })();
    </script>
    <?php
}

add_action('save_post_manga', static function ($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!isset($_POST['mm_manga_tags_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['mm_manga_tags_nonce'])), 'mm_manga_tags_save')) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $raw = isset($_POST['mm_manga_tags']) ? (array) wp_unslash($_POST['mm_manga_tags']) : [];
    $tags = [];
    foreach ($raw as $tag) {
        $tag = trim(sanitize_text_field($tag));
        if ($tag !== '') $tags[mm_editor_lower($tag)] = $tag;
    }
    $tags = array_values($tags);

    $source = mm_editor_tag_source();
    if ($source['type'] === 'taxonomy') {
        wp_set_object_terms($post_id, $tags, $source['key'], false);
        return;
    }

    // Respeta el formato que ya tenia guardado la ficha (array o "a, b").
    $current = get_post_meta($post_id, $source['key'], true);
    $as_array = is_array(maybe_unserialize($current));
    update_post_meta($post_id, $source['key'], $as_array ? $tags : implode(', ', $tags));
}, 30, 1);

/* =========================================================================
 * 2. CAPITULOS: PORTADA PROPIA Y LIBERACION PROGRAMADA
 * ====================================================================== */

/**
 * Portada del capitulo. Primero la del selector propio y, si no hay, la imagen
 * destacada del capitulo (asi funciona tambien para los capitulos que ya la
 * tienen puesta). Si devuelve '' la web usa la pagina provisional.
 */
function mm_chapter_cover_url($post_id): string {
    $stored = get_post_meta($post_id, MM_CH_COVER, true);
    if (is_numeric($stored) && (int) $stored > 0) {
        $url = wp_get_attachment_url((int) $stored);
        if ($url) return set_url_scheme($url, 'https');
    }
    if (is_string($stored) && filter_var($stored, FILTER_VALIDATE_URL)) {
        return set_url_scheme($stored, 'https');
    }

    $featured = get_the_post_thumbnail_url($post_id, 'medium_large');
    return $featured ? set_url_scheme($featured, 'https') : '';
}

/** Fecha de liberacion en ISO 8601 UTC, o null. */
function mm_chapter_free_at_iso($post_id): ?string {
    $stored = trim((string) get_post_meta($post_id, MM_CH_FREE_AT, true));
    if ($stored === '') return null;
    $timestamp = strtotime($stored . ' UTC');
    return $timestamp ? gmdate('Y-m-d\TH:i:s\Z', $timestamp) : null;
}

/**
 * Si al capitulo le toca ser gratis, desactiva la venta (guardando copia para
 * poder revertirla) y lo marca como liberado. Devuelve true si lo ha liberado.
 */
function mm_chapter_release_if_due($post_id): bool {
    if (get_post_meta($post_id, MM_CH_FREED, true) === '1') return false;
    if (get_post_meta($post_id, MM_CH_AUTO, true) !== '1') return false;

    $due = trim((string) get_post_meta($post_id, MM_CH_FREE_AT, true));
    if ($due === '') return false;
    $timestamp = strtotime($due . ' UTC');
    if (!$timestamp || $timestamp > time()) return false;

    $sell = get_post_meta($post_id, MM_SELL_META, true);
    if (is_array($sell) && $sell) {
        update_post_meta($post_id, MM_CH_BACKUP, $sell);
        $sell['status'] = 'disabled';
        $sell['price'] = 0;
        update_post_meta($post_id, MM_SELL_META, $sell);
    }
    update_post_meta($post_id, MM_CH_FREED, '1');
    return true;
}

/** Devuelve el capitulo a su estado de pago original. */
function mm_chapter_restore_paid($post_id): void {
    $backup = get_post_meta($post_id, MM_CH_BACKUP, true);
    if (is_array($backup) && $backup) update_post_meta($post_id, MM_SELL_META, $backup);
    delete_post_meta($post_id, MM_CH_BACKUP);
    delete_post_meta($post_id, MM_CH_FREED);
}

function mm_editor_chapter_box($post) {
    $series_id = absint(get_post_meta($post->ID, 'ero_seri', true));
    $series = $series_id ? get_post($series_id) : null;
    $cover_id = (int) get_post_meta($post->ID, MM_CH_COVER, true);
    $cover_url = $cover_id ? wp_get_attachment_image_url($cover_id, 'medium') : '';
    // Sin portada propia se usa la imagen destacada, si el capítulo tiene una.
    $fallback_cover = $cover_url ? '' : get_the_post_thumbnail_url($post->ID, 'medium');
    $free_at = trim((string) get_post_meta($post->ID, MM_CH_FREE_AT, true));
    $local_free_at = $free_at ? get_date_from_gmt($free_at, 'Y-m-d\TH:i') : '';
    $auto = get_post_meta($post->ID, MM_CH_AUTO, true);
    $freed = get_post_meta($post->ID, MM_CH_FREED, true) === '1';
    $sell = get_post_meta($post->ID, MM_SELL_META, true);
    $is_paid = is_array($sell) && ($sell['status'] ?? '') !== 'disabled' && (float) ($sell['price'] ?? 0) > 0;

    wp_nonce_field('mm_chapter_save', 'mm_chapter_nonce');
    ?>
    <style>
        .mm-chapter-grid { display: grid; gap: 20px; grid-template-columns: 260px minmax(0, 1fr); align-items: start; }
        .mm-chapter-grid label { display: block; font-weight: 600; margin-bottom: 6px; }
        .mm-chapter-hint { color: #646970; font-size: 12px; margin: 6px 0 0; }
        .mm-chapter-cover { border: 1px dashed #c3c4c7; border-radius: 6px; padding: 10px; text-align: center; background: #fbfbfc; }
        .mm-chapter-cover img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto 8px; }
        .mm-chapter-state { display: inline-block; border-radius: 3px; padding: 2px 8px; font-size: 12px; font-weight: 600; }
        .mm-chapter-state.is-paid { background: #fcf0e3; color: #8a4b08; }
        .mm-chapter-state.is-free { background: #e6f4ea; color: #1c6b34; }
        @media (max-width: 782px) { .mm-chapter-grid { grid-template-columns: 1fr; } }
    </style>
    <div class="mm-chapter-grid">
        <div>
            <label>Portada del capítulo</label>
            <div class="mm-chapter-cover" id="mm-chapter-cover-preview">
                <?php if ($cover_url) : ?>
                    <img src="<?php echo esc_url($cover_url); ?>" alt="" />
                <?php elseif ($fallback_cover) : ?>
                    <img src="<?php echo esc_url($fallback_cover); ?>" alt="" style="opacity:.75" />
                    <p class="mm-chapter-hint" style="margin:0">Usando la imagen destacada del capítulo.</p>
                <?php else : ?>
                    <p class="mm-chapter-hint" style="margin:14px 0">Sin portada: la web usa la primera página del capítulo.</p>
                <?php endif; ?>
            </div>
            <input type="hidden" id="mm_chapter_cover" name="mm_chapter_cover" value="<?php echo esc_attr($cover_id ?: ''); ?>" />
            <p style="margin-top:8px">
                <button type="button" class="button" id="mm-chapter-cover-pick">Elegir imagen</button>
                <button type="button" class="button-link" id="mm-chapter-cover-clear">Quitar</button>
            </p>
            <p class="mm-chapter-hint">Recomendado 400 x 300 px (4:3). Si no subes ninguna, se sigue usando la imagen provisional.</p>
        </div>

        <div>
            <p style="margin-top:0">
                <strong>Serie:</strong>
                <?php if ($series) : ?>
                    <a href="<?php echo esc_url(get_edit_post_link($series->ID)); ?>"><?php echo esc_html(get_the_title($series)); ?></a>
                <?php else : ?>
                    <em>sin serie asignada (campo ero_seri vacío)</em>
                <?php endif; ?>
                &nbsp;
                <span class="mm-chapter-state <?php echo $is_paid ? 'is-paid' : 'is-free'; ?>">
                    <?php echo $is_paid ? 'De pago · ' . (int) ($sell['price'] ?? 0) . ' monedas' : 'Gratis'; ?>
                </span>
            </p>

            <label for="mm_chapter_free_at">Gratis a partir de</label>
            <input type="datetime-local" id="mm_chapter_free_at" name="mm_chapter_free_at" value="<?php echo esc_attr($local_free_at); ?>" />
            <p class="mm-chapter-hint">
                Hora del sitio (<?php echo esc_html(wp_timezone_string()); ?>). En la web aparece la cuenta atrás
                "¡Gratis en!" junto al precio y, al llegar la fecha, el capítulo pasa a gratis solo.
            </p>

            <p style="margin-top:14px">
                <label style="font-weight:600">
                    <input type="checkbox" name="mm_chapter_auto_free" value="1" <?php checked($auto === '1' || ($auto === '' && $free_at !== '')); ?> />
                    Desbloquear automáticamente al llegar la fecha
                </label>
                <span class="mm-chapter-hint" style="display:block">
                    Si lo desmarcas, la cuenta atrás se muestra igual pero el capítulo sigue siendo de pago.
                </span>
            </p>

            <?php if ($freed) : ?>
                <p style="margin-top:14px">
                    <label style="font-weight:600; color:#8a4b08">
                        <input type="checkbox" name="mm_chapter_restore_paid" value="1" />
                        Volver a ponerlo de pago (restaura el precio que tenía)
                    </label>
                </p>
            <?php endif; ?>

            <p class="mm-chapter-hint">Vacía la fecha para cancelar la liberación programada.</p>
        </div>
    </div>
    <script>
    (function () {
        // La libreria de medios se carga en el pie de pagina, asi que wp.media
        // todavia no existe mientras se dibuja esta caja: se comprueba al pulsar.
        function init() {
            var frame;
            var input = document.getElementById('mm_chapter_cover');
            var preview = document.getElementById('mm-chapter-cover-preview');
            var pick = document.getElementById('mm-chapter-cover-pick');
            var clear = document.getElementById('mm-chapter-cover-clear');
            if (!input || !pick || !clear) return;

            pick.addEventListener('click', function (event) {
                event.preventDefault();
                if (!window.wp || !window.wp.media) {
                    window.alert('La biblioteca de medios no ha cargado en esta pantalla. Recarga la página e inténtalo otra vez.');
                    return;
                }
                frame = frame || wp.media({ title: 'Portada del capítulo', button: { text: 'Usar imagen' }, multiple: false });
                frame.off('select').on('select', function () {
                    var image = frame.state().get('selection').first().toJSON();
                    input.value = image.id;
                    var url = (image.sizes && image.sizes.medium ? image.sizes.medium.url : image.url);
                    preview.innerHTML = '';
                    var img = document.createElement('img');
                    img.alt = '';
                    img.src = url;
                    preview.appendChild(img);
                });
                frame.open();
            });

            clear.addEventListener('click', function (event) {
                event.preventDefault();
                input.value = '';
                preview.innerHTML = '<p class="mm-chapter-hint" style="margin:14px 0">Sin portada: la web usa la imagen destacada o la primera página del capítulo.</p>';
            });
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    })();
    </script>
    <?php
}

add_action('save_post_post', static function ($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!isset($_POST['mm_chapter_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['mm_chapter_nonce'])), 'mm_chapter_save')) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $cover = isset($_POST['mm_chapter_cover']) ? absint($_POST['mm_chapter_cover']) : 0;
    if ($cover) update_post_meta($post_id, MM_CH_COVER, $cover);
    else delete_post_meta($post_id, MM_CH_COVER);

    $local = isset($_POST['mm_chapter_free_at']) ? sanitize_text_field(wp_unslash($_POST['mm_chapter_free_at'])) : '';
    if ($local !== '') {
        // El input viaja en hora del sitio; se guarda en UTC para que la web y el
        // cron comparen siempre contra la misma referencia.
        $normalized = str_replace('T', ' ', $local);
        if (strlen($normalized) === 16) $normalized .= ':00';
        update_post_meta($post_id, MM_CH_FREE_AT, get_gmt_from_date($normalized, 'Y-m-d H:i:s'));
        update_post_meta($post_id, MM_CH_AUTO, isset($_POST['mm_chapter_auto_free']) ? '1' : '0');
    } else {
        delete_post_meta($post_id, MM_CH_FREE_AT);
        delete_post_meta($post_id, MM_CH_AUTO);
    }

    if (!empty($_POST['mm_chapter_restore_paid'])) {
        mm_chapter_restore_paid($post_id);
    } elseif ($local !== '') {
        mm_chapter_release_if_due($post_id);
    }
}, 30, 1);

/** Repaso periodico por si nadie visita la ficha del manga. */
add_action('init', static function () {
    if (!wp_next_scheduled('mm_chapter_release_scan')) {
        wp_schedule_event(time() + 300, 'hourly', 'mm_chapter_release_scan');
    }
});

add_action('mm_chapter_release_scan', static function () {
    $due = get_posts([
        'post_type' => 'post',
        'post_status' => 'publish',
        'numberposts' => 200,
        'fields' => 'ids',
        'meta_query' => [
            ['key' => MM_CH_AUTO, 'value' => '1'],
            ['key' => MM_CH_FREED, 'compare' => 'NOT EXISTS'],
            ['key' => MM_CH_FREE_AT, 'value' => gmdate('Y-m-d H:i:s'), 'compare' => '<='],
        ],
    ]);
    foreach ($due as $post_id) mm_chapter_release_if_due($post_id);
});

/* =========================================================================
 * 3. EXPOSICION EN LA API (aditiva, sin tocar el endpoint original)
 * ====================================================================== */

add_filter('rest_post_dispatch', static function ($response, $server, $request) {
    if (!($response instanceof WP_REST_Response) || !($request instanceof WP_REST_Request)) return $response;
    if (!preg_match('~/mangamukai/v1/series/\d+/chapters~', (string) $request->get_route())) return $response;

    $data = $response->get_data();
    if (empty($data['chapters']) || !is_array($data['chapters'])) return $response;

    $released = 0;
    foreach ($data['chapters'] as &$chapter) {
        $id = isset($chapter['id']) ? (int) $chapter['id'] : 0;
        if (!$id) continue;

        // Liberar aqui hace que el cambio se vea en cuanto alguien abre la ficha,
        // sin esperar al cron. El limite evita alargar la peticion.
        if ($released < 25 && mm_chapter_release_if_due($id)) {
            $released++;
            $chapter['is_paid'] = false;
            $chapter['price_coins'] = 0;
        }

        $chapter['cover_url'] = mm_chapter_cover_url($id);
        $free_at = mm_chapter_free_at_iso($id);
        if ($free_at && empty($chapter['free_at'])) $chapter['free_at'] = $free_at;
    }
    unset($chapter);

    $response->set_data($data);
    return $response;
}, 20, 3);

add_action('rest_api_init', static function () {
    register_rest_field('post', 'mm_chapter_cover', [
        'get_callback' => static fn($post) => mm_chapter_cover_url($post['id']),
        'schema' => ['type' => 'string', 'description' => 'Portada propia del capítulo.'],
    ]);
    register_rest_field('post', 'mm_chapter_free_at', [
        'get_callback' => static fn($post) => mm_chapter_free_at_iso($post['id']),
        'schema' => ['type' => ['string', 'null'], 'description' => 'Fecha en la que el capítulo pasa a gratis (UTC).'],
    ]);
});

/* =========================================================================
 * 4. COLUMNAS DE APOYO EN EL LISTADO DE CAPITULOS
 * ====================================================================== */

add_filter('manage_post_posts_columns', static function ($columns) {
    $columns['mm_chapter_cover'] = 'Portada';
    $columns['mm_chapter_free'] = 'Gratis el';
    return $columns;
});

add_action('manage_post_posts_custom_column', static function ($column, $post_id) {
    if (!in_array($column, ['mm_chapter_cover', 'mm_chapter_free'], true)) return;
    if (!get_post_meta($post_id, 'ero_seri', true)) { echo '—'; return; }

    if ($column === 'mm_chapter_cover') {
        $url = mm_chapter_cover_url($post_id);
        echo $url
            ? '<img src="' . esc_url($url) . '" alt="" style="width:64px;height:auto;border-radius:3px" />'
            : '<span style="color:#646970">Provisional</span>';
        return;
    }

    $free_at = trim((string) get_post_meta($post_id, MM_CH_FREE_AT, true));
    if ($free_at === '') { echo '—'; return; }
    $label = get_date_from_gmt($free_at, 'd/m/Y H:i');
    echo get_post_meta($post_id, MM_CH_FREED, true) === '1'
        ? '<span style="color:#1c6b34">Liberado ' . esc_html($label) . '</span>'
        : esc_html($label);
}, 10, 2);
