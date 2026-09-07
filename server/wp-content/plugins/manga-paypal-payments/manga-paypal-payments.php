<?php
/**
 * Plugin Name: MangaMukai PayPal Payments
 * Description: PayPal Standard para compra de monedas y suscripción PRO. Extiende /me con estado premium.
 * Version: 1.0
 */

if (!defined('ABSPATH')) exit;

define('MMPP_PAYPAL_BUSINESS', '25tumanhuaerick12@gmail.com');

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function mmpp_extract_token(WP_REST_Request $req): string {
    $auth = $req->get_header('Authorization') ?? '';
    if (empty($auth)) $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (empty($auth) && function_exists('getallheaders')) {
        $all  = getallheaders();
        $auth = $all['Authorization'] ?? $all['authorization'] ?? '';
    }
    if (empty($auth)) {
        $bt = $req->get_param('_token') ?? '';
        if (!empty($bt)) $auth = "Bearer {$bt}";
    }
    return preg_replace('/^Bearer\s+/i', '', trim($auth));
}

function mmpp_auth_user(WP_REST_Request $req): ?WP_User {
    $token = mmpp_extract_token($req);
    if (empty($token)) return null;
    // Prioridad: función legacy (maneja tokens de 2 y 4 partes), luego la nueva si existe.
    if (function_exists('mmfix_get_user_from_token')) return mmfix_get_user_from_token($token);
    if (function_exists('mm_get_user_from_token'))    return mm_get_user_from_token($token);
    return null;
}

// ─── COINS ────────────────────────────────────────────────────────────────────

function mmpp_get_coins(int $user_id): float {
    if (function_exists('mmfix_get_coins'))          return (float) mmfix_get_coins($user_id);
    if (function_exists('mycred_get_users_balance')) return (float) mycred_get_users_balance($user_id);
    $raw = get_user_meta($user_id, 'mycred_default', true);
    return $raw !== '' ? (float) $raw : 0.0;
}

function mmpp_add_coins(int $user_id, int $amount, int $ref_id = 0): void {
    if (function_exists('mycred_add')) {
        mycred_add('coin_purchase', $user_id, $amount, sprintf('Pack de %d monedas (PayPal)', $amount), $ref_id);
        return;
    }
    update_user_meta($user_id, 'mycred_default', mmpp_get_coins($user_id) + $amount);
}

// ─── PREMIUM ──────────────────────────────────────────────────────────────────

function mmpp_is_premium(int $user_id): bool {
    if (!get_user_meta($user_id, 'mm_is_premium', true)) return false;
    $expiry = get_user_meta($user_id, 'mm_premium_expiry', true);
    if (!$expiry) return true;
    return strtotime($expiry) > time();
}

