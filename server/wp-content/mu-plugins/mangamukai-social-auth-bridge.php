<?php
/**
 * Plugin Name: MangaMukai Social Auth Bridge
 * Description: Entrega una sesión React después del acceso OAuth de Ultimate Member y da de alta las cuentas nuevas de Google/Discord.
 * Version: 1.4.0
 */

if (!defined('ABSPATH')) exit;

function mm_social_auth_is_provider(string $provider): bool {
    return in_array($provider, ['google', 'discord'], true);
}

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
    if ($scheme !== 'https' || $host !== strtolower((string) ($site['host'] ?? ''))
        || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])
        || (isset($parts['port']) && (int) $parts['port'] !== 443)) return '';

    $query = [];
    parse_str((string) ($parts['query'] ?? ''), $query);
    // Production must return to React only AFTER Ultimate Member creates its cookie.
    if (rtrim($path, '/') === '/auth/login') {
        $provider = sanitize_key((string) ($query['social'] ?? ''));
        return mm_social_auth_is_provider($provider)
            ? add_query_arg('social', $provider, home_url('/auth/login', 'https')) : '';
    }
    if ($path !== '/') return '';
    $provider = sanitize_key((string) ($query['provider'] ?? ''));
    $target = mm_social_auth_local_target((string) ($query['target'] ?? ''));
    if ((string) ($query['mm_social_return'] ?? '') !== '1' || !mm_social_auth_is_provider($provider) || $target === '') {
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

/**
 * Página de acceso de React a la que vuelve el usuario: producción, o el destino
 * local del flujo de desarrollo (mm_social_return) si es lo que guarda la cookie.
 */
function mm_social_auth_react_auth_url(string $saved_return): string {
    $query = [];
    parse_str((string) wp_parse_url($saved_return, PHP_URL_QUERY), $query);
    if ((string) ($query['mm_social_return'] ?? '') === '1') {
        $target = mm_social_auth_local_target((string) ($query['target'] ?? ''));
        if ($target !== '') return remove_query_arg(['social', 'social_code'], $target);
    }

    return home_url('/auth/login', 'https');
}

/**
 * Corta el flujo con un aviso legible en React en lugar de la página de error de
 * WordPress (el tema de WordPress no forma parte de la experiencia del sitio).
 */
function mm_social_auth_fail(string $provider, string $code): void {
    $auth_url = mm_social_auth_react_auth_url(mm_social_auth_saved_return());
    mm_social_auth_clear_return();
    $code = sanitize_key($code);
    nocache_headers();
    wp_redirect(add_query_arg([
        'social_error' => $code !== '' ? $code : 'provider',
        'social_provider' => $provider,
    ], $auth_url), 302, 'MangaMukai Social Auth');
    exit;
}

/**
 * Inicia la sesión de WordPress (si Ultimate Member no lo hizo ya) y vuelve al
 * destino React guardado, que canjeará la cookie por su token.
 */
function mm_social_auth_finish_login(int $user_id, string $return_url): void {
    if (get_current_user_id() !== $user_id) {
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true, is_ssl());
        $user = get_userdata($user_id);
        if ($user instanceof WP_User) do_action('wp_login', $user->user_login, $user);
    }
    mm_social_auth_clear_return();
    nocache_headers();
    wp_redirect($return_url, 302, 'MangaMukai Social Auth');
    exit;
}

/**
 * Correo verificado del perfil OAuth. Hybridauth deja emailVerified vacío cuando el
 * proveedor no lo verificó; sin esa garantía cualquiera podría apropiarse de la
 * cuenta asociada a ese correo.
 */
function mm_social_auth_verified_email($profile): string {
    if (!is_object($profile)) return '';
    $email = sanitize_email((string) ($profile->email ?? ''));
    $verified = sanitize_email((string) ($profile->emailVerified ?? ''));
    if ($email === '' || !is_email($email) || strcasecmp($email, $verified) !== 0) return '';

    return $email;
}

