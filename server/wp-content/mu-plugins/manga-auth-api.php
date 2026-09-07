<?php
/**
 * Plugin Name: MangaMukai Auth REST API
 * Description: Endpoints de login/registro por email y compra de cap??tulos con myCRED.
 * Version: 4.0
 */

if (!defined('ABSPATH')) exit;

// ????????? REST ENDPOINTS ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
add_action('rest_api_init', function () {

    // ?????? Campo mm_chapter_info en TODOS los posts (lee de DB directamente, bypass myCRED) ??????
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
    
    // ?????? Cat??logo completo: todos los mangas del post type 'manga' ??????
    register_rest_route('mangamukai/v1', '/catalog', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_catalog',
        'permission_callback' => '__return_true',
    ]);

    // ?????? Detalle de un manga por ID (post type 'manga') ??????
    register_rest_route('mangamukai/v1', '/manga/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_manga_detail',
        'permission_callback' => '__return_true',
    ]);

    // ?????? Cap??tulos de una serie por ero_seri (consulta directa por meta, sin l??mite) ??????
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

    // ?????? Endpoint para generar pago de PayPal Standard ??????
    register_rest_route('mangamukai/v1', '/buy-coins', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_buy_coins',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/buy-coins/confirm', [
        'methods'             => 'GET',
        'callback'            => 'mm_handle_confirm_buy_coins',
        'permission_callback' => '__return_true',
    ]);
    
    // ?????? Endpoint para recibir notificacion de PayPal Standard (IPN REST) ??????
    register_rest_route('mangamukai/v1', '/ipn/coins', [
        'methods'             => 'POST',
        'callback'            => function () {
            mm_process_coin_ipn();
            exit;
        },
        'permission_callback' => '__return_true',
    ]);
    
    // ?????? Endpoints de Interacci??n (Sustitutos de Supabase) ??????
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
    register_rest_route('mangamukai/v1', '/share', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_share',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/history', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_history',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/profile', [
        [
            'methods'             => 'GET',
            'callback'            => 'mm_handle_get_profile',
            'permission_callback' => '__return_true',
        ],
        [
            'methods'             => 'POST',
            'callback'            => 'mm_handle_save_profile',
            'permission_callback' => '__return_true',
        ],
    ]);
    register_rest_route('mangamukai/v1', '/profile/avatar', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_upload_avatar',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/profile/banner', [
        'methods'             => 'POST',
        'callback'            => 'mm_handle_upload_banner',
        'permission_callback' => '__return_true',
    ]);
});

add_action('parse_request', function () {
    if (!isset($_GET['mm_coin_ipn'])) return;
    mm_process_coin_ipn();
    exit;
});

// ????????? HELPERS ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

function mm_token_ttl(): int
{
    return (int) apply_filters('mm_token_ttl', 10 * YEAR_IN_SECONDS);
}

function mm_token_secret(): string
{
    return AUTH_KEY . SECURE_AUTH_KEY . LOGGED_IN_KEY . NONCE_KEY;
}

function mm_generate_token(int $user_id): string
{
    $issued_at  = time();
    $expires_at = $issued_at + mm_token_ttl();
    $payload    = $user_id . '|' . $issued_at . '|' . $expires_at;
    $signature  = hash_hmac('sha256', $payload, mm_token_secret());

    return base64_encode($user_id . ':' . $issued_at . ':' . $expires_at . ':' . $signature);
}

function mm_get_user_from_token(string $token): ?WP_User
{
    $decoded = base64_decode($token, true);
    if (!$decoded) {
        return null;
    }

    $parts = explode(':', $decoded);
    $valid = false;
    $user_id = 0;

    // Legacy/current short token: user_id:daily_hash.
    if (count($parts) === 2) {
        [$user_id, $hash] = $parts;
        for ($i = 0; $i < 30; $i++) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $expected = wp_hash((int) $user_id . AUTH_KEY . $date);
            if (hash_equals($expected, $hash)) {
                $valid = true;
                break;
            }
        }

        if (!$valid) {
            return null;
        }
    }
    // Long token used by the legacy auth patch: user_id:issued_at:expires_at:hmac.
    elseif (count($parts) === 4) {
        [$user_id, $issued_at, $expires_at, $signature] = $parts;
        if (!ctype_digit((string) $user_id) || !ctype_digit((string) $issued_at) || !ctype_digit((string) $expires_at)) {
            return null;
        }
        if ((int) $expires_at < time()) {
            return null;
        }

        $payload = $user_id . '|' . $issued_at . '|' . $expires_at;
        $expected = hash_hmac('sha256', $payload, mm_token_secret());
        $valid = hash_equals($expected, $signature);

        if (!$valid) {
            return null;
        }
    } else {
        return null;
    }

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

