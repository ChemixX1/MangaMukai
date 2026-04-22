<?php
/**
 * Plugin Name: MangaMukai Auth REST API
 * Description: Endpoints de login/registro por email y compra de capítulos con myCRED.
 * Version: 4.0
 */

if (!defined('ABSPATH')) exit;

// ─── REST ENDPOINTS ──────────────────────────────────────────────────────────
add_action('rest_api_init', function () {

    // ── Campo mm_chapter_info en TODOS los posts (lee de DB directamente, bypass myCRED) ──
    register_rest_field('post', 'mm_chapter_info', [
        'get_callback' => function ($post_arr) {
            $id   = $post_arr['id'];
            $sell = get_post_meta($id, 'myCRED_sell_content', true);
            $is_paid = is_array($sell)
                && isset($sell['status'])
                && $sell['status'] === 'enabled'
                && floatval($sell['price'] ?? 0) > 0;
            $free_at = null;
            if ($is_paid && !empty($sell['expire'])) {
                $days = intval($sell['expire']);
                if ($days > 0) {
                    $p = get_post($id);
                    if ($p) $free_at = gmdate('c', strtotime($p->post_date_gmt) + $days * DAY_IN_SECONDS);
                }
            }
            return [
                'is_paid' => $is_paid,
                'price'   => $is_paid ? floatval($sell['price']) : 0,
                'free_at' => $free_at,
            ];
        },
        'schema' => null,
    ]);

    register_rest_route('mangamukai/v1', '/login', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_login',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/register', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_register',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/me', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_me',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/coins', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_coins',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/chapters/unlocked', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_unlocked_chapters',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/chapters/buy', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_buy_chapter',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/logout', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_logout',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/chapters/content', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_chapter_content',
        'permission_callback' => '__return_true',
    ]);
    
    // ── Catálogo completo: todos los mangas del post type 'manga' ──
    register_rest_route('mangamukai/v1', '/catalog', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_catalog',
        'permission_callback' => '__return_true',
    ]);

    // ── Detalle de un manga por ID (post type 'manga') ──
    register_rest_route('mangamukai/v1', '/manga/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_manga_detail',
        'permission_callback' => '__return_true',
    ]);

    // ── Capítulos de una serie por ero_seri (consulta directa por meta, sin límite) ──
    register_rest_route('mangamukai/v1', '/series/(?P<id>\d+)/chapters', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_series_chapters',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [
                'required'          => true,
                'validate_callback' => fn($v) => is_numeric($v),
            ],
        ],
    ]);

    // ── Endpoint para generar pago de PayPal Standard ──
    register_rest_route('mangamukai/v1', '/buy-coins', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_buy_coins',
        'permission_callback' => '__return_true',
    ]);
    
    // ── Endpoints de Interacción (Sustitutos de Supabase) ──
    register_rest_route('mangamukai/v1', '/interactions', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_get_interactions',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/bookmark', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_bookmark',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/like', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_like',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/history', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_history',
        'permission_callback' => '__return_true',
    ]);
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function mm_generate_token(int $user_id): string
{
    return base64_encode($user_id . ':' . wp_hash($user_id . AUTH_KEY . date('Y-m-d')));
}

function mm_get_user_from_token(string $token): ?WP_User
{
    $decoded = base64_decode($token);
    if (!$decoded) return null;
    $parts = explode(':', $decoded, 2);
    if (count($parts) !== 2) return null;
    [$user_id, $hash] = $parts;
    $expected      = wp_hash((int) $user_id . AUTH_KEY . date('Y-m-d'));
    $expected_prev = wp_hash((int) $user_id . AUTH_KEY . date('Y-m-d', strtotime('-1 day')));
    if (!hash_equals($expected, $hash) && !hash_equals($expected_prev, $hash)) return null;
    $user = get_user_by('id', (int) $user_id);
    return $user ?: null;
}

function mm_get_coins(int $user_id): float
{
    if (function_exists('mycred_get_users_balance')) {
        return floatval(mycred_get_users_balance($user_id));
    }
    $balance = get_user_meta($user_id, 'mycred_default', true);
    return ($balance !== '') ? floatval($balance) : 0.0;
}