function mmpp_activate_premium(int $user_id, string $plan, int $months): void {
    $expiry = gmdate('Y-m-d H:i:s', strtotime("+{$months} months"));
    update_user_meta($user_id, 'mm_is_premium',           1);
    update_user_meta($user_id, 'mm_premium_expiry',       $expiry);
    update_user_meta($user_id, 'mm_premium_plan',         $plan);
    update_user_meta($user_id, 'mm_premium_activated_at', current_time('mysql'));
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Priority 100 corre DESPUÉS del plugin legacy (priority 99), así el override de /me gana.

add_action('rest_api_init', function () {

    // /me extendido con isPremium (override=true reemplaza al legacy)
    register_rest_route('mangamukai/v1', '/me', [
        'methods'             => 'GET',
        'callback'            => 'mmpp_handle_me',
        'permission_callback' => '__return_true',
    ], true);

    // Monedas
    register_rest_route('mangamukai/v1', '/buy-coins', [
        'methods'             => 'POST',
        'callback'            => 'mmpp_handle_buy_coins',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/buy-coins/confirm', [
        'methods'             => 'GET',
        'callback'            => 'mmpp_handle_confirm_buy_coins',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/ipn/coins', [
        'methods'             => 'POST',
        'callback'            => 'mmpp_handle_coin_ipn',
        'permission_callback' => '__return_true',
    ]);

    // Suscripción
    register_rest_route('mangamukai/v1', '/subscription', [
        'methods'             => 'GET',
        'callback'            => 'mmpp_handle_get_subscription',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/subscribe', [
        'methods'             => 'POST',
        'callback'            => 'mmpp_handle_subscribe',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/subscription/activate', [
        'methods'             => 'POST',
        'callback'            => 'mmpp_handle_activate_subscription',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('mangamukai/v1', '/ipn/subscribe', [
        'methods'             => 'POST',
        'callback'            => 'mmpp_handle_subscribe_ipn',
        'permission_callback' => '__return_true',
    ]);

}, 100);

// ─── /me CON PREMIUM ──────────────────────────────────────────────────────────

function mmpp_handle_me(WP_REST_Request $req): WP_REST_Response {
    $token = mmpp_extract_token($req);
    $user  = null;
    if ($token) {
        if (function_exists('mmfix_get_user_from_token')) $user = mmfix_get_user_from_token($token);
        elseif (function_exists('mm_get_user_from_token')) $user = mm_get_user_from_token($token);
    }
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token inválido o expirado.'], 401);
    }

    // Renovar token con el mismo formato que lo generó el plugin legacy
    $new_token = $token;
    if (function_exists('mmfix_generate_token'))   $new_token = mmfix_generate_token($user->ID);
    elseif (function_exists('mm_generate_token'))  $new_token = mm_generate_token($user->ID);

    $coins      = mmpp_get_coins($user->ID);
    $is_premium = mmpp_is_premium($user->ID);
    $expiry     = get_user_meta($user->ID, 'mm_premium_expiry', true) ?: null;
    // Este /me es el que gana (prioridad 100). Debe devolver el nombre visible y el
    // avatar propio, como mm_user_data(); si no, cada refresco de sesion del navbar
    // pisa el nombre y la foto editados en /perfil.
    $custom_avatar = get_user_meta($user->ID, 'mm_profile_avatar_url', true)
        ?: get_user_meta($user->ID, 'mm_avatar_url', true);

    return new WP_REST_Response([
        'success' => true,
        'token'   => $new_token,
        'user'    => [
            'id'             => $user->ID,
            'username'       => $user->display_name ?: $user->user_login,
            'email'          => $user->user_email,
            'display_name'   => $user->display_name,
            'avatar'         => $custom_avatar ?: get_avatar_url($user->ID),
            'coins'          => $coins,
            'isPremium'      => $is_premium,
            'is_premium'     => $is_premium,
            'premiumExpiry'  => $expiry,
            'premium_expiry' => $expiry,
        ],
    ], 200);
}

// ─── BUY COINS ────────────────────────────────────────────────────────────────

function mmpp_handle_buy_coins(WP_REST_Request $req): WP_REST_Response {
    $user = mmpp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Sesión inválida. Por favor cierra sesión y vuelve a iniciarla.'], 401);
    }

    $amount = (int) ($req->get_param('amount') ?? 0);
    $cost   = (float) ($req->get_param('cost') ?? 0);
    if ($amount <= 0 || $cost <= 0) {
        return new WP_REST_Response(['success' => false, 'message' => 'Cantidad o costo inválido.'], 400);
    }

    $key = 'mmpp_c_' . wp_generate_password(24, false, false);
    update_option($key, [
        'user_id'    => $user->ID,
        'amount'     => $amount,
        'cost'       => number_format($cost, 2, '.', ''),
        'status'     => 'pending',
        'created_at' => time(),
    ], false);

    $site = get_site_url();
    $args = [
        'cmd'           => '_xclick',
        'business'      => MMPP_PAYPAL_BUSINESS,
        'item_name'     => "Pack de {$amount} Monedas – MangaMukai",
        'amount'        => number_format($cost, 2, '.', ''),
        'currency_code' => 'USD',
        'custom'        => $key,
        'notify_url'    => $site . '/wp-json/mangamukai/v1/ipn/coins',
        'return'        => $site . '/pago-exitoso?coins=1&payment_id=' . urlencode($key),
        'cancel_return' => $site . '/',
        'charset'       => 'utf-8',
        'no_shipping'   => 1,
        'no_note'       => 1,
    ];

    return new WP_REST_Response([
        'success'    => true,
        'url'        => 'https://www.paypal.com/cgi-bin/webscr?' . http_build_query($args),
        'payment_id' => $key,
    ], 200);
}

function mmpp_handle_confirm_buy_coins(WP_REST_Request $req): WP_REST_Response {
    $user = mmpp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    $payment_id = sanitize_text_field($req->get_param('payment_id') ?? '');
    if (!$payment_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'payment_id requerido.'], 400);
    }

    $order = get_option($payment_id, null);
    if (!$order || (int) $order['user_id'] !== $user->ID) {
        return new WP_REST_Response(['success' => false, 'message' => 'Pago no encontrado.'], 404);
    }

    return new WP_REST_Response([
        'success'   => true,
        'completed' => ($order['status'] === 'completed'),
        'coins'     => mmpp_get_coins($user->ID),
    ], 200);
}

