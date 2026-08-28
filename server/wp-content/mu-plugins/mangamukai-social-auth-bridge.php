<?php
/**
 * Plugin Name: MangaMukai Social Auth Bridge
 * Description: Entrega una sesión React después del acceso OAuth de Ultimate Member.
 * Version: 1.2.0
 */

if (!defined('ABSPATH')) exit;

function mm_social_auth_local_origin(string $value): string {
    $parts = wp_parse_url($value);
    if (!is_array($parts)) return '';

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));
    $port = isset($parts['port']) ? (int) $parts['port'] : 0;
    if ($scheme !== 'http' || !in_array($host, ['localhost', '127.0.0.1'], true) || !in_array($port, [5173, 4173], true)) {
        return '';
    }

    return "http://{$host}:{$port}";
}

function mm_social_auth_local_target(string $value): string {
    $target = wp_sanitize_redirect($value);
    $parts = wp_parse_url($target);
    if (!is_array($parts)) return '';

    $origin = mm_social_auth_local_origin(sprintf(
        '%s://%s:%d',
        (string) ($parts['scheme'] ?? ''),
        (string) ($parts['host'] ?? ''),
        (int) ($parts['port'] ?? 0)
    ));
    $path = '/' . ltrim((string) ($parts['path'] ?? ''), '/');
    if ($origin === '' || rtrim($path, '/') !== '/auth/login') return '';

    return $target;
}

function mm_social_auth_return_url(string $value): string {
    $candidate = wp_sanitize_redirect($value);
    $parts = wp_parse_url($candidate);
    $site = wp_parse_url(home_url('/'));
    if (!is_array($parts) || !is_array($site)) return '';

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));
    $path = '/' . ltrim((string) ($parts['path'] ?? ''), '/');
    if ($scheme !== 'https' || $host !== strtolower((string) ($site['host'] ?? '')) || $path !== '/') return '';

    $query = [];
    parse_str((string) ($parts['query'] ?? ''), $query);
    $provider = sanitize_key((string) ($query['provider'] ?? ''));
    $target = mm_social_auth_local_target((string) ($query['target'] ?? ''));
    if ((string) ($query['mm_social_return'] ?? '') !== '1' || !in_array($provider, ['google', 'discord'], true) || $target === '') {
        return '';
    }

    return add_query_arg([
        'mm_social_return' => '1',
        'provider' => $provider,
        'target' => $target,
    ], home_url('/'));
}

function mm_social_auth_store_return(string $return_url): void {
    setcookie('mm_social_auth_return', rawurlencode($return_url), [
        'expires' => time() + 10 * MINUTE_IN_SECONDS,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE['mm_social_auth_return'] = rawurlencode($return_url);
}

function mm_social_auth_saved_return(): string {
    if (empty($_COOKIE['mm_social_auth_return'])) return '';
    return mm_social_auth_return_url(rawurldecode(wp_unslash((string) $_COOKIE['mm_social_auth_return'])));
}

function mm_social_auth_clear_return(): void {
    setcookie('mm_social_auth_return', '', [
        'expires' => time() - HOUR_IN_SECONDS,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    unset($_COOKIE['mm_social_auth_return']);
}

function mm_social_auth_apply_local_cors(): bool {
    $origin = mm_social_auth_local_origin((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') return false;

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin', false);
    return true;
}

function mm_social_auth_json(int $status, array $payload): void {
    status_header($status);
    nocache_headers();
    header('Content-Type: application/json; charset=' . get_option('blog_charset'));
    header('X-Content-Type-Options: nosniff');
    echo wp_json_encode($payload);
    exit;
}

add_action('parse_request', static function () {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $request_path = '/' . trim((string) wp_parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH), '/') . '/';
    if ($method === 'GET' && in_array($request_path, ['/login/', '/register/'], true)) {
        $provider = sanitize_key((string) ($_GET['provider'] ?? ''));
        $return_url = mm_social_auth_return_url((string) ($_GET['redirect_to'] ?? ''));
        if (in_array($provider, ['google', 'discord'], true) && $return_url !== '') {
            mm_social_auth_store_return($return_url);
        }
    }

    $is_return = isset($_GET['mm_social_return']) && (string) $_GET['mm_social_return'] === '1';
    $is_exchange = isset($_GET['mm_social_session']) && (string) $_GET['mm_social_session'] === '1';
    if (!$is_return && !$is_exchange) return;

    if ($is_return) {
        if ($method !== 'GET') mm_social_auth_json(405, ['success' => false, 'message' => 'Método no permitido.']);
        if (!is_user_logged_in()) mm_social_auth_json(401, ['success' => false, 'message' => 'La sesión social no pudo confirmarse.']);

        $provider = sanitize_key((string) ($_GET['provider'] ?? ''));
        $target = mm_social_auth_local_target((string) ($_GET['target'] ?? ''));
        if (!in_array($provider, ['google', 'discord'], true) || $target === '') {
            mm_social_auth_json(400, ['success' => false, 'message' => 'Retorno local no válido.']);
        }

        try {
            $code = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        } catch (Throwable $error) {
            mm_social_auth_json(503, ['success' => false, 'message' => 'No se pudo preparar el retorno local.']);
        }

        set_transient('mm_social_code_' . hash('sha256', $code), [
            'user_id' => get_current_user_id(),
            'provider' => $provider,
        ], 2 * MINUTE_IN_SECONDS);

        $redirect = add_query_arg([
            'social' => $provider,
            'social_code' => $code,
        ], $target);
        nocache_headers();
        wp_redirect($redirect, 302, 'MangaMukai Social Auth');
        exit;
    }

    $cors_allowed = mm_social_auth_apply_local_cors();
    if ($method === 'OPTIONS') {
        if (!$cors_allowed) mm_social_auth_json(403, ['success' => false, 'message' => 'Origen no permitido.']);
        status_header(204);
        exit;
    }
    if ($method !== 'POST') {
        header('Allow: POST, OPTIONS');
        mm_social_auth_json(405, ['success' => false, 'message' => 'Método no permitido.']);
    }
    if (!function_exists('mm_generate_token') || !function_exists('mm_user_data')) {
        mm_social_auth_json(503, ['success' => false, 'message' => 'El servicio de acceso no está disponible.']);
    }

    $user = null;
    $code = sanitize_text_field((string) ($_POST['code'] ?? ''));
    if ($code !== '') {
        if (!$cors_allowed || !preg_match('/^[A-Za-z0-9_-]{40,64}$/', $code)) {
            mm_social_auth_json(400, ['success' => false, 'message' => 'Código de acceso no válido.']);
        }
        $transient_key = 'mm_social_code_' . hash('sha256', $code);
        $exchange = get_transient($transient_key);
        delete_transient($transient_key);
        if (is_array($exchange) && !empty($exchange['user_id'])) {
            $user = get_userdata((int) $exchange['user_id']);
        }
    } elseif (is_user_logged_in()) {
        $user = wp_get_current_user();
    }

    if (!($user instanceof WP_User) || !$user->exists()) {
        mm_social_auth_json(401, ['success' => false, 'message' => 'La sesión social no pudo confirmarse. Inténtalo nuevamente.']);
    }

    mm_social_auth_json(200, [
        'success' => true,
        'token' => mm_generate_token((int) $user->ID),
        'user' => mm_user_data($user),
    ]);
}, 1);

add_action('um_on_login_before_redirect', static function () {
    $return_url = mm_social_auth_saved_return();
    if ($return_url === '') return;

    mm_social_auth_clear_return();
    wp_redirect($return_url, 302, 'MangaMukai Social Auth');
    exit;
}, 1);