// Lee el token Bearer desde m??ltiples fuentes (fallback para servidores que filtran el header)
function mm_extract_token(WP_REST_Request $req): string {
    // 1. M??todo est??ndar WP REST API
    $token = $req->get_header('Authorization') ?? '';

    // 2. $_SERVER directo (PHP-FPM / FastCGI)
    if (empty($token)) {
        $token = $_SERVER['HTTP_AUTHORIZATION']
              ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
              ?? '';
    }

    // 3. getallheaders() (Apache mod_php)
    if (empty($token) && function_exists('getallheaders')) {
        $all   = getallheaders();
        $token = $all['Authorization'] ?? $all['authorization'] ?? '';
    }

    // 4. Token enviado en el body como _token (fallback final)
    if (empty($token)) {
        $bt = $req->get_param('_token') ?? '';
        if (!empty($bt)) $token = "Bearer {$bt}";
    }

    $clean_token = str_replace(['Bearer ', 'bearer '], '', trim($token));
    
    
    return $clean_token;
}

function mm_get_request_user(WP_REST_Request $req): ?WP_User
{
    $token = mm_extract_token($req);
    if ($token) {
        $token_user = mm_get_user_from_token($token);
        if ($token_user) return $token_user;
    }

    if (is_user_logged_in()) {
        $current_user = wp_get_current_user();
        if ($current_user instanceof WP_User && $current_user->ID) {
            return $current_user;
        }
    }

    return null;
}