function mm_user_data(WP_User $user): array
{
    return [
        'id'           => $user->ID,
        'username'     => $user->user_login,
        'email'        => $user->user_email,
        'display_name' => $user->display_name,
        'avatar'       => get_avatar_url($user->ID),
        'coins'        => mm_get_coins($user->ID),
    ];
}

function mm_user_bought_chapter(int $user_id, int $post_id): bool
{
    $buyers = get_post_meta($post_id, 'myCRED_sell_content_buyers', true);
    if (is_array($buyers) && in_array($user_id, $buyers)) return true;
    if (function_exists('mycred_bought_content')) {
        return (bool) mycred_bought_content($post_id, $user_id);
    }
    return false;
}

// ─── REST: LOGOUT ─────────────────────────────────────────────────────────────
function mm_handle_logout(WP_REST_Request $req): WP_REST_Response
{
    wp_logout();
    return new WP_REST_Response(['success' => true, 'message' => 'Sesión cerrada'], 200);
}

// ─── REST: LOGIN ──────────────────────────────────────────────────────────────
function mm_handle_login(WP_REST_Request $req): WP_REST_Response
{
    $email    = sanitize_email($req->get_param('email') ?? '');
    $password = $req->get_param('password') ?? '';

    if (empty($email) || empty($password))
        return new WP_REST_Response(['success' => false, 'message' => 'Correo y contraseña requeridos.'], 400);

    $user = get_user_by('email', $email);
    if (!$user || !wp_check_password($password, $user->user_pass, $user->ID))
        return new WP_REST_Response(['success' => false, 'message' => 'Credenciales incorrectas.'], 401);

    wp_set_auth_cookie($user->ID, true);

    return new WP_REST_Response([
        'success' => true,
        'token'   => mm_generate_token($user->ID),
        'user'    => mm_user_data($user),
    ], 200);
}

// ─── REST: REGISTRO ───────────────────────────────────────────────────────────
function mm_handle_register(WP_REST_Request $req): WP_REST_Response
{
    $email    = sanitize_email($req->get_param('email') ?? '');
    $password = $req->get_param('password') ?? '';
    $username = sanitize_user($req->get_param('username') ?? '');

    if (empty($email) || empty($password))
        return new WP_REST_Response(['success' => false, 'message' => 'Correo y contraseña requeridos.'], 400);
    if (email_exists($email))
        return new WP_REST_Response(['success' => false, 'message' => 'El correo ya está en uso.'], 409);

    if (empty($username)) $username = strtolower(strstr($email, '@', true)) . rand(100, 999);
    if (username_exists($username)) $username .= rand(10, 99);

    $user_id = wp_create_user($username, $password, $email);
    if (is_wp_error($user_id))
        return new WP_REST_Response(['success' => false, 'message' => $user_id->get_error_message()], 500);

    $user = new WP_User($user_id);
    $user->set_role('subscriber');
    wp_set_auth_cookie($user_id, true);

    return new WP_REST_Response([
        'success' => true,
        'token'   => mm_generate_token($user_id),
        'user'    => mm_user_data($user),
    ], 201);
}

// ─── REST: ME ─────────────────────────────────────────────────────────────────
function mm_handle_me(WP_REST_Request $req): WP_REST_Response
{
    $token = str_replace('Bearer ', '', $req->get_header('Authorization') ?? '');
    if (empty($token))
        return new WP_REST_Response(['success' => false, 'message' => 'Sin token.'], 401);

    $user = mm_get_user_from_token($token);
    if (!$user)
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido o expirado.'], 401);

    // TEMPORAL: volcar todos los meta keys
    $all_meta = get_user_meta($user->ID);
    $meta_keys = array_keys($all_meta);

    $user_data = mm_user_data($user);
    $user_data['all_meta_keys'] = $meta_keys;

    return new WP_REST_Response(['success' => true, 'user' => $user_data], 200);
}

