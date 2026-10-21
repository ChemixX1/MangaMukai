<?php
/** Plugin Name: MangaMukai Notification Delete */
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', static function () {
    register_rest_route('mangamukai/v1', '/social/notifications/delete', [
        'methods' => 'POST',
        'permission_callback' => static function ($request) {
            return function_exists('mm_social_auth_permission')
                ? mm_social_auth_permission($request)
                : new WP_Error('mm_unavailable', 'Servicio no disponible.', ['status' => 503]);
        },
        'callback' => static function ($request) {
            if (!function_exists('mm_interactions_viewer') || !function_exists('mm_social_table')) {
                return new WP_Error('mm_unavailable', 'Servicio no disponible.', ['status' => 503]);
            }
            $user_id = mm_interactions_viewer($request);
            if (!$user_id) return new WP_Error('mm_auth_required', 'Inicia sesión.', ['status' => 401]);
            $through_id = absint($request['through_id']);
            if (!$through_id) return new WP_Error('mm_invalid_id', 'Notificación inválida.', ['status' => 400]);
            global $wpdb;
            // Preserve notifications arriving after the list the reader chose to clear.
            $deleted = $wpdb->query($wpdb->prepare(
                'DELETE FROM ' . mm_social_table('notifications') . ' WHERE user_id=%d AND id<=%d',
                $user_id, $through_id
            ));
            if ($deleted === false) return new WP_Error('mm_delete_failed', 'No se pudieron borrar las notificaciones.', ['status' => 500]);
            return rest_ensure_response(['success' => true, 'deleted' => $deleted]);
        },
    ]);
});