function mm_social_auth_unique_username(string $email, string $display_name): string {
    $base = 'lector';
    foreach ([(string) strstr($email, '@', true), remove_accents($display_name)] as $candidate) {
        $candidate = (string) preg_replace('/[^a-z0-9._-]+/', '', strtolower(sanitize_user($candidate, true)));
        if (strlen($candidate) >= 3) {
            $base = substr($candidate, 0, 48);
            break;
        }
    }

    $username = $base;
    for ($attempt = 0; $attempt < 25 && username_exists($username); $attempt++) {
        $username = $base . wp_rand(100, 99999);
    }

    return $username;
}

/**
 * Vincula la identidad del proveedor con las mismas claves que usa UM Social Login,
 * para que UM la reconozca en los próximos accesos sin volver a preguntar.
 */
function mm_social_auth_link_provider(int $user_id, string $provider, object $profile, bool $sync_profile = true): void {
    $identifier = sanitize_text_field((string) ($profile->identifier ?? ''));
    if ($user_id <= 0 || $identifier === '') return;

    update_user_meta($user_id, "_uid_{$provider}", $identifier);
    update_user_meta($user_id, "_um_sso_{$provider}_date_connected", gmdate('Y-m-d H:i:s'));

    if ($sync_profile) {
        $photo = esc_url_raw((string) ($profile->photoURL ?? ''), ['https']);
        update_user_meta($user_id, "{$provider}_handle", sanitize_text_field((string) ($profile->displayName ?? '')));
        update_user_meta($user_id, "{$provider}_link", esc_url_raw((string) ($profile->profileURL ?? '')));
        if ($photo !== '') {
            update_user_meta($user_id, "{$provider}_photo_url", $photo);
            update_user_meta($user_id, 'synced_profile_photo', $photo);
            update_user_meta($user_id, '_um_social_login_avatar_provider', $provider);
        }
    }

    do_action('um_social_login_after_connect', $provider, $user_id);
    do_action("um_social_login_after_{$provider}_connect", $user_id);
}

/**
 * Alta de una cuenta nueva con los datos que compartió el proveedor: mismo rol y
 * mismo estado aprobado que el registro por correo de la API REST (/register).
 */
