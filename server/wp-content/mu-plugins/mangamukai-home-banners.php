<?php
/**
 * Plugin Name: MangaMukai Home Banners
 * Description: Banners/anuncios del carrusel de la portada gestionados desde WordPress y expuestos en /wp-json/mangamukai/v1/banners.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

if (!defined('MM_BANNER_CPT')) define('MM_BANNER_CPT', 'mm_banner');
if (!defined('MM_BANNER_CACHE')) define('MM_BANNER_CACHE', 'mm_home_banners_v1');

/** Medidas recomendadas, se muestran en el editor para no tener que adivinarlas. */
function mm_banner_sizes(): array {
    return [
        'desktop' => '1600 x 500 px (16:5) - ideal 3200 x 1000 px para pantallas retina',
        'mobile'  => '1080 x 1350 px (4:5, vertical) - opcional, si no se sube se usa la de escritorio',
    ];
}

/** Bloques donde puede aparecer un banner. */
function mm_banner_slots(): array {
    return [
        'home'  => 'Bloque general (arriba)',
        'youth' => 'Bloque juvenil (abajo)',
        'both'  => 'Ambos bloques',
    ];
}

/** Campos del banner: meta_key => callback de sanitizado. */
function mm_banner_fields(): array {
    return [
        '_mm_banner_slot'         => 'mm_banner_sanitize_slot',
        '_mm_banner_link'         => 'mm_banner_sanitize_link',
        '_mm_banner_button_label' => 'sanitize_text_field',
        '_mm_banner_button_show'  => 'mm_banner_sanitize_bool',
        '_mm_banner_new_tab'      => 'mm_banner_sanitize_bool',
        '_mm_banner_desktop_id'   => 'absint',
        '_mm_banner_mobile_id'    => 'absint',
    ];
}

function mm_banner_sanitize_slot($value): string {
    $value = is_string($value) ? sanitize_key($value) : '';
    return array_key_exists($value, mm_banner_slots()) ? $value : 'home';
}

function mm_banner_sanitize_bool($value): string {
    return in_array((string) $value, ['1', 'on', 'true', 'yes'], true) ? '1' : '0';
}

/**
 * Acepta rutas internas (/biblioteca), acciones de la web (#vip, #donar) y URLs
 * completas hacia otras plataformas. Cualquier otra cosa se descarta.
 */
function mm_banner_sanitize_link($value): string {
    $value = trim((string) $value);
    if ($value === '') return '';
    if ($value[0] === '/') return '/' . ltrim(sanitize_text_field($value), '/');
    if ($value[0] === '#') return '#' . sanitize_key(substr($value, 1));
    return esc_url_raw($value, ['http', 'https', 'mailto']);
}

/** Registro del tipo de contenido. */
add_action('init', static function () {
    register_post_type(MM_BANNER_CPT, [
        'labels' => [
            'name'               => 'Banners Home',
            'singular_name'      => 'Banner',
            'add_new'            => 'Anadir banner',
            'add_new_item'       => 'Anadir nuevo banner',
            'edit_item'          => 'Editar banner',
            'new_item'           => 'Nuevo banner',
            'view_item'          => 'Ver banner',
            'search_items'       => 'Buscar banners',
            'not_found'          => 'Sin banners todavia',
            'not_found_in_trash' => 'Sin banners en la papelera',
            'menu_name'          => 'Banners Home',
        ],
        'public'              => false,
        'publicly_queryable'  => false,
        'exclude_from_search' => true,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'show_in_rest'        => false,
        'menu_icon'           => 'dashicons-format-image',
        'menu_position'       => 26,
        'has_archive'         => false,
        'rewrite'             => false,
        'capability_type'     => 'post',
        'supports'            => ['title', 'thumbnail', 'page-attributes'],
    ]);
});

/** El editor necesita la libreria de medios para elegir la imagen movil. */
add_action('admin_enqueue_scripts', static function ($hook) {
    // Sin filtrar por tipo: en post-new.php el post global aun no esta listo y
    // los selectores se quedaban sin biblioteca de medios.
    if (!in_array($hook, ['post.php', 'post-new.php'], true)) return;
    wp_enqueue_media();
});

add_action('add_meta_boxes', static function () {
    add_meta_box('mm_banner_options', 'Opciones del banner', 'mm_banner_meta_box', MM_BANNER_CPT, 'normal', 'high');
    add_meta_box('mm_banner_help', 'Medidas recomendadas', 'mm_banner_help_box', MM_BANNER_CPT, 'side', 'low');
});

