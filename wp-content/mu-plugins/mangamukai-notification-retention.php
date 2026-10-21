<?php
/**
 * Plugin Name: MangaMukai Notification Retention
 * Description: Conserva los últimos 15 días de notificaciones.
 */
if (!defined('ABSPATH')) exit;

add_action('init', function () {
    if (!wp_next_scheduled('mm_notifications_retention_cleanup')) {
        wp_schedule_event(time(), 'daily', 'mm_notifications_retention_cleanup');
    }
});

add_action('mm_notifications_retention_cleanup', function () {
    global $wpdb;
    $table = $wpdb->prefix . 'mm_notifications';
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table))) !== $table) return;
    $cutoff = gmdate('Y-m-d H:i:s', time() - 15 * DAY_IN_SECONDS);

    for ($batch = 0; $batch < 20; $batch++) {
        $deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM `{$table}` WHERE created_at < %s ORDER BY created_at ASC LIMIT 1000",
            $cutoff
        ));
        if ($deleted === false || $deleted < 1000) break;
    }
});