function mmpp_handle_coin_ipn(): WP_REST_Response {
    @set_time_limit(60);
    $raw = (string) file_get_contents('php://input');
    if (empty($raw)) return new WP_REST_Response('EMPTY', 400);

    $verify = wp_remote_post('https://ipnpb.paypal.com/cgi-bin/webscr', [
        'body'    => 'cmd=_notify-validate&' . $raw,
        'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
        'timeout' => 45,
    ]);
    if (is_wp_error($verify) || trim((string) wp_remote_retrieve_body($verify)) !== 'VERIFIED') {
        return new WP_REST_Response('INVALID', 400);
    }

    parse_str($raw, $ipn);
    if (($ipn['payment_status'] ?? '') !== 'Completed') return new WP_REST_Response('IGNORED', 202);

    $key   = sanitize_text_field($ipn['custom'] ?? '');
    $order = $key ? get_option($key, null) : null;
    if (!$order) return new WP_REST_Response('NOT_FOUND', 404);
    if ($order['status'] === 'completed') return new WP_REST_Response('OK', 200);

    $paid     = number_format((float) ($ipn['mc_gross'] ?? 0), 2, '.', '');
    $expected = number_format((float) ($order['cost'] ?? 0), 2, '.', '');
    $currency = strtoupper((string) ($ipn['mc_currency'] ?? ''));
    $receiver = strtolower(trim((string) ($ipn['receiver_email'] ?? $ipn['business'] ?? '')));
    $business = strtolower(MMPP_PAYPAL_BUSINESS);

    if ($paid !== $expected || $currency !== 'USD' || (!empty($receiver) && $receiver !== $business)) {
        return new WP_REST_Response('MISMATCH', 409);
    }

    mmpp_add_coins((int) $order['user_id'], (int) $order['amount'], 0);
    $order['status'] = 'completed';
    $order['txn_id'] = sanitize_text_field($ipn['txn_id'] ?? '');
    $order['paid_at'] = current_time('mysql');
    update_option($key, $order, false);

    return new WP_REST_Response('OK', 200);
}

// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────────

function mmpp_handle_get_subscription(WP_REST_Request $req): WP_REST_Response {
    $user = mmpp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => true, 'is_premium' => false, 'expiry' => null, 'plan' => null], 200);
    }
    return new WP_REST_Response([
        'success'    => true,
        'is_premium' => mmpp_is_premium($user->ID),
        'expiry'     => get_user_meta($user->ID, 'mm_premium_expiry', true) ?: null,
        'plan'       => get_user_meta($user->ID, 'mm_premium_plan',   true) ?: null,
    ], 200);
}

function mmpp_handle_subscribe(WP_REST_Request $req): WP_REST_Response {
    $user = mmpp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Debes iniciar sesión para suscribirte.'], 401);
    }
    if (mmpp_is_premium($user->ID)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Ya tienes una suscripción activa.'], 400);
    }

    $plan   = $req->get_param('plan') === 'yearly' ? 'yearly' : 'monthly';
    $price  = $plan === 'yearly' ? '49.99' : '4.99';
    $months = $plan === 'yearly' ? 12 : 1;

    $oid = substr(hash('sha256', $user->ID . microtime(true) . wp_salt('auth')), 0, 32);
    update_option('mmpp_sub_' . $oid, [
        'user_id'    => $user->ID,
        'plan'       => $plan,
        'months'     => $months,
        'amount'     => $price,
        'currency'   => 'USD',
        'status'     => 'pending',
        'created_at' => time(),
    ], false);

    $site = get_site_url();
    $args = [
        'cmd'           => '_xclick',
        'business'      => MMPP_PAYPAL_BUSINESS,
        'item_name'     => 'Mukai PRO – Plan ' . ucfirst($plan),
        'amount'        => $price,
        'currency_code' => 'USD',
        'custom'        => 'sub_' . $user->ID . '_' . $oid,
        'notify_url'    => $site . '/wp-json/mangamukai/v1/ipn/subscribe',
        'return'        => $site . '/pago-exitoso?sub=1&order_id=' . $oid,
        'cancel_return' => $site . '/',
        'charset'       => 'utf-8',
        'no_shipping'   => 1,
        'no_note'       => 1,
    ];

    return new WP_REST_Response([
        'success'  => true,
        'url'      => 'https://www.paypal.com/cgi-bin/webscr?' . http_build_query($args),
        'order_id' => $oid,
    ], 200);
}