// ─── REST: COINS ──────────────────────────────────────────────────────────────
function mm_handle_coins(WP_REST_Request $req): WP_REST_Response
{
    $token = str_replace('Bearer ', '', $req->get_header('Authorization') ?? '');
    $user  = $token ? mm_get_user_from_token($token) : null;
    if (!$user)
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);

    return new WP_REST_Response(['success' => true, 'coins' => mm_get_coins($user->ID)], 200);
}

// ─── REST: CAPÍTULOS DESBLOQUEADOS ────────────────────────────────────────────
function mm_handle_unlocked_chapters(WP_REST_Request $req): WP_REST_Response
{
    $token = str_replace('Bearer ', '', $req->get_header('Authorization') ?? '');
    $user  = $token ? mm_get_user_from_token($token) : null;
    if (!$user)
        return new WP_REST_Response(['success' => true, 'unlocked' => []], 200);

    global $wpdb;
    $results = $wpdb->get_col($wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta}
         WHERE meta_key = 'myCRED_sell_content_buyers'
         AND meta_value LIKE %s",
        '%i:' . $user->ID . ';%'
    ));

    return new WP_REST_Response(['success' => true, 'unlocked' => array_map('strval', $results)], 200);
}

// ─── REST: COMPRAR CAPÍTULO ───────────────────────────────────────────────────
function mm_handle_buy_chapter(WP_REST_Request $req): WP_REST_Response
{
    $token      = str_replace('Bearer ', '', $req->get_header('Authorization') ?? '');
    $user       = $token ? mm_get_user_from_token($token) : null;
    $chapter_id = (int) ($req->get_param('chapter_id') ?? 0);

    if (!$user)
        return new WP_REST_Response(['success' => false, 'message' => 'Debes iniciar sesión.'], 401);
    if (!$chapter_id)
        return new WP_REST_Response(['success' => false, 'message' => 'Capítulo inválido.'], 400);

    if (mm_user_bought_chapter($user->ID, $chapter_id))
        return new WP_REST_Response(['success' => true, 'message' => 'Ya adquirido', 'coins' => mm_get_coins($user->ID)], 200);

    $sell = get_post_meta($chapter_id, 'myCRED_sell_content', true);
    if (!$sell || $sell['status'] === 'disabled' || floatval($sell['price']) <= 0)
        return new WP_REST_Response(['success' => true, 'message' => 'Capítulo gratuito', 'coins' => mm_get_coins($user->ID)], 200);

    $price   = floatval($sell['price']);
    $balance = mm_get_coins($user->ID);

    if ($balance < $price)
        return new WP_REST_Response(['success' => false, 'message' => 'Saldo insuficiente', 'coins' => $balance], 402);

    if (function_exists('mycred_subtract')) {
        mycred_subtract('buy_chapter', $user->ID, $price, 'Compra capítulo #' . $chapter_id, $chapter_id);
    } else {
        update_user_meta($user->ID, 'mycred_default', $balance - $price);
    }

    $buyers = get_post_meta($chapter_id, 'myCRED_sell_content_buyers', true);
    if (!is_array($buyers)) $buyers = [];
    if (!in_array($user->ID, $buyers)) {
        $buyers[] = $user->ID;
        update_post_meta($chapter_id, 'myCRED_sell_content_buyers', $buyers);
    }

    return new WP_REST_Response([
        'success' => true,
        'message' => 'Capítulo desbloqueado',
        'coins'   => mm_get_coins($user->ID),
    ], 200);
}

