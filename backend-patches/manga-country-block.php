<?php
/**
 * Plugin Name: MangaMukai Country Block
 * Description: Bloquea acceso desde China (CN), Corea del Norte (KP), Corea del Sur (KR) y Japón (JP).
 * Version: 1.0
 */

if (!defined('ABSPATH')) exit;

add_action('init', function () {
    // No bloquear rutas de admin, API o cron
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, '/wp-admin') !== false) return;
    if (strpos($uri, '/wp-json') !== false) return;
    if (strpos($uri, '/wp-cron') !== false) return;
    if (defined('DOING_CRON') && DOING_CRON) return;

    $blocked = ['CN', 'KP', 'KR', 'JP'];
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
       ?? $_SERVER['HTTP_X_FORWARDED_FOR']
       ?? $_SERVER['REMOTE_ADDR']
       ?? '';

    // Tomar solo la primera IP si hay varias (X-Forwarded-For puede tener múltiples)
    $ip = trim(explode(',', $ip)[0]);
    if (!filter_var($ip, FILTER_VALIDATE_IP)) return;

    // Verificar cache en transient (24 horas por IP)
    $cache_key = 'mm_geo_' . md5($ip);
    $country = get_transient($cache_key);

    if ($country === false) {
        $response = wp_remote_get("http://ip-api.com/json/{$ip}?fields=countryCode", [
            'timeout'   => 3,
            'sslverify' => false,
        ]);
        if (is_wp_error($response)) return;
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $country = $body['countryCode'] ?? 'XX';
        set_transient($cache_key, $country, DAY_IN_SECONDS);
    }

    if (in_array(strtoupper($country), $blocked, true)) {
        status_header(403);
        nocache_headers();
        wp_die(
            '<h1 style="font-family:sans-serif;text-align:center;margin-top:20vh">403 — Acceso Restringido</h1>',
            'Acceso Restringido',
            ['response' => 403]
        );
    }
}, 1);
