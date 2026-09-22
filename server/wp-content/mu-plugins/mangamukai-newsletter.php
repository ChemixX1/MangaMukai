<?php
/**
 * Plugin Name: MangaMukai Newsletter
 * Description: Altas al boletín desde el botón UNIRME del footer: tabla propia y endpoint.
 * Version: 1.0.0
 *
 * Tabla wp_mm_newsletter_subscribers: una fila por correo (único) con origen,
 * IP, usuario (si había sesión) y fechas de alta y de baja.
 *
 *   POST /mangamukai/v1/newsletter  { email, source? }
 *     -> { success: true, status: 'added' | 'exists' }
 *     -> 400 { success: false, error: 'invalid_email' } · 429 { error: 'too_many_requests' }
 *
 * Sin servicio de envíos todavía: la lista queda en la tabla (phpMyAdmin) para
 * exportarla o conectarla a Brevo/Mailchimp más adelante.
 */

if (!defined('ABSPATH')) exit;

function mm_newsletter_table(): string {
    global $wpdb;
    return $wpdb->prefix . 'mm_newsletter_subscribers';
}

/** Crea la tabla la primera vez (dbDelta es idempotente). */
function mm_newsletter_install(): void {
    if (get_option('mm_newsletter_table_version') === '1') return;
    global $wpdb;
    $table = mm_newsletter_table();
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE {$table} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        email varchar(190) NOT NULL,
        source varchar(40) NOT NULL DEFAULT 'footer',
        ip varchar(64) NOT NULL DEFAULT '',
        user_id bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        unsubscribed_at datetime DEFAULT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY email (email)
    ) {$charset};");
    update_option('mm_newsletter_table_version', '1', false);
}
add_action('init', 'mm_newsletter_install', 30);

function mm_newsletter_client_ip(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ip = trim(explode(',', (string) $ip)[0]);
    return substr($ip, 0, 64);
}

add_action('rest_api_init', function () {
    register_rest_route('mangamukai/v1', '/newsletter', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => 'mm_newsletter_subscribe',
    ]);
});

function mm_newsletter_subscribe(WP_REST_Request $request): WP_REST_Response {
    $email = strtolower(trim((string) $request->get_param('email')));
    if ($email === '' || strlen($email) > 190 || !is_email($email)) {
        return new WP_REST_Response(['success' => false, 'error' => 'invalid_email'], 400);
    }

    // Freno por IP: cinco altas cada diez minutos bastan para una persona.
    $ip = mm_newsletter_client_ip();
    $limit_key = 'mm_nl_' . md5($ip);
    $hits = (int) get_transient($limit_key);
    if ($hits >= 5) {
        return new WP_REST_Response(['success' => false, 'error' => 'too_many_requests'], 429);
    }
    set_transient($limit_key, $hits + 1, 10 * MINUTE_IN_SECONDS);

    $source = sanitize_key((string) $request->get_param('source'));
    if ($source === '') $source = 'footer';
    $user_id = 0;
    if (function_exists('mm_get_request_user')) {
        $user = mm_get_request_user($request);
        if ($user instanceof WP_User) $user_id = (int) $user->ID;
    }

    global $wpdb;
    $table = mm_newsletter_table();
    $now = current_time('mysql');
    $existing = $wpdb->get_row($wpdb->prepare("SELECT id, unsubscribed_at FROM {$table} WHERE email = %s", $email));

    if ($existing) {
        if ($existing->unsubscribed_at === null) {
            return new WP_REST_Response(['success' => true, 'status' => 'exists']);
        }
        // Se había dado de baja: vuelve a la lista.
        $wpdb->update($table, ['unsubscribed_at' => null, 'created_at' => $now, 'ip' => $ip, 'user_id' => $user_id], ['id' => (int) $existing->id]);
        return new WP_REST_Response(['success' => true, 'status' => 'added']);
    }

    $inserted = $wpdb->insert($table, [
        'email'      => $email,
        'source'     => substr($source, 0, 40),
        'ip'         => $ip,
        'user_id'    => $user_id,
        'created_at' => $now,
    ]);
    if ($inserted === false) {
        return new WP_REST_Response(['success' => false, 'error' => 'storage_failed'], 500);
    }
    return new WP_REST_Response(['success' => true, 'status' => 'added']);
}