// ─── REST: CONTENIDO DE CAPÍTULO (bypass filtro myCRED) ──────────────────────
function mm_handle_chapter_content(WP_REST_Request $req): WP_REST_Response
{
    $chapter_id = (int) ($req->get_param('id') ?? 0);
    if (!$chapter_id)
        return new WP_REST_Response(['success' => false, 'message' => 'ID inválido'], 400);

    $post = get_post($chapter_id);
    if (!$post || $post->post_status !== 'publish')
        return new WP_REST_Response(['success' => false, 'message' => 'Capítulo no encontrado'], 404);

    $sell    = get_post_meta($chapter_id, 'myCRED_sell_content', true);
    $is_paid = is_array($sell)
        && isset($sell['status'])
        && $sell['status'] === 'enabled'
        && floatval($sell['price'] ?? 0) > 0;

    if ($is_paid) {
        $token = str_replace('Bearer ', '', $req->get_header('Authorization') ?? '');
        $user  = $token ? mm_get_user_from_token($token) : null;

        if (!$user)
            return new WP_REST_Response([
                'success' => false,
                'locked'  => true,
                'message' => 'Inicia sesión para leer este capítulo.',
            ], 401);

        if (!mm_user_bought_chapter($user->ID, $chapter_id))
            return new WP_REST_Response([
                'success' => false,
                'locked'  => true,
                'price'   => floatval($sell['price']),
                'message' => 'Capítulo de pago — adquiérelo para leerlo.',
            ], 402);
    }

    // Método 1: imágenes adjuntas al post (full-size, sin filtros de myCRED)
    $attachments = get_posts([
        'post_type'      => 'attachment',
        'post_mime_type' => 'image',
        'post_parent'    => $chapter_id,
        'posts_per_page' => -1,
        'orderby'        => 'menu_order date',
        'order'          => 'ASC',
    ]);

    $image_urls = [];
    foreach ($attachments as $att) {
        // Preferir la imagen original; si no existe, usar la full de wp
        $src = wp_get_attachment_url($att->ID);
        if ($src) $image_urls[] = $src;
    }

    // Método 2: si no hay adjuntos, extraer URLs del shortcode/HTML del post
    if (empty($image_urls) && !empty($post->post_content)) {
        // Extraer <img src> del HTML raw (sin ejecutar filtros)
        preg_match_all('/src=["\']([^"\']+\.(jpe?g|png|webp|gif))["\']/', $post->post_content, $m1);
        foreach ($m1[1] as $url) {
            if (filter_var($url, FILTER_VALIDATE_URL)) $image_urls[] = $url;
        }

        // Si aún vacío, renderizar shortcodes con contexto de post correcto
        if (empty($image_urls)) {
            $GLOBALS['post'] = $post;
            setup_postdata($post);
            $html = do_shortcode($post->post_content);
            wp_reset_postdata();
            preg_match_all('/src=["\']([^"\']+)["\']/', $html, $m2);
            foreach ($m2[1] as $url) {
                if (filter_var($url, FILTER_VALIDATE_URL) && preg_match('/\.(jpe?g|png|webp|gif)(\?|$)/i', $url)) {
                    $image_urls[] = $url;
                }
            }
        }
    }

    return new WP_REST_Response([
        'success' => true,
        'images'  => array_values(array_unique($image_urls)),
        'is_paid' => $is_paid,
    ], 200);
}

// ─── REST: GENERAR PAGO PAYPAL (buyCRED PayPal Standard bypass) ──────
function mm_handle_buy_coins(WP_REST_Request $req): WP_REST_Response
{
    $token = str_replace('Bearer ', '', $req->get_header('Authorization') ?? '');
    $user  = $token ? mm_get_user_from_token($token) : null;

    if (!$user) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Sesión inválida.'
        ], 401);
    }

    $amount = (int) ($req->get_param('amount') ?? 0);
    $cost   = (float) ($req->get_param('cost') ?? 0);

    if ($amount <= 0 || $cost <= 0) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Cantidad o costo inválido.'
        ], 400);
    }

    // Email de la cuenta de PayPal (fijado por el admin)
    $paypal_email = '25tumanhuaerick12@gmail.com';

    // Crear el pending payment de myCRED manualmente
    $payment_id = wp_insert_post([
        'post_title'   => "Compra de {$amount} monedas",
        'post_type'    => 'mycred_payment',
        'post_status'  => 'publish',
        'post_author'  => $user->ID,
    ]);

    if (is_wp_error($payment_id) || !$payment_id) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Error al crear la orden.'
        ], 500);
    }

    // Metas obligatorias para que IPN de myCRED procese la compra
    update_post_meta($payment_id, 'mycred_payment_amount', $amount);
    update_post_meta($payment_id, 'mycred_payment_cost', $cost);
    update_post_meta($payment_id, 'mycred_payment_currency', 'USD');
    update_post_meta($payment_id, 'mycred_payment_gateway', 'paypal-standard');
    update_post_meta($payment_id, 'mycred_payment_buyer_id', $user->ID);
    update_post_meta($payment_id, 'mycred_point_type', 'mycred_default');
    
    // URL de retorno y notificación
    $return_url = 'https://mangamukai.com/';
    $notify_url = 'https://mangamukai.com/?mycred_call=paypal-standard';

    // Parámetros para PayPal Standard (_xclick)
    $paypal_args = [
        'cmd'           => '_xclick',
        'business'      => $paypal_email,
        'item_name'     => "Pack de {$amount} Monedas - MangaMukai",
        'amount'        => number_format($cost, 2, '.', ''),
        'currency_code' => 'USD',
        'custom'        => $payment_id,
        'notify_url'    => $notify_url,
        'return'        => $return_url,
        'charset'       => 'utf-8',
        'no_shipping'   => 1,
        'no_note'       => 1,
    ];

    $paypal_url = 'https://www.paypal.com/cgi-bin/webscr?' . http_build_query($paypal_args);

    return new WP_REST_Response([
        'success' => true,
        'url'     => $paypal_url,
        'payment_id' => $payment_id
    ], 200);
}