function mmpp_handle_activate_subscription(WP_REST_Request $req): WP_REST_Response {
    $user = mmpp_auth_user($req);
    $oid  = sanitize_text_field($req->get_param('order_id') ?? '');

    if (!$user) return new WP_REST_Response(['success' => false, 'message' => 'Sin sesión.'], 401);
    if (!$oid)  return new WP_REST_Response(['success' => false, 'message' => 'order_id requerido.'], 400);

    $order = get_option('mmpp_sub_' . $oid, null);
    if (!$order)                               return new WP_REST_Response(['success' => false, 'message' => 'Orden no encontrada.'], 404);
    if ((int) $order['user_id'] !== $user->ID) return new WP_REST_Response(['success' => false, 'message' => 'Orden no pertenece a este usuario.'], 403);

    $is_premium = mmpp_is_premium($user->ID);
    return new WP_REST_Response([
        'success'    => true,
        'is_premium' => $is_premium,
        'status'     => $order['status'],
        'expiry'     => get_user_meta($user->ID, 'mm_premium_expiry', true) ?: null,
        'message'    => $is_premium
            ? 'Suscripción activa.'
            : 'Pago en proceso de validación por PayPal.',
    ], 200);
}

function mmpp_handle_subscribe_ipn(): WP_REST_Response {
    @set_time_limit(60);
    $raw = (string) file_get_contents('php://input');
    if (empty($raw)) return new WP_REST_Response('EMPTY', 400);

    $verify = wp_remote_post('https://ipnpb.paypal.com/cgi-bin/webscr', [
        'body'    => 'cmd=_notify-validate&' . $raw,
        'headers' => ['Content-Type' => 'application/x-www-form-urlencoded'],
        'timeout' => 45,
    ]);
    if (is_wp_error($verify) || trim((string) wp_remote_retrieve_body($verify)) !== 'VERIFIED') {
        return new WP_REST_Response('INVALID', 400);
    }

    parse_str($raw, $ipn);
    if (($ipn['payment_status'] ?? '') !== 'Completed') return new WP_REST_Response('IGNORED', 202);

    $custom = (string) ($ipn['custom'] ?? '');
    if (!preg_match('/^sub_(\d+)_([a-f0-9]{32})$/', $custom, $m)) {
        return new WP_REST_Response('BAD_CUSTOM', 400);
    }
    [, $uid, $oid] = $m;

    $order = get_option('mmpp_sub_' . $oid, null);
    if (!$order || (int) $order['user_id'] !== (int) $uid) return new WP_REST_Response('NOT_FOUND', 404);
    if ($order['status'] === 'activated') return new WP_REST_Response('OK', 200);

    $paid     = number_format((float) ($ipn['mc_gross'] ?? 0), 2, '.', '');
    $expected = number_format((float) ($order['amount'] ?? 0), 2, '.', '');
    $currency = strtoupper((string) ($ipn['mc_currency'] ?? ''));
    $receiver = strtolower(trim((string) ($ipn['receiver_email'] ?? $ipn['business'] ?? '')));
    $business = strtolower(MMPP_PAYPAL_BUSINESS);

    if ($paid !== $expected || $currency !== 'USD' || (!empty($receiver) && $receiver !== $business)) {
        return new WP_REST_Response('MISMATCH', 409);
    }

    mmpp_activate_premium((int) $uid, $order['plan'], (int) $order['months']);
    $order['status'] = 'activated';
    $order['txn_id'] = sanitize_text_field($ipn['txn_id'] ?? '');
    $order['paid_at'] = current_time('mysql');
    update_option('mmpp_sub_' . $oid, $order, false);

    return new WP_REST_Response('OK', 200);
}