function mm_banner_help_box() {
    $sizes = mm_banner_sizes();
    echo '<p><strong>Imagen para PC</strong><br>' . esc_html($sizes['desktop']) . '</p>';
    echo '<p><strong>Imagen para movil</strong><br>' . esc_html($sizes['mobile']) . '</p>';
    echo '<p>Las dos se eligen en el panel "Opciones del banner".</p>';
    echo '<p>La imagen se recorta desde el centro, deja los textos importantes dentro del 80% central. Peso recomendado: menos de 300 KB (JPG o WEBP).</p>';
}

function mm_banner_meta_box($post) {
    $slot     = get_post_meta($post->ID, '_mm_banner_slot', true) ?: 'home';
    $link     = (string) get_post_meta($post->ID, '_mm_banner_link', true);
    $label    = (string) get_post_meta($post->ID, '_mm_banner_button_label', true);
    $show     = get_post_meta($post->ID, '_mm_banner_button_show', true);
    $new_tab  = get_post_meta($post->ID, '_mm_banner_new_tab', true);
    $mobile   = (int) get_post_meta($post->ID, '_mm_banner_mobile_id', true);
    $mobile_u = $mobile ? wp_get_attachment_image_url($mobile, 'medium') : '';
    $desktop  = (int) get_post_meta($post->ID, '_mm_banner_desktop_id', true);
    $desktop_u = $desktop ? wp_get_attachment_image_url($desktop, 'medium') : '';
    // Compatibilidad: los banners hechos antes usaban la imagen destacada.
    $legacy_u = $desktop_u ? '' : (string) get_the_post_thumbnail_url($post->ID, 'medium');
    $sizes    = mm_banner_sizes();
    // Los banners nuevos llegan sin meta: el boton solo se activa si se marca.
    $show     = $show === '' ? '0' : $show;

    wp_nonce_field('mm_banner_save', 'mm_banner_nonce');
    ?>
    <style>
        .mm-banner-grid { display: grid; gap: 18px; max-width: 720px; }
        .mm-banner-grid label { display: block; font-weight: 600; margin-bottom: 4px; }
        .mm-banner-grid input[type="text"], .mm-banner-grid select { width: 100%; }
        .mm-banner-hint { color: #666; font-size: 12px; margin: 4px 0 0; }
        .mm-banner-inline { display: flex; align-items: center; gap: 8px; font-weight: 600; }
        .mm-banner-preview img { max-width: 260px; height: auto; display: block; margin-bottom: 8px; border: 1px solid #dcdcde; }
        .mm-banner-images { display: grid; gap: 24px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (max-width: 782px) { .mm-banner-images { grid-template-columns: 1fr; } }
    </style>
    <div class="mm-banner-grid">
        <div>
            <label for="mm_banner_slot">Donde se muestra</label>
            <select id="mm_banner_slot" name="mm_banner_slot">
                <?php foreach (mm_banner_slots() as $value => $text) : ?>
                    <option value="<?php echo esc_attr($value); ?>" <?php selected($slot, $value); ?>><?php echo esc_html($text); ?></option>
                <?php endforeach; ?>
            </select>
            <p class="mm-banner-hint">La portada tiene dos carruseles de anuncios: uno arriba y otro en la zona juvenil.</p>
        </div>

        <div>
            <label class="mm-banner-inline" for="mm_banner_button_show">
                <input type="checkbox" id="mm_banner_button_show" name="mm_banner_button_show" value="1" <?php checked($show, '1'); ?> />
                Mostrar boton de enlace sobre el banner
            </label>
            <p class="mm-banner-hint">Si se deja desmarcado el banner sale limpio, solo la imagen.</p>
        </div>

        <div>
            <label for="mm_banner_link">Enlace del boton</label>
            <input type="text" id="mm_banner_link" name="mm_banner_link" value="<?php echo esc_attr($link); ?>" placeholder="https://... o /biblioteca" />
            <p class="mm-banner-hint">
                URL completa para otra plataforma (https://...), ruta interna de la web (/biblioteca, /manga-19, /recargar)
                o accion interna: <code>#vip</code> abre la suscripcion y <code>#donar</code> abre el apoyo por PayPal.
            </p>
        </div>

        <div>
            <label for="mm_banner_button_label">Texto del boton</label>
            <input type="text" id="mm_banner_button_label" name="mm_banner_button_label" value="<?php echo esc_attr($label); ?>" placeholder="Ver mas" />
            <p class="mm-banner-hint">Si se deja vacio se usa "Ver mas".</p>
        </div>

        <div>
            <label class="mm-banner-inline" for="mm_banner_new_tab">
                <input type="checkbox" id="mm_banner_new_tab" name="mm_banner_new_tab" value="1" <?php checked($new_tab, '1'); ?> />
                Abrir el enlace en una pestana nueva
            </label>
            <p class="mm-banner-hint">Recomendado para enlaces a plataformas externas.</p>
        </div>

        <div class="mm-banner-images">
            <div>
                <label>Imagen para PC</label>
                <div class="mm-banner-preview" id="mm-banner-desktop-preview">
                    <?php if ($desktop_u) : ?>
                        <img src="<?php echo esc_url($desktop_u); ?>" alt="" />
                    <?php elseif ($legacy_u) : ?>
                        <img src="<?php echo esc_url($legacy_u); ?>" alt="" style="opacity:.75" />
                    <?php endif; ?>
                </div>
                <input type="hidden" id="mm_banner_desktop_id" name="mm_banner_desktop_id" value="<?php echo esc_attr($desktop ?: ''); ?>" />
                <button type="button" class="button" id="mm-banner-desktop-pick">Elegir imagen</button>
                <button type="button" class="button-link" id="mm-banner-desktop-clear">Quitar</button>
                <p class="mm-banner-hint"><?php echo esc_html($sizes['desktop']); ?></p>
                <?php if ($legacy_u) : ?>
                    <p class="mm-banner-hint">Ahora mismo se usa la imagen destacada. Elige una aquí para sustituirla.</p>
                <?php endif; ?>
            </div>

            <div>
                <label>Imagen para movil (opcional)</label>
                <div class="mm-banner-preview" id="mm-banner-mobile-preview">
                    <?php if ($mobile_u) : ?><img src="<?php echo esc_url($mobile_u); ?>" alt="" /><?php endif; ?>
                </div>
                <input type="hidden" id="mm_banner_mobile_id" name="mm_banner_mobile_id" value="<?php echo esc_attr($mobile ?: ''); ?>" />
                <button type="button" class="button" id="mm-banner-mobile-pick">Elegir imagen</button>
                <button type="button" class="button-link" id="mm-banner-mobile-clear">Quitar</button>
                <p class="mm-banner-hint"><?php echo esc_html($sizes['mobile']); ?></p>
            </div>
        </div>
    </div>
    <script>
    (function () {
        // wp.media se carga en el pie de pagina: se comprueba al pulsar, no ahora.
        function picker(prefix, title) {
            var frame;
            var input = document.getElementById('mm_banner_' + prefix + '_id');
            var preview = document.getElementById('mm-banner-' + prefix + '-preview');
            var pick = document.getElementById('mm-banner-' + prefix + '-pick');
            var clear = document.getElementById('mm-banner-' + prefix + '-clear');
            if (!input || !pick || !clear) return;

            pick.addEventListener('click', function (event) {
                event.preventDefault();
                if (!window.wp || !window.wp.media) {
                    window.alert('La biblioteca de medios no ha cargado en esta pantalla. Recarga la página e inténtalo otra vez.');
                    return;
                }
                frame = frame || wp.media({ title: title, button: { text: 'Usar imagen' }, multiple: false });
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
                preview.innerHTML = '';
            });
        }

        function init() {
            picker('desktop', 'Imagen del banner para PC');
            picker('mobile', 'Imagen del banner para movil');
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    })();
    </script>
    <?php
}

add_action('save_post_' . MM_BANNER_CPT, static function ($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!isset($_POST['mm_banner_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['mm_banner_nonce'])), 'mm_banner_save')) return;
    if (!current_user_can('edit_post', $post_id)) return;

    foreach (mm_banner_fields() as $meta_key => $sanitize) {
        $field = ltrim($meta_key, '_');
        $raw   = isset($_POST[$field]) ? wp_unslash($_POST[$field]) : '';
        update_post_meta($post_id, $meta_key, call_user_func($sanitize, $raw));
    }
    delete_transient(MM_BANNER_CACHE);
}, 10, 1);

/** Cualquier cambio de estado (papelera, borrado, restauracion) invalida la cache. */
foreach (['save_post', 'deleted_post', 'trashed_post', 'untrashed_post'] as $mm_banner_hook) {
    add_action($mm_banner_hook, static function () { delete_transient(MM_BANNER_CACHE); });
}
unset($mm_banner_hook);

/** Columnas utiles en el listado del admin. */
add_filter('manage_' . MM_BANNER_CPT . '_posts_columns', static function ($columns) {
    $new = ['cb' => $columns['cb'] ?? '', 'mm_preview' => 'Imagen', 'title' => 'Nombre interno', 'mm_slot' => 'Bloque', 'mm_button' => 'Boton', 'mm_order' => 'Orden', 'date' => $columns['date'] ?? 'Fecha'];
    return array_filter($new);
});

add_action('manage_' . MM_BANNER_CPT . '_posts_custom_column', static function ($column, $post_id) {
    if ($column === 'mm_preview') {
        $desktop_id = (int) get_post_meta($post_id, '_mm_banner_desktop_id', true);
        $url = $desktop_id ? wp_get_attachment_image_url($desktop_id, 'medium') : get_the_post_thumbnail_url($post_id, 'medium');
        echo $url
            ? '<img src="' . esc_url($url) . '" alt="" style="width:90px;height:auto" />'
            : '<span style="color:#b32d2e">Falta imagen</span>';
        return;
    }
    if ($column === 'mm_slot') {
        $slots = mm_banner_slots();
        $slot = get_post_meta($post_id, '_mm_banner_slot', true) ?: 'home';
        echo esc_html($slots[$slot] ?? $slot);
        return;
    }
    if ($column === 'mm_button') {
        $show = get_post_meta($post_id, '_mm_banner_button_show', true) === '1';
        $link = (string) get_post_meta($post_id, '_mm_banner_link', true);
        echo $show && $link !== '' ? esc_html(($link)) : '<span style="color:#666">Sin boton</span>';
        return;
    }
    if ($column === 'mm_order') {
        echo (int) get_post_field('menu_order', $post_id);
    }
}, 10, 2);

/** Lista completa de banners publicados, cacheada 5 minutos. */
function mm_banner_all(): array {
    $cached = get_transient(MM_BANNER_CACHE);
    if (is_array($cached)) return $cached;

    $posts = get_posts([
        'post_type'        => MM_BANNER_CPT,
        'post_status'      => 'publish',
        'numberposts'      => 20,
        'orderby'          => ['menu_order' => 'ASC', 'date' => 'DESC'],
        'suppress_filters' => false,
    ]);

    $banners = [];
    foreach ($posts as $post) {
        // Imagen de PC: primero la del selector y, si no hay, la destacada
        // (asi siguen funcionando los banners creados antes de tener dos cajas).
        $desktop_id = (int) get_post_meta($post->ID, '_mm_banner_desktop_id', true);
        $image = $desktop_id ? wp_get_attachment_image_url($desktop_id, 'full') : '';
        if (!$image) $image = get_the_post_thumbnail_url($post, 'full');
        if (!$image) continue; // Un banner sin imagen no se publica.

        $mobile_id = (int) get_post_meta($post->ID, '_mm_banner_mobile_id', true);
        $link      = (string) get_post_meta($post->ID, '_mm_banner_link', true);
        $label     = trim((string) get_post_meta($post->ID, '_mm_banner_button_label', true));

        $banners[] = [
            'id'          => (int) $post->ID,
            'title'       => (string) get_the_title($post),
            'image'       => (string) $image,
            'imageMobile' => $mobile_id ? (string) wp_get_attachment_image_url($mobile_id, 'full') : '',
            'link'        => $link,
            'buttonLabel' => $label !== '' ? $label : 'Ver mas',
            'showButton'  => get_post_meta($post->ID, '_mm_banner_button_show', true) === '1' && $link !== '',
            'newTab'      => get_post_meta($post->ID, '_mm_banner_new_tab', true) === '1',
            'slot'        => get_post_meta($post->ID, '_mm_banner_slot', true) ?: 'home',
        ];
    }

    set_transient(MM_BANNER_CACHE, $banners, 5 * MINUTE_IN_SECONDS);
    return $banners;
}

add_action('rest_api_init', static function () {
    register_rest_route('mangamukai/v1', '/banners', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'args'                => ['slot' => ['default' => 'home']],
        'callback'            => static function ($request) {
            $slot = mm_banner_sanitize_slot((string) $request['slot']);
            $banners = array_values(array_filter(mm_banner_all(), static function ($banner) use ($slot) {
                return $banner['slot'] === $slot || $banner['slot'] === 'both';
            }));
            return rest_ensure_response([
                'success' => true,
                'slot'    => $slot,
                'sizes'   => mm_banner_sizes(),
                'banners' => $banners,
            ]);
        },
    ]);
});