function mm_user_data(WP_User $user): array
{
    $is_premium     = function_exists('mm_is_user_premium') ? mm_is_user_premium($user->ID) : false;
    $premium_expiry = get_user_meta($user->ID, 'mm_premium_expiry', true) ?: null;
    $custom_avatar  = get_user_meta($user->ID, 'mm_avatar_url', true) ?: null;
    $banner_color   = get_user_meta($user->ID, 'mm_banner_color', true) ?: null;
    return [
        'id'             => $user->ID,
        'username'       => $user->display_name ?: $user->user_login,
        'email'          => $user->user_email,
        'display_name'   => $user->display_name,
        'avatar'         => $custom_avatar ?: get_avatar_url($user->ID),
        'coins'          => mm_get_coins($user->ID),
        'is_premium'     => $is_premium,
        'premium_expiry' => $premium_expiry,
        'banner_color'   => $banner_color,
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

// ????????? REST: LOGOUT ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_logout(WP_REST_Request $req): WP_REST_Response
{
    wp_logout();
    return new WP_REST_Response(['success' => true, 'message' => 'Sesión cerrada'], 200);
}

// ????????? REST: LOGIN ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_login(WP_REST_Request $req): WP_REST_Response
{
    $email    = sanitize_email($req->get_param('email') ?? '');
    $password = $req->get_param('password') ?? '';

    if (empty($email) || empty($password))
        return new WP_REST_Response(['success' => false, 'message' => 'Correo y contrase??a requeridos.'], 400);

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

// ????????? REST: REGISTRO ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_register(WP_REST_Request $req): WP_REST_Response
{
    $email    = sanitize_email($req->get_param('email') ?? '');
    $password = $req->get_param('password') ?? '';
    $username = sanitize_user($req->get_param('username') ?? '');

    if (empty($email) || empty($password))
        return new WP_REST_Response(['success' => false, 'message' => 'Correo y contrase??a requeridos.'], 400);
    if (email_exists($email))
        return new WP_REST_Response(['success' => false, 'message' => 'El correo ya est?? en uso.'], 409);

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

// ????????? REST: ME ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_me(WP_REST_Request $req): WP_REST_Response
{
    $user = mm_get_request_user($req);
    if (!$user)
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido o expirado.'], 401);

    return new WP_REST_Response([
        'success' => true,
        'user'    => mm_user_data($user),
        'token'   => mm_generate_token($user->ID),  // Token fresco para evitar expiraci??n silenciosa
    ], 200);
}

// ????????? REST: COINS ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_coins(WP_REST_Request $req): WP_REST_Response
{
    $user = mm_get_request_user($req);
    if (!$user)
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);

    return new WP_REST_Response(['success' => true, 'coins' => mm_get_coins($user->ID)], 200);
}

// ????????? REST: CAP??TULOS DESBLOQUEADOS ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
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

// ????????? REST: COMPRAR CAP??TULO ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_buy_chapter(WP_REST_Request $req): WP_REST_Response
{
    $user       = mm_get_request_user($req);
    $chapter_id = (int) ($req->get_param('chapter_id') ?? 0);

    if (!$user)
        return new WP_REST_Response(['success' => false, 'message' => 'Debes iniciar sesi??n.'], 401);
    if (!$chapter_id)
        return new WP_REST_Response(['success' => false, 'message' => 'Capítulo inválido.'], 400);

    if (mm_user_bought_chapter($user->ID, $chapter_id))
        return new WP_REST_Response(['success' => true, 'message' => 'Ya adquirido', 'coins' => mm_get_coins($user->ID)], 200);

    $sell = get_post_meta($chapter_id, 'myCRED_sell_content', true);
    if (!$sell || $sell['status'] === 'disabled' || floatval($sell['price']) <= 0)
        return new WP_REST_Response(['success' => true, 'message' => 'Cap??tulo gratuito', 'coins' => mm_get_coins($user->ID)], 200);

    $price   = floatval($sell['price']);
    $balance = mm_get_coins($user->ID);

    if ($balance < $price)
        return new WP_REST_Response(['success' => false, 'message' => 'Saldo insuficiente', 'coins' => $balance], 402);

    if (function_exists('mycred_subtract')) {
        mycred_subtract('buy_chapter', $user->ID, $price, 'Compra cap??tulo #' . $chapter_id, $chapter_id);
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
        'message' => 'Cap??tulo desbloqueado',
        'coins'   => mm_get_coins($user->ID),
    ], 200);
}

// ????????? REST: CONTENIDO DE CAP??TULO (bypass filtro myCRED) ??????????????????????????????????????????????????????????????????
function mm_handle_chapter_content(WP_REST_Request $req): WP_REST_Response
{
    $chapter_id = (int) ($req->get_param('id') ?? 0);
    if (!$chapter_id)
        return new WP_REST_Response(['success' => false, 'message' => 'ID inválido'], 400);

    $post = get_post($chapter_id);
    if (!$post || $post->post_status !== 'publish')
        return new WP_REST_Response(['success' => false, 'message' => 'Cap??tulo no encontrado'], 404);

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
                'message' => 'Inicia sesi??n para leer este cap??tulo.',
            ], 401);

        if (!mm_user_bought_chapter($user->ID, $chapter_id))
            return new WP_REST_Response([
                'success' => false,
                'locked'  => true,
                'price'   => floatval($sell['price']),
                'message' => 'Cap??tulo de pago ??? adqui??relo para leerlo.',
            ], 402);
    }

    // M??todo 1: im??genes adjuntas al post (full-size, sin filtros de myCRED)
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

    // M??todo 2: si no hay adjuntos, extraer URLs del shortcode/HTML del post
    if (empty($image_urls) && !empty($post->post_content)) {
        // Extraer <img src> del HTML raw (sin ejecutar filtros)
        preg_match_all('/src=["\']([^"\']+\.(jpe?g|png|webp|gif))["\']/', $post->post_content, $m1);
        foreach ($m1[1] as $url) {
            if (filter_var($url, FILTER_VALIDATE_URL)) $image_urls[] = $url;
        }

        // Si a??n vac??o, renderizar shortcodes con contexto de post correcto
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

function mm_verify_paypal_ipn_payload(string $raw, bool $sandbox = false): bool
{
    if ($raw === '') return false;

    $host = $sandbox ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr' : 'https://ipnpb.paypal.com/cgi-bin/webscr';
    $verify = wp_remote_post($host, [
        'body' => 'cmd=_notify-validate&' . $raw,
        'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
        'timeout' => 30,
    ]);

    if (is_wp_error($verify)) return false;
    return trim((string) wp_remote_retrieve_body($verify)) === 'VERIFIED';
}

function mm_coin_log_data(object $pending_payment, string $txn_id): array
{
    $sales_data = [
        'to'       => $pending_payment->recipient_id,
        'from'     => $pending_payment->buyer_id,
        'amount'   => $pending_payment->amount,
        'cost'     => $pending_payment->cost,
        'currency' => $pending_payment->currency,
        'ctype'    => $pending_payment->point_type,
    ];

    return [
        'ref_type' => 'user',
        'txn_id' => $txn_id,
        'sales_data' => implode('|', $sales_data),
    ];
}

function mm_coin_transaction_exists(string $txn_id, object $pending_payment): bool
{
    $mycred = mycred($pending_payment->point_type ?: MYCRED_DEFAULT_TYPE_KEY);
    $reference = 'buy_creds_with_paypal_standard';
    $data = mm_coin_log_data($pending_payment, $txn_id);

    return $mycred->has_entry(
        $reference,
        (int) $pending_payment->buyer_id,
        (int) $pending_payment->recipient_id,
        $data,
        $pending_payment->point_type ?: MYCRED_DEFAULT_TYPE_KEY
    );
}

function mm_mark_coin_payment_completed(int $payment_id, string $txn_id): void
{
    update_post_meta($payment_id, 'mm_payment_status', 'completed');
    update_post_meta($payment_id, 'mm_paypal_txn_id', $txn_id);
    update_post_meta($payment_id, 'mm_paid_at', current_time('mysql'));
}

function mm_complete_coin_payment(int $payment_id, string $txn_id): bool
{
    if (!function_exists('buycred_get_pending_payment') || !function_exists('mycred')) return false;

    $pending_payment = buycred_get_pending_payment($payment_id);
    if ($pending_payment === false) return false;

    if (mm_coin_transaction_exists($txn_id, $pending_payment)) {
        mm_mark_coin_payment_completed($payment_id, $txn_id);
        return true;
    }

    $mycred = mycred($pending_payment->point_type ?: MYCRED_DEFAULT_TYPE_KEY);
    $reply = $mycred->add_creds(
        'buy_creds_with_paypal_standard',
        (int) $pending_payment->recipient_id,
        (float) $pending_payment->amount,
        '%plural% purchase',
        (int) $pending_payment->buyer_id,
        mm_coin_log_data($pending_payment, $txn_id),
        $pending_payment->point_type ?: MYCRED_DEFAULT_TYPE_KEY
    );

    if (!$reply) return false;

    mm_mark_coin_payment_completed($payment_id, $txn_id);
    return true;
}

function mm_process_coin_ipn(): void
{
    $raw = file_get_contents('php://input');
    if (empty($raw) || !mm_verify_paypal_ipn_payload($raw)) {
        status_header(400);
        echo 'INVALID';
        return;
    }

    parse_str($raw, $ipn);

    if (($ipn['payment_status'] ?? '') !== 'Completed') {
        status_header(202);
        echo 'IGNORED';
        return;
    }

    $payment_id = absint($ipn['custom'] ?? 0);
    $txn_id = sanitize_text_field($ipn['txn_id'] ?? '');
    if (!$payment_id || $txn_id === '') {
        status_header(400);
        echo 'MISSING_DATA';
        return;
    }

    $pending_payment = function_exists('buycred_get_pending_payment') ? buycred_get_pending_payment($payment_id) : false;
    if ($pending_payment === false) {
        status_header(404);
        echo 'PAYMENT_NOT_FOUND';
        return;
    }

    $expectedCost = (float) $pending_payment->cost;
    $paidCost = (float) ($ipn['mc_gross'] ?? 0);
    $expectedCurrency = (string) $pending_payment->currency;
    $paidCurrency = (string) ($ipn['mc_currency'] ?? '');
    $receiver = strtolower(trim((string) ($ipn['receiver_email'] ?? $ipn['business'] ?? '')));
    $expectedReceiver = strtolower(trim('25tumanhuaerick12@gmail.com'));

    if ($paidCost !== $expectedCost || $paidCurrency !== $expectedCurrency || ($receiver !== '' && $receiver !== $expectedReceiver)) {
        update_post_meta($payment_id, 'mm_payment_status', 'mismatch');
        status_header(409);
        echo 'MISMATCH';
        return;
    }

    if (get_post_meta($payment_id, 'mm_payment_status', true) === 'completed') {
        status_header(200);
        echo 'OK';
        return;
    }

    if (mm_complete_coin_payment($payment_id, $txn_id)) {
        status_header(200);
        echo 'OK';
        return;
    }

    update_post_meta($payment_id, 'mm_payment_status', 'error');
    status_header(500);
    echo 'FAILED';
}

// ????????? REST: GENERAR PAGO PAYPAL (buyCRED PayPal Standard bypass) ??????????????????
function mm_handle_buy_coins(WP_REST_Request $req): WP_REST_Response
{
    $user = mm_get_request_user($req);

    if (!$user) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Sesión inválida. Por favor cierra sesión y vuelve a iniciarla.'
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

    if (!defined('MYCRED_BUY_KEY')) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'buyCRED no est?? disponible en este momento.'
        ], 500);
    }

    // Crear el pending payment compatible con buyCRED/myCRED
    $payment_id = wp_insert_post([
        'post_title'   => strtoupper(wp_generate_password(12, false, false)),
        'post_type'    => MYCRED_BUY_KEY,
        'post_status'  => 'publish',
        'post_author'  => $user->ID,
        'comment_status' => 'closed',
    ]);

    if (is_wp_error($payment_id) || !$payment_id) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Error al crear la orden.'
        ], 500);
    }

    update_post_meta($payment_id, 'point_type', 'mycred_default');
    update_post_meta($payment_id, 'amount', $amount);
    update_post_meta($payment_id, 'cost', number_format($cost, 2, '.', ''));
    update_post_meta($payment_id, 'currency', 'USD');
    update_post_meta($payment_id, 'from', $user->ID);
    update_post_meta($payment_id, 'to', $user->ID);
    update_post_meta($payment_id, 'gateway', 'paypal-standard');
    update_post_meta($payment_id, 'mm_payment_status', 'pending');
    update_post_meta($payment_id, 'mm_requested_pack_amount', $amount);
    update_post_meta($payment_id, 'mm_requested_pack_cost', $cost);
    
    // URL de retorno y notificacion. REST API evita el redireccionamiento can??nico 301 de WordPress.
    $site_url = get_site_url();
    $return_url = $site_url . '/pago-exitoso?coins=1&payment_id=' . $payment_id;
    $notify_url = $site_url . '/wp-json/mangamukai/v1/ipn/coins';

    // Par??metros para PayPal Standard (_xclick)
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

