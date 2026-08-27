<?php
/**
 * Plugin Name: MangaMukai Social Auth Bridge
 * Description: Entrega una sesión React después del acceso OAuth de Ultimate Member.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('parse_request', static function () {
    if (!isset($_GET['mm_social_session']) || (string) $_GET['mm_social_session'] !== '1') return;

    nocache_headers();
    header('Content-Type: application/json; charset=' . get_option('blog_charset'));
    header('X-Content-Type-Options: nosniff');

    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
        status_header(405);
        header('Allow: POST');
        echo wp_json_encode(['success' => false, 'message' => 'Método no permitido.']);
        exit;
    }

    if (!is_user_logged_in()) {
        status_header(401);
        echo wp_json_encode(['success' => false, 'message' => 'La sesión social no pudo confirmarse. Inténtalo nuevamente.']);
        exit;
    }

    if (!function_exists('mm_generate_token') || !function_exists('mm_user_data')) {
        status_header(503);
        echo wp_json_encode(['success' => false, 'message' => 'El servicio de acceso no está disponible.']);
        exit;
    }

    $user = wp_get_current_user();
    if (!$user || !$user->exists()) {
        status_header(401);
        echo wp_json_encode(['success' => false, 'message' => 'No se encontró la cuenta vinculada.']);
        exit;
    }

    status_header(200);
    echo wp_json_encode([
        'success' => true,
        'token' => mm_generate_token((int) $user->ID),
        'user' => mm_user_data($user),
    ]);
    exit;
}, 1);
