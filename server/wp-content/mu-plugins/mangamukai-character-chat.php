<?php
/**
 * Plugin Name: MangaMukai Character Chat
 * Description: Registro de los mensajes del Character Chat y cuota de mensajes gratuitos.
 * Version: 1.0.0
 *
 * Tabla wp_mm_character_messages: una fila por mensaje (del usuario o del
 * personaje) con el usuario o la huella del invitado, el personaje, el modo
 * (demo / ia) y la fecha en UTC.
 *
 * Regla: cada usuario dispone de MM_CHARACTER_FREE_MESSAGES (10) mensajes
 * gratuitos en total; solo cuentan los mensajes con role = user. Al agotarse,
 * el servidor rechaza el siguiente con 402 { error: 'quota_exhausted' }.
 *
 *   GET  /mangamukai/v1/character-chat/quota
 *     -> { success, limit, used, remaining }
 *   POST /mangamukai/v1/character-chat/messages  { character_id, role?, content, mode? }
 *     -> 201 { success, id, limit, used, remaining }
 *     -> 402 { success: false, error: 'quota_exhausted', limit, used, remaining: 0 }
 *     -> 400 { error: 'invalid_character' | 'invalid_role' | 'invalid_content' } · 429 { error: 'too_many_requests' }
 *   GET  /mangamukai/v1/character-chat/messages?character_id=alex&limit=50
 *     -> { success, messages: [{ id, role, content, mode, created_at }] }  (solo los del propio usuario)
 *
 * Con sesión (Bearer) se identifica por user_id; sin sesión, por una huella de
 * la IP (guest_key, sha1 con sal), así la cuota también aplica a invitados.
 */

if (!defined('ABSPATH')) exit;

if (!defined('MM_CHARACTER_FREE_MESSAGES')) define('MM_CHARACTER_FREE_MESSAGES', 10);

function mm_character_table(): string {
    global $wpdb;
    return $wpdb->prefix . 'mm_character_messages';
}

/** Crea la tabla la primera vez (dbDelta es idempotente). */
function mm_character_install(): void {
    if (get_option('mm_character_table_version') === '1') return;
    global $wpdb;
    $table = mm_character_table();
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE {$table} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL DEFAULT 0,
        guest_key char(40) NOT NULL DEFAULT '',
        character_id varchar(40) NOT NULL,
        role varchar(10) NOT NULL DEFAULT 'user',
        content text NOT NULL,
        mode varchar(10) NOT NULL DEFAULT 'demo',
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY user_character (user_id,character_id,id),
        KEY user_quota (user_id,role),
        KEY guest_quota (guest_key,role)
    ) {$charset};");
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) update_option('mm_character_table_version', '1', false);
}
add_action('init', 'mm_character_install', 30);

function mm_character_client_ip(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return substr(trim(explode(',', (string) $ip)[0]), 0, 64);
}

/** Usuario de la sesión (Bearer) o huella del invitado: la IP no se guarda en claro. */
function mm_character_identity(WP_REST_Request $request): array {
    if (function_exists('mm_get_request_user')) {
        $user = mm_get_request_user($request);
        if ($user instanceof WP_User && $user->ID) return ['user_id' => (int) $user->ID, 'guest_key' => ''];
    }
    return ['user_id' => 0, 'guest_key' => sha1('mm-character-guest|' . mm_character_client_ip() . '|' . wp_salt('nonce'))];
}