function mm_handle_confirm_buy_coins(WP_REST_Request $req): WP_REST_Response
{
    $user = mm_get_request_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    $payment_id = absint($req->get_param('payment_id') ?? 0);
    if (!$payment_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'payment_id requerido.'], 400);
    }

    $payment_post = get_post($payment_id);
    if (!$payment_post || (int) $payment_post->post_author !== (int) $user->ID) {
        return new WP_REST_Response(['success' => false, 'message' => 'Pago no encontrado.'], 404);
    }

    $status = get_post_meta($payment_id, 'mm_payment_status', true) ?: 'pending';

    return new WP_REST_Response([
        'success' => true,
        'completed' => $status === 'completed',
        'status' => $status,
        'coins' => mm_get_coins($user->ID),
    ], 200);
}

// ????????? MANEJADORES DE INTERACCI??N (Sustitutos de Supabase) ????????????????????????????????????????????????????????????

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
    $token = mm_extract_token($request);
    $user = null;
    if (!empty($token)) {
        $user = mm_get_user_from_token($token);
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

    // Opcional: si mandan un manga_id, devolver los contadores globales de ese manga
    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if ($manga_id) {
        $response['manga_likes'] = (int)get_post_meta($manga_id, 'mm_manga_likes', true);
        $response['manga_bookmarks'] = (int)get_post_meta($manga_id, 'mm_manga_bookmarks', true);
        $response['manga_shares'] = (int)get_post_meta($manga_id, 'mm_manga_shares', true);
    }

    return new WP_REST_Response($response, 200);
}

