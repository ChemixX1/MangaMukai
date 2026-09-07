<?php
/**
 * Plugin Name: MangaMukai Legacy Access Fix
 * Description: REST overrides for legacy myCRED purchases, legacy coin balances, and paid chapter access.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    mmfix_register_route('/login', 'POST', 'mmfix_handle_login');
    mmfix_register_route('/register', 'POST', 'mmfix_handle_register');
    mmfix_register_route('/me', 'GET', 'mmfix_handle_me');
    mmfix_register_route('/coins', 'GET', 'mmfix_handle_coins');
    mmfix_register_route('/chapters/unlocked', 'GET', 'mmfix_handle_unlocked_chapters');
    mmfix_register_route('/chapters/buy', 'POST', 'mmfix_handle_buy_chapter');
    mmfix_register_route('/chapters/content', 'GET', 'mmfix_handle_chapter_content');
}, 99);

function mmfix_register_route(string $route, string $methods, string $callback): void
{
    register_rest_route('mangamukai/v1', $route, [
        'methods'             => $methods,
        'callback'            => $callback,
        'permission_callback' => '__return_true',
    ], true);
}

function mmfix_token_from_request(WP_REST_Request $req): string
{
    $header = $req->get_header('Authorization') ?: '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return '';
}

function mmfix_token_ttl(): int
{
    return (int) apply_filters('mmfix_token_ttl', 10 * YEAR_IN_SECONDS);
}

function mmfix_token_secret(): string
{
    return AUTH_KEY . SECURE_AUTH_KEY . LOGGED_IN_KEY . NONCE_KEY;
}

function mmfix_generate_token(int $user_id): string
{
    $issued_at = time();
    $expires_at = $issued_at + mmfix_token_ttl();
    $payload = $user_id . '|' . $issued_at . '|' . $expires_at;
    $sig = hash_hmac('sha256', $payload, mmfix_token_secret());

    return base64_encode($user_id . ':' . $issued_at . ':' . $expires_at . ':' . $sig);
}

function mmfix_get_user_from_token(string $token): ?WP_User
{
    $decoded = base64_decode($token, true);
    if (!$decoded) return null;

    $parts = explode(':', $decoded);

    // Current production token: user_id:hash(valid today or yesterday).
    if (count($parts) === 2) {
        [$user_id, $hash] = $parts;
        $expected = wp_hash((int) $user_id . AUTH_KEY . gmdate('Y-m-d'));
        $expected_prev = wp_hash((int) $user_id . AUTH_KEY . gmdate('Y-m-d', strtotime('-1 day')));
        if (!hash_equals($expected, $hash) && !hash_equals($expected_prev, $hash)) {
            return null;
        }
        $user = get_user_by('id', (int) $user_id);
        return $user ?: null;
    }

    // Forward-compatible token format if the main auth plugin is later extended:
    // user_id:issued_at:expires_at:hmac
    if (count($parts) === 4) {
        [$user_id, $issued_at, $expires_at, $sig] = $parts;
        if (!ctype_digit($user_id) || !ctype_digit($issued_at) || !ctype_digit($expires_at)) {
            return null;
        }
        if ((int) $expires_at < time()) return null;
        $payload = $user_id . '|' . $issued_at . '|' . $expires_at;
        $expected = hash_hmac('sha256', $payload, mmfix_token_secret());
        if (!hash_equals($expected, $sig)) return null;
        $user = get_user_by('id', (int) $user_id);
        return $user ?: null;
    }

    return null;
}

function mmfix_auth_user(WP_REST_Request $req): ?WP_User
{
    $token = mmfix_token_from_request($req);
    return $token ? mmfix_get_user_from_token($token) : null;
}

function mmfix_user_data(WP_User $user): array
{
    // Misma forma que mm_user_data() en mu-plugins/manga-auth-api.php: este plugin
    // sobrescribe /me con override, asi que si aqui devolvemos user_login el navbar
    // pierde el nombre editado en /perfil en el siguiente refresco de sesion.
    $custom_avatar = get_user_meta($user->ID, 'mm_profile_avatar_url', true)
        ?: get_user_meta($user->ID, 'mm_avatar_url', true);
    $is_premium = function_exists('mm_is_user_premium') ? (bool) mm_is_user_premium($user->ID) : false;

    return [
        'id'             => $user->ID,
        'username'       => $user->display_name ?: $user->user_login,
        'email'          => $user->user_email,
        'display_name'   => $user->display_name,
        'avatar'         => $custom_avatar ?: get_avatar_url($user->ID),
        'coins'          => mmfix_get_coins($user->ID),
        'is_premium'     => $is_premium,
        'premium_expiry' => get_user_meta($user->ID, 'mm_premium_expiry', true) ?: null,
    ];
}

function mmfix_registered_point_types(): array
{
    $types = [];
    if (function_exists('mycred_get_types')) {
        $registered = mycred_get_types();
        if (is_array($registered)) {
            $types = array_keys($registered);
        }
    }
    $types[] = 'mycred_default';
    return array_values(array_unique(array_filter($types)));
}

function mmfix_is_balance_meta_key(string $key, array $registered_types): bool
{
    if (!preg_match('/^mycred(_|$)/', $key)) {
        return false;
    }

    if (in_array($key, $registered_types, true)) {
        return true;
    }

    if (in_array($key, ['mycred_rank', 'mycred_default_total'], true)) {
        return false;
    }

    foreach (['_total', '_rank', '_rank_id', '_rank_history'] as $suffix) {
        if (substr($key, -strlen($suffix)) === $suffix) {
            return false;
        }
    }

    return (bool) preg_match('/^mycred_[a-z0-9]+$/i', $key);
}

function mmfix_point_types_for_user(int $user_id): array
{
    $registered = mmfix_registered_point_types();
    $types = $registered;
    $all_meta = get_user_meta($user_id);

    foreach ($all_meta as $key => $values) {
        $value = is_array($values) ? ($values[0] ?? null) : $values;
        if (is_numeric($value) && mmfix_is_balance_meta_key((string) $key, $registered)) {
            $types[] = (string) $key;
        }
    }

    return array_values(array_unique(array_filter($types)));
}

function mmfix_balance_for_type(int $user_id, string $type): float
{
    if (function_exists('mycred_get_users_balance')) {
        try {
            return (float) mycred_get_users_balance($user_id, $type);
        } catch (Throwable $e) {
            // Fall back to user meta below.
        }
    }

    $raw = get_user_meta($user_id, $type, true);
    return is_numeric($raw) ? (float) $raw : 0.0;
}

function mmfix_balance_breakdown(int $user_id): array
{
    $balances = [];
    foreach (mmfix_point_types_for_user($user_id) as $type) {
        $balance = mmfix_balance_for_type($user_id, $type);
        if ($balance != 0.0 || $type === 'mycred_default') {
            $balances[$type] = $balance;
        }
    }

    if (!isset($balances['mycred_default'])) {
        $balances['mycred_default'] = 0.0;
    }

    return $balances;
}

function mmfix_get_coins(int $user_id): float
{
    $total = 0.0;
    foreach (mmfix_balance_breakdown($user_id) as $balance) {
        if ($balance > 0) $total += $balance;
    }
    return round($total, 2);
}

function mmfix_subtract_coins(int $user_id, float $amount, int $chapter_id): bool
{
    $balances = mmfix_balance_breakdown($user_id);
    $total = 0.0;
    foreach ($balances as $balance) {
        if ($balance > 0) $total += $balance;
    }
    if ($total < $amount) return false;

    $registered = mmfix_registered_point_types();
    $ordered = [];
    if (isset($balances['mycred_default'])) {
        $ordered['mycred_default'] = $balances['mycred_default'];
    }
    foreach ($balances as $type => $balance) {
        if ($type !== 'mycred_default') $ordered[$type] = $balance;
    }

    $remaining = $amount;
    foreach ($ordered as $type => $balance) {
        if ($remaining <= 0) break;
        if ($balance <= 0) continue;

        $take = min($balance, $remaining);
        if (function_exists('mycred_subtract') && in_array($type, $registered, true)) {
            mycred_subtract(
                'buy_chapter',
                $user_id,
                $take,
                'Compra capitulo #' . $chapter_id,
                $chapter_id,
                '',
                $type
            );
        } else {
            update_user_meta($user_id, $type, $balance - $take);
        }
        $remaining -= $take;
    }

    return $remaining <= 0.0001;
}

function mmfix_sell_info(int $chapter_id): array
{
    $sell = get_post_meta($chapter_id, 'myCRED_sell_content', true);
    $is_paid = is_array($sell)
        && ($sell['status'] ?? '') === 'enabled'
        && (float) ($sell['price'] ?? 0) > 0;

    $free_at = null;
    if ($is_paid && !empty($sell['expire'])) {
        $days = (int) $sell['expire'];
        $post = get_post($chapter_id);
        if ($days > 0 && $post) {
            $base = $post->post_date_gmt ?: $post->post_date;
            $free_at = strtotime($base) + ($days * DAY_IN_SECONDS);
        }
    }

    if ($free_at && $free_at <= time()) {
        $is_paid = false;
    }

    return [
        'raw'     => $sell,
        'is_paid' => $is_paid,
        'price'   => $is_paid ? (float) ($sell['price'] ?? 0) : 0.0,
        'free_at' => $free_at,
    ];
}

function mmfix_value_contains_user($value, int $user_id): bool
{
    if (is_serialized($value)) {
        $value = maybe_unserialize($value);
    }

    if (is_array($value)) {
        foreach ($value as $key => $item) {
            if ((string) $key === (string) $user_id) return true;
            if (mmfix_value_contains_user($item, $user_id)) return true;
        }
        return false;
    }

    if (is_object($value)) {
        return mmfix_value_contains_user((array) $value, $user_id);
    }

    if (is_numeric($value)) {
        return (int) $value === $user_id;
    }

    if (is_string($value)) {
        $quoted = preg_quote((string) $user_id, '/');
        return (bool) preg_match('/(^|[^0-9])' . $quoted . '([^0-9]|$)/', $value);
    }

    return false;
}

function mmfix_buyer_meta_keys(): array
{
    return [
        'myCRED_sell_content_buyers',
        'mycred_sell_content_buyers',
        '_myCRED_sell_content_buyers',
        '_mycred_sell_content_buyers',
        'mycred_content_buyers',
        '_mycred_content_buyers',
    ];
}

function mmfix_mark_chapter_bought(int $user_id, int $chapter_id): void
{
    $buyers = get_post_meta($chapter_id, 'myCRED_sell_content_buyers', true);
    if (!is_array($buyers)) $buyers = [];

    $found = false;
    foreach ($buyers as $buyer) {
        if ((int) $buyer === $user_id) {
            $found = true;
            break;
        }
    }

    if (!$found) {
        $buyers[] = $user_id;
        update_post_meta($chapter_id, 'myCRED_sell_content_buyers', array_values($buyers));
        delete_transient('mmfix_unlocked_' . $user_id);
    }
}

function mmfix_chapter_is_valid_paid_post(int $chapter_id): bool
{
    $post = get_post($chapter_id);
    if (!$post || $post->post_type !== 'post' || $post->post_status !== 'publish') {
        return false;
    }

    $info = mmfix_sell_info($chapter_id);
    return !empty($info['raw']) || $info['is_paid'];
}

function mmfix_user_bought_chapter_from_log(int $user_id, int $chapter_id): bool
{
    global $wpdb;
    $table = $wpdb->prefix . 'mycred_log';
    $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
    if ($exists !== $table) return false;

    $count = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*)
         FROM {$table}
         WHERE user_id = %d
           AND ref_id = %d
           AND (
             ref IN ('buy_chapter', 'buy_content', 'sell_content', 'mycred_sell_content')
             OR ref LIKE %s
             OR ref LIKE %s
           )",
        $user_id,
        $chapter_id,
        '%content%',
        '%chapter%'
    ));

    return $count > 0;
}

function mmfix_user_bought_chapter(int $user_id, int $chapter_id): bool
{
    foreach (mmfix_buyer_meta_keys() as $key) {
        $buyers = get_post_meta($chapter_id, $key, true);
        if (mmfix_value_contains_user($buyers, $user_id)) {
            mmfix_mark_chapter_bought($user_id, $chapter_id);
            return true;
        }
    }

    foreach (['mycred_bought_content', 'mycred_user_paid_for_content', 'mycred_sell_content_has_user_paid'] as $fn) {
        if (!function_exists($fn)) continue;
        try {
            if ((bool) call_user_func($fn, $chapter_id, $user_id)) {
                mmfix_mark_chapter_bought($user_id, $chapter_id);
                return true;
            }
        } catch (Throwable $e) {
            // Try the other argument order below.
        }
        try {
            if ((bool) call_user_func($fn, $user_id, $chapter_id)) {
                mmfix_mark_chapter_bought($user_id, $chapter_id);
                return true;
            }
        } catch (Throwable $e) {
            // Keep checking other sources.
        }
    }

    if (mmfix_user_bought_chapter_from_log($user_id, $chapter_id)) {
        mmfix_mark_chapter_bought($user_id, $chapter_id);
        return true;
    }

    return false;
}

function mmfix_unlocked_from_buyer_meta(int $user_id): array
{
    global $wpdb;
    $keys = mmfix_buyer_meta_keys();
    $placeholders = implode(',', array_fill(0, count($keys), '%s'));
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT post_id, meta_value
         FROM {$wpdb->postmeta}
         WHERE meta_key IN ({$placeholders})",
        ...$keys
    ), ARRAY_A);

    $ids = [];
    foreach ($rows as $row) {
        $post_id = (int) $row['post_id'];
        if ($post_id > 0 && mmfix_value_contains_user($row['meta_value'], $user_id)) {
            $ids[] = $post_id;
        }
    }
    return $ids;
}

function mmfix_unlocked_from_log(int $user_id): array
{
    global $wpdb;
    $table = $wpdb->prefix . 'mycred_log';
    $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
    if ($exists !== $table) return [];

    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT DISTINCT ref_id
         FROM {$table}
         WHERE user_id = %d
           AND ref_id > 0
           AND (
             ref IN ('buy_chapter', 'buy_content', 'sell_content', 'mycred_sell_content')
             OR ref LIKE %s
             OR ref LIKE %s
           )",
        $user_id,
        '%content%',
        '%chapter%'
    ));

    return array_map('intval', $ids ?: []);
}

function mmfix_get_unlocked_chapter_ids(int $user_id): array
{
    $cache_key = 'mmfix_unlocked_' . $user_id;
    $cached = get_transient($cache_key);
    if (is_array($cached)) return $cached;

    $ids = array_merge(
        mmfix_unlocked_from_buyer_meta($user_id),
        mmfix_unlocked_from_log($user_id)
    );

    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), function ($id) {
        return $id > 0 && mmfix_chapter_is_valid_paid_post($id);
    })));

    foreach ($ids as $chapter_id) {
        mmfix_mark_chapter_bought($user_id, $chapter_id);
    }

    set_transient($cache_key, $ids, 5 * MINUTE_IN_SECONDS);
    return $ids;
}

function mmfix_handle_login(WP_REST_Request $req): WP_REST_Response
{
    $email = sanitize_email($req->get_param('email') ?? '');
    $password = (string) ($req->get_param('password') ?? '');

    if ($email === '' || $password === '') {
        return new WP_REST_Response(['success' => false, 'message' => 'Correo y contrasena requeridos.'], 400);
    }

    $user = get_user_by('email', $email);
    if (!$user || !wp_check_password($password, $user->user_pass, $user->ID)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Credenciales incorrectas.'], 401);
    }

    wp_set_auth_cookie($user->ID, true, is_ssl());

    return new WP_REST_Response([
        'success' => true,
        'token' => mmfix_generate_token($user->ID),
        'user' => mmfix_user_data($user),
    ], 200);
}

function mmfix_handle_register(WP_REST_Request $req): WP_REST_Response
{
    $email = sanitize_email($req->get_param('email') ?? '');
    $password = (string) ($req->get_param('password') ?? '');
    $username = sanitize_user($req->get_param('username') ?? '');

    if ($email === '' || $password === '') {
        return new WP_REST_Response(['success' => false, 'message' => 'Correo y contrasena requeridos.'], 400);
    }
    if (email_exists($email)) {
        return new WP_REST_Response(['success' => false, 'message' => 'El correo ya esta en uso.'], 409);
    }

    if ($username === '') {
        $username = strtolower((string) strstr($email, '@', true)) . wp_rand(100, 999);
    }
    if (username_exists($username)) {
        $username .= wp_rand(10, 99);
    }

    $user_id = wp_create_user($username, $password, $email);
    if (is_wp_error($user_id)) {
        return new WP_REST_Response(['success' => false, 'message' => $user_id->get_error_message()], 500);
    }

    $user = new WP_User($user_id);
    $user->set_role('subscriber');
    wp_set_auth_cookie($user_id, true, is_ssl());

    return new WP_REST_Response([
        'success' => true,
        'token' => mmfix_generate_token($user_id),
        'user' => mmfix_user_data($user),
    ], 201);
}

function mmfix_handle_me(WP_REST_Request $req): WP_REST_Response
{
    $user = mmfix_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token invalido o expirado.'], 401);
    }

    return new WP_REST_Response([
        'success' => true,
        'token' => mmfix_generate_token($user->ID),
        'user' => mmfix_user_data($user),
    ], 200);
}

function mmfix_handle_coins(WP_REST_Request $req): WP_REST_Response
{
    $user = mmfix_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.'], 401);
    }

    return new WP_REST_Response([
        'success' => true,
        'coins' => mmfix_get_coins($user->ID),
        'balances' => mmfix_balance_breakdown($user->ID),
    ], 200);
}

function mmfix_handle_unlocked_chapters(WP_REST_Request $req): WP_REST_Response
{
    $user = mmfix_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'No autenticado.', 'unlocked' => []], 401);
    }

    $ids = mmfix_get_unlocked_chapter_ids($user->ID);
    return new WP_REST_Response([
        'success' => true,
        'unlocked' => array_map('strval', $ids),
    ], 200);
}

function mmfix_handle_buy_chapter(WP_REST_Request $req): WP_REST_Response
{
    $user = mmfix_auth_user($req);
    $chapter_id = (int) ($req->get_param('chapter_id') ?? 0);

    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Debes iniciar sesion.'], 401);
    }
    if (!$chapter_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'Capitulo invalido.'], 400);
    }

    $info = mmfix_sell_info($chapter_id);
    if (!$info['is_paid']) {
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Capitulo gratuito',
            'coins' => mmfix_get_coins($user->ID),
        ], 200);
    }

    if (mmfix_user_bought_chapter($user->ID, $chapter_id)) {
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Ya adquirido',
            'coins' => mmfix_get_coins($user->ID),
        ], 200);
    }

    $price = (float) $info['price'];
    $balance = mmfix_get_coins($user->ID);
    if ($balance < $price) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Saldo insuficiente',
            'coins' => $balance,
        ], 402);
    }

    if (!mmfix_subtract_coins($user->ID, $price, $chapter_id)) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'No se pudo descontar el saldo.',
            'coins' => mmfix_get_coins($user->ID),
        ], 500);
    }

    mmfix_mark_chapter_bought($user->ID, $chapter_id);

    return new WP_REST_Response([
        'success' => true,
        'message' => 'Capitulo desbloqueado',
        'coins' => mmfix_get_coins($user->ID),
    ], 200);
}

function mmfix_extract_chapter_images(WP_Post $post): array
{
    $attachments = get_posts([
        'post_type'      => 'attachment',
        'post_mime_type' => 'image',
        'post_parent'    => $post->ID,
        'posts_per_page' => -1,
        'orderby'        => 'menu_order date',
        'order'          => 'ASC',
    ]);

    $image_urls = [];
    foreach ($attachments as $att) {
        $src = wp_get_attachment_url($att->ID);
        if ($src) $image_urls[] = $src;
    }

    if (empty($image_urls) && !empty($post->post_content)) {
        preg_match_all('/src=["\']([^"\']+\.(jpe?g|png|webp|gif)(\?[^"\']*)?)["\']/i', $post->post_content, $matches);
        foreach ($matches[1] as $url) {
            if (filter_var($url, FILTER_VALIDATE_URL)) $image_urls[] = $url;
        }

        if (empty($image_urls)) {
            $GLOBALS['post'] = $post;
            setup_postdata($post);
            $html = do_shortcode($post->post_content);
            wp_reset_postdata();
            preg_match_all('/src=["\']([^"\']+)["\']/i', $html, $matches2);
            foreach ($matches2[1] as $url) {
                if (filter_var($url, FILTER_VALIDATE_URL) && preg_match('/\.(jpe?g|png|webp|gif)(\?|$)/i', $url)) {
                    $image_urls[] = $url;
                }
            }
        }
    }

    return array_values(array_unique($image_urls));
}

function mmfix_handle_chapter_content(WP_REST_Request $req): WP_REST_Response
{
    $chapter_id = (int) ($req->get_param('id') ?? 0);
    if (!$chapter_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'ID invalido'], 400);
    }

    $post = get_post($chapter_id);
    if (!$post || $post->post_type !== 'post' || $post->post_status !== 'publish') {
        return new WP_REST_Response(['success' => false, 'message' => 'Capitulo no encontrado'], 404);
    }

    $info = mmfix_sell_info($chapter_id);
    if ($info['is_paid']) {
        $user = mmfix_auth_user($req);
        if (!$user) {
            return new WP_REST_Response([
                'success' => false,
                'locked' => true,
                'message' => 'Inicia sesion para leer este capitulo.',
            ], 401);
        }

        if (!mmfix_user_bought_chapter($user->ID, $chapter_id)) {
            return new WP_REST_Response([
                'success' => false,
                'locked' => true,
                'price' => $info['price'],
                'message' => 'Capitulo de pago. Adquierelo para leerlo.',
            ], 402);
        }
    }

    return new WP_REST_Response([
        'success' => true,
        'images' => mmfix_extract_chapter_images($post),
        'is_paid' => $info['is_paid'],
    ], 200);
}