// ─── MANEJADORES DE INTERACCIÓN (Sustitutos de Supabase) ────────────────────

function mm_record_global_view($ip, $user_id) {
    $views = get_transient('mm_global_views');
    if (!is_array($views)) $views = [];
    $now = time();
    $id = $user_id ? "u_$user_id" : "ip_$ip";
    $views[$id] = $now;
    
    foreach ($views as $k => $time) {
        if ($now - $time > 15 * 60) unset($views[$k]);
    }
    set_transient('mm_global_views', $views, 15 * 60);
}

function mm_get_online_readers() {
    $views = get_transient('mm_global_views');
    if (!is_array($views)) return 0;
    $now = time();
    $c = 0;
    foreach ($views as $k => $time) {
        if ($now - $time <= 15 * 60) $c++;
    }
    return $c;
}

function mm_handle_get_interactions(WP_REST_Request $request) {
    $token = $request->get_header('Authorization');
    $user = null;
    if ($token && preg_match('/Bearer\s+(.*)/', $token, $matches)) {
        $user = mm_get_user_from_token($matches[1]);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    mm_record_global_view($ip, $user ? $user->ID : null);

    $response = [
        'success' => true,
        'online_readers' => mm_get_online_readers(),
        'bookmarks' => [],
        'likes' => [],
        'history' => [],
    ];

    if ($user) {
        $bookmarks = get_user_meta($user->ID, 'mm_user_bookmarks', true);
        $likes = get_user_meta($user->ID, 'mm_user_likes', true);
        $history = get_user_meta($user->ID, 'mm_user_history', true);
        
        $response['bookmarks'] = is_array($bookmarks) ? $bookmarks : [];
        $response['likes'] = is_array($likes) ? $likes : [];
        
        if (is_array($history)) {
            uasort($history, function($a, $b) { return $b['time'] - $a['time']; });
            $response['history'] = array_values($history);
        }
    }

    // Opcional: si mandan un manga_id, devolver los likes totales de ese manga
    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if ($manga_id) {
        $response['manga_likes'] = (int)get_post_meta($manga_id, 'mm_manga_likes', true);
    }

    return new WP_REST_Response($response, 200);
}

function mm_handle_bookmark(WP_REST_Request $request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\s+(.*)/', $token, $matches)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token faltante'], 401);
    }
    $user = mm_get_user_from_token($matches[1]);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido'], 401);
    }

    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if (!$manga_id) return new WP_REST_Response(['success' => false], 400);

    $bookmarks = get_user_meta($user->ID, 'mm_user_bookmarks', true);
    if (!is_array($bookmarks)) $bookmarks = [];

    $action = '';
    $idx = array_search($manga_id, $bookmarks);
    if ($idx !== false) {
        unset($bookmarks[$idx]);
        $bookmarks = array_values($bookmarks);
        $action = 'removed';
    } else {
        $bookmarks[] = $manga_id;
        $action = 'added';
    }
    update_user_meta($user->ID, 'mm_user_bookmarks', $bookmarks);

    return new WP_REST_Response(['success' => true, 'action' => $action], 200);
}