function mm_handle_bookmark(WP_REST_Request $request) {
    $token = mm_extract_token($request);
    if (!$token) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token faltante'], 401);
    }
    $user = mm_get_user_from_token($token);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido'], 401);
    }

    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if (!$manga_id) return new WP_REST_Response(['success' => false], 400);

    $bookmarks = get_user_meta($user->ID, 'mm_user_bookmarks', true);
    if (!is_array($bookmarks)) $bookmarks = [];

    $action = '';
    $global_bookmarks = (int)get_post_meta($manga_id, 'mm_manga_bookmarks', true);
    $idx = array_search($manga_id, $bookmarks);
    if ($idx !== false) {
        unset($bookmarks[$idx]);
        $bookmarks = array_values($bookmarks);
        $global_bookmarks = max(0, $global_bookmarks - 1);
        $action = 'removed';
    } else {
        $bookmarks[] = $manga_id;
        $global_bookmarks++;
        $action = 'added';
    }
    update_user_meta($user->ID, 'mm_user_bookmarks', $bookmarks);
    update_post_meta($manga_id, 'mm_manga_bookmarks', $global_bookmarks);

    return new WP_REST_Response(['success' => true, 'action' => $action, 'total_bookmarks' => $global_bookmarks], 200);
}

function mm_handle_like(WP_REST_Request $request) {
    $token = mm_extract_token($request);
    if (!$token) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token faltante'], 401);
    }
    $user = mm_get_user_from_token($token);
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

function mm_handle_share(WP_REST_Request $request) {
    $manga_id = sanitize_text_field($request->get_param('manga_id'));
    if (!$manga_id) return new WP_REST_Response(['success' => false], 400);

    $global_shares = (int)get_post_meta($manga_id, 'mm_manga_shares', true);
    $global_shares++;
    update_post_meta($manga_id, 'mm_manga_shares', $global_shares);

    return new WP_REST_Response(['success' => true, 'total_shares' => $global_shares], 200);
}

function mm_handle_history(WP_REST_Request $request) {
    $token = mm_extract_token($request);
    if (!$token) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token faltante'], 401);
    }
    $user = mm_get_user_from_token($token);
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

// ????????? REST: CAP??TULOS DE UNA SERIE (por ero_seri) ???????????????????????????????????????????????????????????????????????????????????????
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