function mm_social_auth_create_user(string $provider, object $profile, string $email): int {
    $display_name = sanitize_text_field((string) ($profile->displayName ?? ''));
    if ($display_name === '') $display_name = (string) strstr($email, '@', true);

    $user_id = wp_insert_user([
        'user_login'   => mm_social_auth_unique_username($email, $display_name),
        'user_pass'    => wp_generate_password(32, true, true),
        'user_email'   => $email,
        'display_name' => $display_name,
        'nickname'     => $display_name,
        'first_name'   => sanitize_text_field((string) ($profile->firstName ?? '')),
        'last_name'    => sanitize_text_field((string) ($profile->lastName ?? '')),
        'role'         => 'subscriber',
    ]);
    if (is_wp_error($user_id)) return 0;
    $user_id = (int) $user_id;

    update_user_meta($user_id, 'account_status', 'approved');
    update_user_meta($user_id, 'mm_registered_via', $provider);
    $photo = esc_url_raw((string) ($profile->photoURL ?? ''), ['https']);
    if ($photo !== '') update_user_meta($user_id, 'mm_avatar_url', $photo);
    mm_social_auth_link_provider($user_id, $provider, $profile);

    return $user_id;
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
        if (mm_social_auth_is_provider($provider) && $return_url !== '') {
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
        if (!mm_social_auth_is_provider($provider) || $target === '') {
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

// Cuenta ya vinculada (o con el mismo correo): UM la inicia y avisa aquí antes de
// aplicar su propia redirección.
add_action('um_on_login_before_redirect', static function ($user_id) {
    $return_url = mm_social_auth_saved_return();
    if ($return_url === '') return;

    mm_social_auth_finish_login((int) $user_id, $return_url);
}, 1, 1);

// En la página de login, UM Social Login solo inicia sesión si la identidad ya está
// vinculada o existe una cuenta con ese correo; con una cuenta de Google/Discord
// nueva termina en "um_sso_not_linked" y el usuario vuelve a React sin sesión.
// Para el flujo iniciado desde React creamos la cuenta con los datos del proveedor
// y la iniciamos: entrar y registrarse son la misma acción.
add_action('um_social_do_login_error', static function ($provider, $user_profile, $return_url) {
    $provider = sanitize_key((string) $provider);
    if (!mm_social_auth_is_provider($provider) || !isset($_REQUEST['return_provider']) || is_user_logged_in()) return;
    $saved_return = mm_social_auth_saved_return();
    if ($saved_return === '') return; // Acceso que no empezó en React: UM muestra su propio aviso.

    // UM reutiliza este hook cuando la cuenta existe pero no está aprobada.
    $query = [];
    parse_str((string) wp_parse_url((string) $return_url, PHP_URL_QUERY), $query);
    $reason = sanitize_key((string) ($query['err'] ?? ''));
    if ($reason !== '' && $reason !== 'um_sso_not_linked') mm_social_auth_fail($provider, $reason);

    $email = mm_social_auth_verified_email($user_profile);
    if ($email === '') mm_social_auth_fail($provider, 'no_email');

    $user_id = (int) email_exists($email);
    if ($user_id > 0) {
        $status = (string) get_user_meta($user_id, 'account_status', true);
        if ($status !== '' && $status !== 'approved') mm_social_auth_fail($provider, $status);
        mm_social_auth_link_provider($user_id, $provider, $user_profile, false);
    } else {
        $user_id = mm_social_auth_create_user($provider, $user_profile, $email);
        if ($user_id <= 0) mm_social_auth_fail($provider, 'register_failed');
    }

    mm_social_auth_finish_login($user_id, $saved_return);
}, 1, 3);

// Tras el callback del proveedor, UM responde una página HTML que salta con
// JavaScript a /login/?return_provider=... . Una redirección HTTP es más rápida y
// funciona igual sin JavaScript.
add_action('um_social_do_oauth_window_process', static function ($provider) {
    $provider = sanitize_key((string) $provider);
    if (!mm_social_auth_is_provider($provider) || mm_social_auth_saved_return() === '') return;

    nocache_headers();
    wp_safe_redirect(add_query_arg('return_provider', $provider, home_url('/login/', 'https')), 302, 'MangaMukai Social Auth');
    exit;
}, 1, 1);

// Si el usuario cancela en Google/Discord, volver a React con un aviso.
add_action('um_social_oauth_window_process_error', static function ($provider) {
    $provider = sanitize_key((string) $provider);
    if (!mm_social_auth_is_provider($provider) || mm_social_auth_saved_return() === '') return;

    mm_social_auth_fail($provider, 'user_denied');
}, 1, 1);

// UM procesa el retorno OAuth en template_redirect (prioridad 1) y termina la
// petición en todos sus caminos válidos. Si llegamos aquí sin sesión, algo falló
// (sesión OAuth caducada, claves mal configuradas): no dejar al usuario en la
// página de login de WordPress.
add_action('template_redirect', static function () {
    $provider = sanitize_key((string) ($_GET['return_provider'] ?? ($_GET['provider'] ?? '')));
    if (!mm_social_auth_is_provider($provider) || is_user_logged_in() || mm_social_auth_saved_return() === '') return;

    mm_social_auth_fail($provider, (string) ($_GET['err'] ?? 'provider'));
}, 2);

// The OAuth provider return is an intermediate WordPress step, NOT the React
// callback: UM still has to validate/link the account and create the WP session.
add_filter('um_social_login_return_url', static function ($url, $provider) {
    if (mm_social_auth_saved_return() === '' || !mm_social_auth_is_provider((string) $provider)) return $url;
    return add_query_arg('return_provider', $provider, home_url('/login/', 'https'));
}, 100, 2);