function mm_handle_like(WP_REST_Request $request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\s+(.*)/', $token, $matches)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token faltante'], 401);
    }
    $user = mm_get_user_from_token($matches[1]);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido'], 401);
    }

    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if (!$manga_id) return new WP_REST_Response(['success' => false], 400);

    $likes = get_user_meta($user->ID, 'mm_user_likes', true);
    if (!is_array($likes)) $likes = [];

    $action = '';
    $global_likes = (int)get_post_meta($manga_id, 'mm_manga_likes', true);

    $idx = array_search($manga_id, $likes);
    if ($idx !== false) {
        unset($likes[$idx]);
        $likes = array_values($likes);
        $global_likes = max(0, $global_likes - 1);
        $action = 'removed';
    } else {
        $likes[] = $manga_id;
        $global_likes++;
        $action = 'added';
    }
    
    update_user_meta($user->ID, 'mm_user_likes', $likes);
    update_post_meta($manga_id, 'mm_manga_likes', $global_likes);

    return new WP_REST_Response(['success' => true, 'action' => $action, 'total_likes' => $global_likes], 200);
}

function mm_handle_history(WP_REST_Request $request) {
    $token = $request->get_header('Authorization');
    if (!$token || !preg_match('/Bearer\s+(.*)/', $token, $matches)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token faltante'], 401);
    }
    $user = mm_get_user_from_token($matches[1]);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido'], 401);
    }

    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if (!$manga_id) return new WP_REST_Response(['success' => false], 400);

    mm_record_global_view($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', $user->ID);

    $history = get_user_meta($user->ID, 'mm_user_history', true);
    if (!is_array($history)) $history = [];

    $history[$manga_id] = [
        'manga_id' => $manga_id,
        'time' => time()
    ];

    update_user_meta($user->ID, 'mm_user_history', $history);

    return new WP_REST_Response(['success' => true], 200);
}

// ─── REST: CAPÍTULOS DE UNA SERIE (por ero_seri) ─────────────────────────────
function mm_handle_series_chapters(WP_REST_Request $req): WP_REST_Response
{
    $ero_seri = (int) $req->get_param('id');
    if (!$ero_seri) {
        return new WP_REST_Response(['success' => false, 'message' => 'ID inválido'], 400);
    }

    $query = new WP_Query([
        'post_type'      => 'post',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'meta_query'     => [[
            'key'     => 'ero_seri',
            'value'   => $ero_seri,
            'compare' => '=',
            'type'    => 'NUMERIC',
        ]],
        'meta_key' => 'ero_chapter',
        'orderby'  => 'meta_value_num',
        'order'    => 'ASC',
        'no_found_rows' => true,
    ]);

    $chapters = [];
    foreach ($query->posts as $post) {
        $sell    = get_post_meta($post->ID, 'myCRED_sell_content', true);
        $is_paid = is_array($sell)
            && isset($sell['status'])
            && $sell['status'] === 'enabled'
            && floatval($sell['price'] ?? 0) > 0;
        $price   = $is_paid ? floatval($sell['price']) : 0;

        $free_at = null;
        if ($is_paid && !empty($sell['expire'])) {
            $days = intval($sell['expire']);
            if ($days > 0) {
                $free_at = gmdate('c', strtotime($post->post_date_gmt) + $days * DAY_IN_SECONDS);
            }
        }

        $chapters[] = [
            'id'             => $post->ID,
            'chapter_number' => (float) get_post_meta($post->ID, 'ero_chapter', true),
            'title'          => get_the_title($post->ID),
            'created_at'     => get_post_time('c', true, $post),
            'is_paid'        => $is_paid,
            'price_coins'    => $price,
            'free_at'        => $free_at,
        ];
    }

    return new WP_REST_Response([
        'success'  => true,
        'chapters' => $chapters,
    ], 200);
}

