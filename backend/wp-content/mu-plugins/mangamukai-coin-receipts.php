<?php
/**
 * Plugin Name: MangaMukai Coin Receipts
 * Description: Private Yape and Plin receipts for manual payment review.
 */
if (!defined('ABSPATH')) exit;

add_action('init', function () {
    register_post_type('mm_coin_receipt', [
        'labels' => ['name' => 'Comprobantes de recarga', 'singular_name' => 'Comprobante'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'menu_icon' => 'dashicons-money-alt',
        'supports' => ['title'],
        'capabilities' => [
            'edit_post' => 'manage_options', 'read_post' => 'manage_options',
            'delete_post' => 'manage_options', 'edit_posts' => 'manage_options',
            'edit_others_posts' => 'manage_options', 'publish_posts' => 'manage_options',
            'read_private_posts' => 'manage_options', 'delete_posts' => 'manage_options',
            'create_posts' => 'do_not_allow',
        ],
        'map_meta_cap' => false,
    ]);
});

// Delegate identity verification to the installed MangaMukai auth endpoint.
// No user ID or email supplied by the client is accepted as identity.
function mm_coin_receipt_permission($request) {
    $auth = new WP_REST_Request('GET', '/mangamukai/v1/me');
    $auth->set_header('Authorization', $request->get_header('Authorization'));
    $auth->set_param('_token', $request->get_param('_token'));
    $response = rest_do_request($auth);
    $data = $response->get_data();
    $user_id = absint($data['user']['id'] ?? 0);
    if ($response->get_status() !== 200 || empty($data['success']) || !$user_id || !get_userdata($user_id)) {
        return new WP_Error('receipt_auth', 'Inicia sesión para enviar tu comprobante.', ['status' => 401]);
    }
    $request->set_param('_receipt_user_id', $user_id);
    return true;
}

add_action('rest_api_init', function () {
    register_rest_route('mangamukai/v1', '/coin-receipts', [
        'methods' => 'POST',
        'permission_callback' => 'mm_coin_receipt_permission',
        'callback' => 'mm_coin_receipt_create',
    ]);
});

function mm_coin_receipt_create($request) {
    $packs = [
        'c50' => [50, 5], 'c1000' => [1000, 10], 'c1500' => [1500, 15],
        'c2500' => [2500, 25], 'c5000' => [5000, 50], 'promo10000' => [10000, 80],
    ];
    $pack = sanitize_key($request->get_param('pack'));
    $method = sanitize_key($request->get_param('method'));
    $user_id = absint($request->get_param('_receipt_user_id'));
    if (!isset($packs[$pack]) || !in_array($method, ['yape', 'plin'], true)) {
        return new WP_Error('receipt_selection', 'Selecciona un paquete y una billetera válidos.', ['status' => 400]);
    }
    $files = $request->get_file_params();
    $file = $files['receipt'] ?? [];
    if (empty($file['tmp_name']) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        return new WP_Error('receipt_file', 'Selecciona una imagen válida.', ['status' => 400]);
    }
    $size = filesize($file['tmp_name']);
    $image = @getimagesize($file['tmp_name']);
    if (!$size || $size > 5 * MB_IN_BYTES || !$image || !in_array($image['mime'], ['image/jpeg', 'image/png', 'image/webp'], true) || $image[0] * $image[1] > 24000000) {
        return new WP_Error('receipt_image', 'Usa una imagen JPG, PNG o WebP de hasta 5 MB y 24 megapíxeles.', ['status' => 400]);
    }
    $hash = hash_file('sha256', $file['tmp_name']);
    $duplicate = get_posts([
        'post_type' => 'mm_coin_receipt', 'post_status' => 'private',
        'author' => $user_id, 'meta_key' => '_receipt_hash', 'meta_value' => $hash,
        'fields' => 'ids', 'posts_per_page' => 1,
    ]);
    if ($duplicate) {
        return new WP_Error('receipt_duplicate', 'Este comprobante ya fue enviado. Espera la revisión de tu pago.', ['status' => 409]);
    }
    if (get_transient('mm_receipt_rate_' . $user_id)) {
        return new WP_Error('receipt_rate', 'Espera un minuto antes de enviar otro comprobante.', ['status' => 429]);
    }
    $bytes = file_get_contents($file['tmp_name']);
    if ($bytes === false) {
        return new WP_Error('receipt_read', 'No se pudo leer la imagen. Inténtalo nuevamente.', ['status' => 500]);
    }
    $id = wp_insert_post([
        'post_type' => 'mm_coin_receipt', 'post_status' => 'private', 'post_author' => $user_id,
        'post_title' => sprintf('%s · %d monedas · Usuario #%d · %s', ucfirst($method), $packs[$pack][0], $user_id, current_time('mysql')),
    ], true);
    if (is_wp_error($id) || !$id) {
        return new WP_Error('receipt_save', 'No se pudo guardar el comprobante. Inténtalo nuevamente.', ['status' => 500]);
    }
    // Store the image privately in post metadata, never in public uploads/media.
    $saved = add_post_meta($id, '_receipt_data', [
        'method' => $method, 'coins' => $packs[$pack][0], 'price_usd' => $packs[$pack][1],
        'mime' => $image['mime'], 'image' => base64_encode($bytes),
        'filename' => sanitize_file_name($file['name']),
    ], true);
    if (!$saved || !add_post_meta($id, '_receipt_hash', $hash, true)) {
        wp_delete_post($id, true);
        return new WP_Error('receipt_save', 'No se pudo guardar la imagen. Inténtalo nuevamente.', ['status' => 500]);
    }
    set_transient('mm_receipt_rate_' . $user_id, 1, MINUTE_IN_SECONDS);
    // Receipt submission does not credit coins or assert that a payment is valid.
    return new WP_REST_Response(['success' => true, 'receipt_id' => $id], 201);
}

add_action('add_meta_boxes_mm_coin_receipt', function () {
    add_meta_box('mm_receipt_details', 'Comprobante para revisión', function ($post) {
        if (!current_user_can('manage_options')) return;
        $receipt = get_post_meta($post->ID, '_receipt_data', true);
        if (!is_array($receipt)) return;
        $user = get_userdata($post->post_author);
        echo '<p><strong>Cuenta:</strong> ' . esc_html($user ? $user->user_login . ' · ' . $user->user_email : $post->post_author) . '</p>';
        echo '<p>' . esc_html(ucfirst($receipt['method']) . ' · ' . $receipt['coins'] . ' monedas · USD ' . $receipt['price_usd']) . '</p>';
        echo '<p>Verifica el pago antes de acreditar las monedas. Esta solicitud no modifica el saldo.</p>';
        echo '<img alt="Comprobante" style="max-width:100%;max-height:900px;object-fit:contain" src="data:' . esc_attr($receipt['mime']) . ';base64,' . esc_attr($receipt['image']) . '" />';
    }, 'mm_coin_receipt', 'normal', 'high');
});