function mm_character_used(array $identity): int {
    global $wpdb;
    $table = mm_character_table();
    if ($identity['user_id']) {
        return (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE user_id = %d AND role = 'user'", $identity['user_id']));
    }
    return (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE user_id = 0 AND guest_key = %s AND role = 'user'", $identity['guest_key']));
}

function mm_character_quota(array $identity): array {
    $used = mm_character_used($identity);
    return ['limit' => MM_CHARACTER_FREE_MESSAGES, 'used' => $used, 'remaining' => max(0, MM_CHARACTER_FREE_MESSAGES - $used)];
}

function mm_character_get_quota(WP_REST_Request $request): WP_REST_Response {
    return new WP_REST_Response(['success' => true] + mm_character_quota(mm_character_identity($request)));
}

function mm_character_post_message(WP_REST_Request $request): WP_REST_Response {
    $identity = mm_character_identity($request);

    // Freno: treinta mensajes por minuto son de sobra para una persona.
    $limit_key = 'mm_cc_' . md5($identity['user_id'] ? 'u' . $identity['user_id'] : $identity['guest_key']);
    $hits = (int) get_transient($limit_key);
    if ($hits >= 30) return new WP_REST_Response(['success' => false, 'error' => 'too_many_requests'], 429);
    set_transient($limit_key, $hits + 1, MINUTE_IN_SECONDS);

    $character = sanitize_key((string) $request->get_param('character_id'));
    if ($character === '' || strlen($character) > 40) return new WP_REST_Response(['success' => false, 'error' => 'invalid_character'], 400);

    $role = (string) $request->get_param('role');
    if ($role === '') $role = 'user';
    if (!in_array($role, ['user', 'assistant'], true)) return new WP_REST_Response(['success' => false, 'error' => 'invalid_role'], 400);

    $content = trim(sanitize_textarea_field((string) $request->get_param('content')));
    $length = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
    if ($content === '' || $length > ($role === 'user' ? 1500 : 5000)) return new WP_REST_Response(['success' => false, 'error' => 'invalid_content'], 400);

    $mode = sanitize_key((string) $request->get_param('mode'));
    if (!in_array($mode, ['demo', 'ai'], true)) $mode = 'demo';

    // La cuota solo la consumen los mensajes del usuario; las respuestas del personaje se registran sin límite.
    if ($role === 'user') {
        $quota = mm_character_quota($identity);
        if ($quota['remaining'] <= 0) return new WP_REST_Response(['success' => false, 'error' => 'quota_exhausted'] + $quota, 402);
    }

    global $wpdb;
    $inserted = $wpdb->insert(mm_character_table(), [
        'user_id'      => $identity['user_id'],
        'guest_key'    => $identity['guest_key'],
        'character_id' => $character,
        'role'         => $role,
        'content'      => $content,
        'mode'         => $mode,
        'created_at'   => current_time('mysql', true),
    ]);
    if ($inserted === false) return new WP_REST_Response(['success' => false, 'error' => 'storage_failed'], 500);

    return new WP_REST_Response(['success' => true, 'id' => (int) $wpdb->insert_id] + mm_character_quota($identity), 201);
}

function mm_character_get_messages(WP_REST_Request $request): WP_REST_Response {
    $identity = mm_character_identity($request);
    $character = sanitize_key((string) $request->get_param('character_id'));
    if ($character === '' || strlen($character) > 40) return new WP_REST_Response(['success' => false, 'error' => 'invalid_character'], 400);
    $limit = min(200, max(1, absint($request->get_param('limit')) ?: 50));

    global $wpdb;
    $table = mm_character_table();
    $where = $identity['user_id']
        ? $wpdb->prepare('user_id = %d', $identity['user_id'])
        : $wpdb->prepare('user_id = 0 AND guest_key = %s', $identity['guest_key']);
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT id, role, content, mode, created_at FROM {$table} WHERE {$where} AND character_id = %s ORDER BY id DESC LIMIT %d",
        $character,
        $limit
    ), ARRAY_A);

    $messages = [];
    foreach (array_reverse($rows ?: []) as $row) {
        $messages[] = [
            'id'         => (int) $row['id'],
            'role'       => $row['role'],
            'content'    => $row['content'],
            'mode'       => $row['mode'],
            'created_at' => str_replace(' ', 'T', $row['created_at']) . 'Z',
        ];
    }
    return new WP_REST_Response(['success' => true, 'messages' => $messages]);
}

add_action('rest_api_init', function () {
    register_rest_route('mangamukai/v1', '/character-chat/quota', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => 'mm_character_get_quota',
    ]);
    register_rest_route('mangamukai/v1', '/character-chat/messages', [
        [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => 'mm_character_get_messages',
        ],
        [
            'methods'             => 'POST',
            'permission_callback' => '__return_true',
            'callback'            => 'mm_character_post_message',
        ],
    ]);
});