// ─── REST: CATÁLOGO COMPLETO (post type 'manga') ──────────────────────────────
function mm_handle_catalog(WP_REST_Request $req): WP_REST_Response
{
    $query = new WP_Query([
        'post_type'      => 'manga',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'no_found_rows'  => true,
    ]);

    $mangas = [];

    foreach ($query->posts as $post) {
        $pid = $post->ID;

        // Portada (thumbnail)
        $thumb_id  = get_post_thumbnail_id($pid);
        $cover_url = $thumb_id ? wp_get_attachment_url($thumb_id) : '';

        // Tipo (Manga / Manhwa / Manhua / Comic)
        $tipo = get_post_meta($pid, 'ero_type', true) ?: 'Manga';

        // Géneros desde taxonomía
        $terms  = get_the_terms($pid, 'genres');
        $genres = ($terms && !is_wp_error($terms))
            ? array_map(fn($t) => $t->name, $terms)
            : [];

        // Estado de publicación
        $ero_status = get_post_meta($pid, 'ero_status', true) ?: '';

        // Primer capítulo disponible (para saber si es gratis)
        $first_chapter_free = false;
        $first_chapter_id   = null;
        $chapter_query = new WP_Query([
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'meta_query'     => [[
                'key'     => 'ero_seri',
                'value'   => $pid,
                'compare' => '=',
                'type'    => 'NUMERIC',
            ]],
            'meta_key' => 'ero_chapter',
            'orderby'  => 'meta_value_num',
            'order'    => 'ASC',
            'no_found_rows' => true,
        ]);

        if ($chapter_query->have_posts()) {
            $ch = $chapter_query->posts[0];
            $first_chapter_id = $ch->ID;
            $sell = get_post_meta($ch->ID, 'myCRED_sell_content', true);
            $first_chapter_free = !(is_array($sell)
                && isset($sell['status'])
                && $sell['status'] === 'enabled'
                && floatval($sell['price'] ?? 0) > 0);
        }

        // Descripción (contenido del post)
        $desc = wp_strip_all_tags($post->post_content);
        if (strlen($desc) > 500) $desc = substr($desc, 0, 497) . '...';

        $mangas[] = [
            'id'          => $pid,
            'titulo'      => $post->post_title,
            'portada'     => $cover_url ?: 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada',
            'fecha'       => $post->post_date,
            'tipo'        => $tipo,
            'genres'      => $genres,
            'descripcion' => $desc ?: 'Lee esta historia en MangaMukai.',
            'esGratis'    => $first_chapter_free,
            'firstChapterId' => $first_chapter_id,
            'status'      => $ero_status,
        ];
    }

    return new WP_REST_Response([
        'success' => true,
        'total'   => count($mangas),
        'mangas'  => $mangas,
    ], 200);
}

// ─── REST: DETALLE DE UN MANGA POR ID ────────────────────────────────────────
function mm_handle_manga_detail(WP_REST_Request $req): WP_REST_Response
{
    $pid  = (int) $req->get_param('id');
    $post = get_post($pid);

    if (!$post || $post->post_type !== 'manga' || $post->post_status !== 'publish') {
        return new WP_REST_Response(['success' => false, 'message' => 'Manga no encontrado'], 404);
    }

    $thumb_id  = get_post_thumbnail_id($pid);
    $cover_url = $thumb_id ? wp_get_attachment_url($thumb_id) : '';

    $tipo   = get_post_meta($pid, 'ero_type', true) ?: 'Manga';
    $status = get_post_meta($pid, 'ero_status', true) ?: '';

    $terms  = get_the_terms($pid, 'genres');
    $genres = ($terms && !is_wp_error($terms))
        ? array_map(fn($t) => $t->name, $terms)
        : [];

    $desc = wp_strip_all_tags($post->post_content);

    return new WP_REST_Response([
        'success'     => true,
        'id'          => $pid,
        'titulo'      => $post->post_title,
        'portada'     => $cover_url ?: 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada',
        'fecha'       => $post->post_date,
        'tipo'        => $tipo,
        'genres'      => $genres,
        'descripcion' => $desc ?: 'Lee esta historia en MangaMukai.',
        'status'      => $status,
    ], 200);
}