// ????????? REST: CAT??LOGO COMPLETO ??? optimizado con 3 queries en lote + cache ??????????????????
function mm_handle_catalog(WP_REST_Request $req): WP_REST_Response
{
    $cache_key     = 'mm_catalog_v2';
    $cache_seconds = 900; // 15 minutos

    // Servir desde cach?? si existe y no se pide refresco
    $force_refresh = $req->get_param('refresh') === '1';
    if (!$force_refresh) {
        $cached = get_transient($cache_key);
        if ($cached !== false) return new WP_REST_Response($cached, 200);
    }

    global $wpdb;

    // ?????? QUERY 1: todos los mangas con thumbnail y meta (solo con cap??tulos) ????????????
    $posts = $wpdb->get_results("
        SELECT p.ID, p.post_title, p.post_date, p.post_modified, p.post_content,
               REPLACE(att.guid, 'http://mangamukai.com', 'https://mangamukai.com') AS cover_url,
               pm_type.meta_value AS tipo,
               pm_status.meta_value AS ero_status,
               pm_cv.meta_value  AS custom_cover
        FROM {$wpdb->posts} p
        LEFT JOIN {$wpdb->postmeta} pm_thumb
               ON pm_thumb.post_id = p.ID AND pm_thumb.meta_key = '_thumbnail_id'
        LEFT JOIN {$wpdb->posts} att
               ON att.ID = pm_thumb.meta_value
        LEFT JOIN {$wpdb->postmeta} pm_type
               ON pm_type.post_id = p.ID AND pm_type.meta_key = 'ero_type'
        LEFT JOIN {$wpdb->postmeta} pm_status
               ON pm_status.post_id = p.ID AND pm_status.meta_key = 'ero_status'
        LEFT JOIN {$wpdb->postmeta} pm_cv
               ON pm_cv.post_id = p.ID AND pm_cv.meta_key = 'manga_cover'
        WHERE p.post_type = 'manga' AND p.post_status = 'publish'
        ORDER BY p.post_date DESC
    ", ARRAY_A);

    if (empty($posts)) {
        return new WP_REST_Response(['success' => true, 'total' => 0, 'mangas' => []], 200);
    }

    $all_ids = array_column($posts, 'ID');
    $ids_in  = implode(',', array_map('intval', $all_ids));

    // ?????? QUERY 2: todos los g??neros de todos los mangas en un solo JOIN ????????????????????????
    $genre_rows = $wpdb->get_results("
        SELECT tr.object_id AS manga_id, t.name AS genre
        FROM {$wpdb->term_relationships} tr
        JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
                                       AND tt.taxonomy IN ('wp-manga-genre', 'genres', 'category')
        JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
        WHERE tr.object_id IN ({$ids_in})
    ", ARRAY_A);

    // Agrupar g??neros por manga_id
    $genres_map = [];
    foreach ($genre_rows as $row) {
        $genres_map[(int)$row['manga_id']][] = $row['genre'];
    }

    // ?????? QUERY 3: primer cap??tulo (m??s bajo ero_chapter) por manga ???????????????????????????????????????
    $chapter_rows = $wpdb->get_results("
        SELECT pm_seri.meta_value AS ero_seri,
               p.ID               AS chapter_id,
               pm_sell.meta_value AS sell_meta
        FROM {$wpdb->postmeta} pm_seri
        JOIN {$wpdb->posts} p ON p.ID = pm_seri.post_id
                              AND p.post_type = 'post'
                              AND p.post_status = 'publish'
        JOIN (
            SELECT pm_seri2.meta_value AS s,
                   MIN(CAST(pm_ch.meta_value AS UNSIGNED)) AS min_ch
            FROM {$wpdb->postmeta} pm_seri2
            JOIN {$wpdb->postmeta} pm_ch ON pm_ch.post_id = pm_seri2.post_id
                                        AND pm_ch.meta_key = 'ero_chapter'
            JOIN {$wpdb->posts} pp ON pp.ID = pm_seri2.post_id
                                  AND pp.post_type = 'post'
                                  AND pp.post_status = 'publish'
            WHERE pm_seri2.meta_key = 'ero_seri'
              AND pm_seri2.meta_value IN ({$ids_in})
            GROUP BY pm_seri2.meta_value
        ) first ON first.s = pm_seri.meta_value
        JOIN {$wpdb->postmeta} pm_ch2 ON pm_ch2.post_id = p.ID
                                     AND pm_ch2.meta_key = 'ero_chapter'
                                     AND CAST(pm_ch2.meta_value AS UNSIGNED) = first.min_ch
        LEFT JOIN {$wpdb->postmeta} pm_sell ON pm_sell.post_id = p.ID
                                           AND pm_sell.meta_key = 'myCRED_sell_content'
        WHERE pm_seri.meta_key = 'ero_seri'
          AND pm_seri.meta_value IN ({$ids_in})
    ", ARRAY_A);

    // Indexar por ero_seri
    $chapters_map = [];
    foreach ($chapter_rows as $row) {
        $sid = (int)$row['ero_seri'];
        if (!isset($chapters_map[$sid])) {
            $sell     = maybe_unserialize($row['sell_meta']);
            $is_paid  = is_array($sell)
                && ($sell['status'] ?? '') === 'enabled'
                && floatval($sell['price'] ?? 0) > 0;
            $chapters_map[$sid] = [
                'id'      => (int)$row['chapter_id'],
                'is_free' => !$is_paid,
            ];
        }
    }

    // ?????? ENSAMBLAR RESPUESTA ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
    // Latest two chapter updates per manga. This keeps catalog-derived sections in
    // the same order as WordPress updates, including edited covers and chapters.
    $recent_chapter_rows = $wpdb->get_results("
        SELECT pm_seri.meta_value AS ero_seri,
               p.ID               AS chapter_id,
               p.post_date        AS chapter_date,
               p.post_modified    AS chapter_modified,
               pm_ch.meta_value   AS chapter_num,
               pm_sell.meta_value AS sell_meta
        FROM {$wpdb->postmeta} pm_seri
        JOIN {$wpdb->posts} p ON p.ID = pm_seri.post_id
                              AND p.post_type = 'post'
                              AND p.post_status = 'publish'
        LEFT JOIN {$wpdb->postmeta} pm_ch ON pm_ch.post_id = p.ID
                                         AND pm_ch.meta_key = 'ero_chapter'
        LEFT JOIN {$wpdb->postmeta} pm_sell ON pm_sell.post_id = p.ID
                                           AND pm_sell.meta_key = 'myCRED_sell_content'
        WHERE pm_seri.meta_key = 'ero_seri'
          AND pm_seri.meta_value IN ({$ids_in})
        ORDER BY CAST(pm_seri.meta_value AS UNSIGNED), p.post_modified DESC, p.post_date DESC
    ", ARRAY_A);

    $recent_chapters_map = [];
    $latest_update_map   = [];
    foreach ($recent_chapter_rows as $row) {
        $sid = (int)$row['ero_seri'];
        if (!isset($recent_chapters_map[$sid])) $recent_chapters_map[$sid] = [];

        $chapter_ts = max(strtotime($row['chapter_date'] ?: '') ?: 0, strtotime($row['chapter_modified'] ?: '') ?: 0);
        $latest_update_map[$sid] = max($latest_update_map[$sid] ?? 0, $chapter_ts);

        if (count($recent_chapters_map[$sid]) >= 2) continue;

        $sell     = maybe_unserialize($row['sell_meta']);
        $is_paid  = is_array($sell)
            && ($sell['status'] ?? '') === 'enabled'
            && floatval($sell['price'] ?? 0) > 0;
        $recent_chapters_map[$sid][] = [
            'id'       => (int)$row['chapter_id'],
            'numero'   => $row['chapter_num'] ?: '-',
            'esGratis' => !$is_paid,
            'fecha'    => $row['chapter_modified'] ?: $row['chapter_date'],
            'published_at' => $row['chapter_date'],
            'updated_at' => $row['chapter_modified'],
        ];
    }

    $generos_mujer  = ['romance','drama','reencarnaci??n','reencarnacion','romance obsesivo',
                       'comedia','protagonista femenina fuerte','har??n inverso','haren inverso',
                       'madre','madrastra','ni??os','ninos','beb??s','bebes','otome','gl','yuri',
                       'ceo','presidente','trabajo de oficina','vampiros','vampiro','manhwa',
                       'industria del entretenimiento','romance escolar','romance er??tico','romance tl'];
    $generos_hombre = ['harem','acci??n','accion','action','deportes','sports',
                       'manga juvenil de acci??n','manga juvenil de accion',
                       'shounen','shonen','seinen','mecha','batalla'];

    $mangas = [];
    foreach ($posts as $p) {
        $pid    = (int)$p['ID'];
        $genres = $genres_map[$pid] ?? [];
        $gl     = array_map('mb_strtolower', $genres);

        $es_mujer  = array_intersect($gl, $generos_mujer)  !== [];
        $es_hombre = array_intersect($gl, $generos_hombre) !== [];

        // Mujer = default cuando no se detecta g??nero masculino expl??cito
        if (!$es_mujer && !$es_hombre) {
            $desc_lower = mb_strtolower(wp_strip_all_tags($p['post_content'] ?? ''));
            $tit_lower  = mb_strtolower($p['post_title'] ?? '');
            $palabras_mujer = ['princesa','duquesa','condesa','reina','dama','amor','enamorad','romance','ella ','esclavo','marquesa'];
            $palabras_hombre = ['guerrero','caballero','espadachin','sistema','nivel','dungeon','monstruo','h??roe'];
            foreach ($palabras_mujer as $pw) { if (str_contains($desc_lower.$tit_lower, $pw)) { $es_mujer = true; break; } }
            foreach ($palabras_hombre as $pw) { if (str_contains($desc_lower.$tit_lower, $pw)) { $es_hombre = true; break; } }
            if (!$es_mujer && !$es_hombre) $es_mujer = true;
        }

        $genero = $es_mujer ? 'Mujer' : 'Hombre';
        if ($es_mujer && $es_hombre) $genero = 'Mujer'; // prioridad mujer si ambos

        $ch   = $chapters_map[$pid] ?? null;
        $recent_caps = $recent_chapters_map[$pid] ?? [];
        $manga_update_ts = max(strtotime($p['post_date'] ?: '') ?: 0, strtotime($p['post_modified'] ?: '') ?: 0);
        $latest_update_ts = max($manga_update_ts, $latest_update_map[$pid] ?? 0);
        $latest_update_at = $latest_update_ts > 0 ? date('Y-m-d H:i:s', $latest_update_ts) : $p['post_date'];
        $desc = wp_strip_all_tags($p['post_content'] ?? '');
        if (strlen($desc) > 400) $desc = substr($desc, 0, 397) . '...';

        $mangas[] = [
            'id'             => $pid,
            'titulo'         => $p['post_title'],
            'portada'        => $p['custom_cover'] ?: ($p['cover_url'] ?: 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada'),
            'fecha'          => $latest_update_at,
            'published_at'   => $p['post_date'],
            'updated_at'     => $p['post_modified'],
            'latest_update_at' => $latest_update_at,
            'tipo'           => $p['tipo'] ?: 'Manga',
            'genres'         => $genres,
            'genero'         => $genero,
            'descripcion'    => $desc ?: 'Lee esta historia en MangaMukai.',
            'esGratis'       => $ch ? $ch['is_free'] : true,
            'firstChapterId' => $ch ? $ch['id'] : null,
            'capitulosRecientes' => $recent_caps,
            'status'         => $p['ero_status'] ?: '',
        ];
    }

    $response = ['success' => true, 'total' => count($mangas), 'mangas' => $mangas];
    set_transient($cache_key, $response, $cache_seconds);

    return new WP_REST_Response($response, 200);
}

// ????????? REST: DETALLE DE UN MANGA POR ID ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
function mm_handle_manga_detail(WP_REST_Request $req): WP_REST_Response
{
    $pid  = (int) $req->get_param('id');
    $post = get_post($pid);

    if (!$post || $post->post_type !== 'manga' || $post->post_status !== 'publish') {
        return new WP_REST_Response(['success' => false, 'message' => 'Manga no encontrado'], 404);
    }

    $thumb_id  = get_post_thumbnail_id($pid);
    $cover_url = $thumb_id ? wp_get_attachment_url($thumb_id) : '';
    $custom_cover = get_post_meta($pid, 'manga_cover', true);

    $tipo   = get_post_meta($pid, 'ero_type', true) ?: 'Manga';
    $status = get_post_meta($pid, 'ero_status', true) ?: '';
    $original_title = get_post_meta($pid, 'ero_japanese', true) ?: '';
    $manga_date = get_post_meta($pid, 'ero_published', true) ?: '';
    $studio = get_post_meta($pid, 'ero_author', true) ?: '';
    $platform = get_post_meta($pid, 'ero_artist', true) ?: '';

    $genres = [];
    foreach (['wp-manga-genre', 'genres', 'category'] as $tax) {
        $terms = get_the_terms($pid, $tax);
        if ($terms && !is_wp_error($terms)) {
            $genres = array_unique(array_merge($genres, array_map(fn($t) => $t->name, $terms)));
        }
    }
    $genres = array_values($genres);

    $desc = wp_strip_all_tags($post->post_content);

    return new WP_REST_Response([
        'success'     => true,
        'id'          => $pid,
        'titulo'      => $post->post_title,
        'titulo_original' => $original_title,
        'portada'     => $custom_cover ?: ($cover_url ?: 'https://placehold.co/300x450/1a1a1a/FFF?text=Sin+Portada'),
        'fecha'       => $post->post_date,
        'fecha_manga' => $manga_date,
        'studio'      => $studio,
        'platform'    => $platform,
        'published_at'=> $post->post_date,
        'tipo'        => $tipo,
        'genres'      => $genres,
        'descripcion' => $desc ?: 'Lee esta historia en MangaMukai.',
        'status'      => $status,
    ], 200);
}

function mm_handle_get_profile(WP_REST_Request $req): WP_REST_Response
{
    $token = mm_extract_token($req);
    $user  = $token ? mm_get_user_from_token($token) : null;
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    $uid = $user->ID;

    return new WP_REST_Response([
        'success'      => true,
        'username'     => $user->display_name ?: $user->user_login,
        'bio'          => get_user_meta($uid, 'mm_bio', true) ?: '',
        'location'     => get_user_meta($uid, 'mm_location', true) ?: '',
        'banner_color' => get_user_meta($uid, 'mm_banner_color', true) ?: 'bg-[#FF4D88]',
        'banner_url'   => get_user_meta($uid, 'mm_banner_url', true) ?: '',
        'avatar_url'   => get_user_meta($uid, 'mm_avatar_url', true) ?: get_avatar_url($uid),
        'social_links' => json_decode(get_user_meta($uid, 'mm_social_links', true) ?: '{}', true),
        'created_at'   => $user->user_registered,
    ], 200);
}

function mm_handle_save_profile(WP_REST_Request $req): WP_REST_Response
{
    $token = mm_extract_token($req);
    $user  = $token ? mm_get_user_from_token($token) : null;
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    $uid = $user->ID;
    $body = $req->get_json_params() ?: [];

    if (isset($body['username'])) {
        $display_name = sanitize_text_field($body['username']);
        if ($display_name !== '') {
            wp_update_user([
                'ID' => $uid,
                'display_name' => $display_name,
                'nickname' => $display_name,
            ]);
        }
    }

    if (isset($body['bio'])) update_user_meta($uid, 'mm_bio', sanitize_textarea_field($body['bio']));
    if (isset($body['location'])) update_user_meta($uid, 'mm_location', sanitize_text_field($body['location']));
    if (isset($body['banner_color'])) update_user_meta($uid, 'mm_banner_color', sanitize_text_field($body['banner_color']));
    if (isset($body['banner_url'])) update_user_meta($uid, 'mm_banner_url', esc_url_raw($body['banner_url']));

    if (isset($body['social_links']) && is_array($body['social_links'])) {
        $sanitized = [];
        foreach ($body['social_links'] as $key => $value) {
            $meta_key = sanitize_key($key);
            $sanitized[$meta_key] = $meta_key === 'discord'
                ? sanitize_text_field($value)
                : esc_url_raw($value);
        }
        update_user_meta($uid, 'mm_social_links', wp_json_encode($sanitized));
    }

    return new WP_REST_Response(['success' => true], 200);
}

function mm_handle_upload_avatar(WP_REST_Request $req): WP_REST_Response
{
    $token = mm_extract_token($req);
    $user  = $token ? mm_get_user_from_token($token) : null;
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    if (empty($_FILES['avatar'])) {
        return new WP_REST_Response(['success' => false, 'message' => 'No se envio archivo.'], 400);
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $upload = wp_handle_upload($_FILES['avatar'], ['test_form' => false]);
    if (isset($upload['error'])) {
        return new WP_REST_Response(['success' => false, 'message' => $upload['error']], 500);
    }

    update_user_meta($user->ID, 'mm_avatar_url', $upload['url']);
    return new WP_REST_Response(['success' => true, 'avatar_url' => $upload['url']], 200);
}

function mm_handle_upload_banner(WP_REST_Request $req): WP_REST_Response
{
    $token = mm_extract_token($req);
    $user  = $token ? mm_get_user_from_token($token) : null;
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    if (empty($_FILES['banner'])) {
        return new WP_REST_Response(['success' => false, 'message' => 'No se envio archivo.'], 400);
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $upload = wp_handle_upload($_FILES['banner'], ['test_form' => false]);
    if (isset($upload['error'])) {
        return new WP_REST_Response(['success' => false, 'message' => $upload['error']], 500);
    }

    update_user_meta($user->ID, 'mm_banner_url', $upload['url']);
    return new WP_REST_Response(['success' => true, 'banner_url' => $upload['url']], 200);
}

