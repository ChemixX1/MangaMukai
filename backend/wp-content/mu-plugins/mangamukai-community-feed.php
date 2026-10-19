<?php
/** Plugin Name: MangaMukai Community Feed
 * Connects the community feed to existing social posts and notifications.
 */
if (!defined('ABSPATH')) exit;

function mm_community_feed_ready() {
    return function_exists('mm_social_table') && function_exists('mm_social_post_payload') && function_exists('mm_interactions_post') && function_exists('mm_interactions_viewer');
}

function mm_community_feed_post($row) {
    $post = mm_social_post_payload($row);
    $post['community_manga'] = get_option('mm_community_manga_' . (int) $row->id, null);
    $post['saved'] = (bool) get_user_meta(get_current_user_id(), 'mm_community_saved_' . (int) $row->id, true);
    return $post;
}

function mm_community_feed_comment($comment) {
    global $wpdb;
    $key = 'mm_community_comment_like_' . (int) $comment['id'];
    $comment['image'] = get_option('mm_community_comment_image_' . (int) $comment['id'], '');
    $comment['likes'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key=%s AND meta_value='1'", $key));
    $comment['liked'] = (bool) get_user_meta(get_current_user_id(), $key, true);
    return $comment;
}

add_action('rest_api_init', static function () {
    register_rest_route('mangamukai/v1', '/social/community', [
        'methods' => 'GET', 'permission_callback' => '__return_true',
        'callback' => static function ($request) {
            if (!mm_community_feed_ready()) return new WP_Error('mm_community_unavailable', 'La comunidad no está disponible.', ['status' => 503]);
            global $wpdb;
            if (function_exists('mm_interactions_viewer')) mm_interactions_viewer($request);
            $id = absint($request['id']);
            if ($id) {
                $row = mm_interactions_post($id);
                if (!$row) return new WP_Error('mm_post_missing', 'Publicación no encontrada.', ['status' => 404]);
                return rest_ensure_response(['success' => true, 'posts' => [mm_community_feed_post($row)], 'has_more' => false]);
            }
            $before = absint($request['before']) ?: PHP_INT_MAX;
            $rows = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . mm_social_table('profile_posts') . " WHERE status='published' AND visibility='public' AND id<%d ORDER BY id DESC LIMIT 51", $before));
            return rest_ensure_response(['success' => true, 'posts' => array_map('mm_community_feed_post', array_slice($rows, 0, 50)), 'has_more' => count($rows) > 50]);
        },
    ]);
    register_rest_route('mangamukai/v1', '/social/community/state', [
        'methods' => 'POST',
        'permission_callback' => static function ($request) {
            return function_exists('mm_social_auth_permission') ? mm_social_auth_permission($request) : new WP_Error('mm_community_unavailable', 'La comunidad no está disponible.', ['status' => 503]);
        },
        'callback' => static function ($request) {
            if (!mm_community_feed_ready()) return new WP_Error('mm_community_unavailable', 'La comunidad no está disponible.', ['status' => 503]);
            global $wpdb;
            $current = mm_interactions_viewer($request);
            if (!$current) return new WP_Error('mm_auth_required', 'Inicia sesión.', ['status' => 401]);
            $post = mm_interactions_post(absint($request['post_id']));
            if (!$post) return new WP_Error('mm_post_missing', 'Publicación no encontrada.', ['status' => 404]);
            $comment_id = absint($request['comment_id']);
            $comment = null;
            if ($comment_id) {
                $comment = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . mm_social_table('post_comments') . ' WHERE id=%d AND post_id=%d', $comment_id, $post->id));
                if (!$comment) return new WP_Error('mm_comment_missing', 'Comentario no encontrado.', ['status' => 404]);
            }
            $key = $comment ? 'mm_community_comment_like_' . $comment_id : 'mm_community_saved_' . (int) $post->id;
            $active = rest_sanitize_boolean($request['active']);
            if ($active) update_user_meta($current, $key, 1);
            else delete_user_meta($current, $key);
            if ((bool) get_user_meta($current, $key, true) !== $active) return new WP_Error('mm_write_failed', 'No se pudo guardar el cambio.', ['status' => 500]);
            if ($comment && function_exists('mm_social_create_notification')) {
                $dedupe = 'community_comment_like:' . $comment_id . ':' . $current;
                if ($active) mm_social_create_notification((int) $comment->user_id, $current, 'post_comment_like', $post->id, ['post_id' => (int) $post->id, 'comment_id' => $comment_id], $dedupe);
                else $wpdb->delete(mm_social_table('notifications'), ['dedupe_key' => $dedupe], ['%s']);
            }
            return rest_ensure_response(['success' => true, 'post' => mm_community_feed_post($post)]);
        },
    ]);
});

// Enrich the existing API responses without replacing its authentication or writes.
add_filter('rest_post_dispatch', static function ($response, $server, $request) {
    if (is_wp_error($response) || $response->get_status() >= 400 || !mm_community_feed_ready()) return $response;
    $route = $request->get_route();
    if (strpos($route, '/mangamukai/v1/social/') !== 0) return $response;
    $data = $response->get_data();
    if (!is_array($data) || empty($data['success'])) return $response;
    $current = get_current_user_id();
    if ($request->get_method() === 'POST' && $current) {
        if ($route === '/mangamukai/v1/social/posts' && !empty($data['post']['id']) && is_array($request['community_manga'])) {
            $tag = $request['community_manga'];
            update_option('mm_community_manga_' . (int) $data['post']['id'], [
                'id' => (string) absint($tag['id'] ?? 0), 'title' => sanitize_text_field($tag['title'] ?? ''),
                'cover' => esc_url_raw($tag['cover'] ?? ''), 'showCover' => !empty($tag['showCover']),
                'chapterId' => absint($tag['chapterId'] ?? 0), 'chapterLabel' => sanitize_text_field($tag['chapterLabel'] ?? ''),
            ], false);
        }
        if (preg_match('#/social/posts/\d+/comments$#', $route) && !empty($data['comment']['id']) && absint($request['image_id'])) {
            $attachment = get_post(absint($request['image_id']));
            if ($attachment && $attachment->post_type === 'attachment' && (int) $attachment->post_author === $current && wp_attachment_is_image($attachment->ID)) {
                update_option('mm_community_comment_image_' . (int) $data['comment']['id'], wp_get_attachment_url($attachment->ID), false);
            }
        }
        if ($route === '/mangamukai/v1/social/messages' && !empty($data['message']['id']) && function_exists('mm_social_create_notification')) {
            $message = $data['message'];
            mm_social_create_notification((int) $message['recipient_id'], $current, 'message', $message['id'], [], 'message:' . (int) $message['id']);
        }
        if ($route === '/mangamukai/v1/social/messages/read') {
            global $wpdb;
            $wpdb->query($wpdb->prepare('UPDATE ' . mm_social_table('notifications') . " SET read_at=%s WHERE user_id=%d AND actor_id=%d AND type='message' AND read_at IS NULL", current_time('mysql', true), $current, absint($request['user_id'])));
        }
    }
    if (!empty($data['post']['id'])) {
        $row = mm_interactions_post($data['post']['id']);
        if ($row) $data['post'] = mm_community_feed_post($row);
    }
    if (isset($data['comments']) && is_array($data['comments']) && preg_match('#/social/posts/\d+/comments$#', $route)) $data['comments'] = array_map('mm_community_feed_comment', $data['comments']);
    if (!empty($data['comment']['id'])) $data['comment'] = mm_community_feed_comment($data['comment']);
    $response->set_data($data);
    $response->header('Cache-Control', 'no-store, private');
    return $response;
}, 30, 3);
