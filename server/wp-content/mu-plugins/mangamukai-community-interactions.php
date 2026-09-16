<?php
/**
 * Plugin Name: MangaMukai Community Interactions
 * Description: Reacciones, comentarios y compartidos de perfiles; sincronización de avatar y comentarios por capítulo.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) exit;

function mm_interactions_viewer($request) {
    $user = function_exists('mm_get_request_user') ? mm_get_request_user($request) : null;
    if (!$user && function_exists('mm_comments_get_user')) $user = mm_comments_get_user($request);
    if ($user instanceof WP_User && $user->exists()) wp_set_current_user($user->ID);
    return get_current_user_id();
}

add_action('init', static function () {
    if (get_option('mm_interactions_schema') === '1.0.0') return;
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    $reactions = mm_social_table('post_reactions');
    $comments = mm_social_table('post_comments');
    dbDelta("CREATE TABLE {$reactions} (
        post_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        reaction varchar(12) NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (post_id,user_id),
        KEY user_id (user_id)
    ) {$charset};");
    dbDelta("CREATE TABLE {$comments} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        post_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        content text NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY post_id (post_id,id),
        KEY user_id (user_id)
    ) {$charset};");
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $comments)) === $comments
        && $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $reactions)) === $reactions) {
        update_option('mm_interactions_schema', '1.0.0', false);
    }
}, 6);

function mm_interactions_post($id) {
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . mm_social_table('profile_posts') . " WHERE id=%d AND status='published' AND visibility='public'", absint($id)));
}

function mm_interactions_post_data($row, $include_shared) {
    global $wpdb;
    $counts = array_fill_keys(['like', 'love', 'haha', 'wow', 'sad', 'angry'], 0);
    foreach ($wpdb->get_results($wpdb->prepare('SELECT reaction,COUNT(*) total FROM ' . mm_social_table('post_reactions') . ' WHERE post_id=%d GROUP BY reaction', $row->id)) as $item) {
        if (isset($counts[$item->reaction])) $counts[$item->reaction] = (int) $item->total;
    }
    $original = $include_shared && !empty($row->shared_post_id) ? mm_interactions_post($row->shared_post_id) : null;
    return [
        'reactions' => $counts,
        'my_reaction' => get_current_user_id() ? (string) $wpdb->get_var($wpdb->prepare('SELECT reaction FROM ' . mm_social_table('post_reactions') . ' WHERE post_id=%d AND user_id=%d', $row->id, get_current_user_id())) : '',
        'comment_count' => (int) $wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM ' . mm_social_table('post_comments') . ' WHERE post_id=%d', $row->id)),
        'share_count' => (int) $wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM ' . mm_social_table('profile_posts') . " WHERE shared_post_id=%d AND status='published'", $row->id)),
        'shared_post_id' => !empty($row->shared_post_id) ? (int) $row->shared_post_id : null,
        'shared_post' => $original ? mm_social_post_payload($original, false) : null,
    ];
}

function mm_interactions_comment_payload($row) {
    return ['id' => (int) $row->id, 'post_id' => (int) $row->post_id, 'content' => (string) $row->content,
        'created_at' => str_replace(' ', 'T', $row->created_at) . 'Z', 'author' => mm_social_public_user($row->user_id)];
}

function mm_interactions_posts($request) {
    global $wpdb;
    mm_interactions_viewer($request);
    $post = mm_interactions_post($request['id']);
    if (!$post) return new WP_Error('mm_post_missing', 'Publicación no disponible.', ['status' => 404]);
    $action = (string) $request['action'];
    $current = get_current_user_id();
    if ($request->get_method() !== 'POST') {
        if ($action !== 'comments') return rest_ensure_response(['success' => true, 'post' => mm_social_post_payload($post)]);
        $before = absint($request['before']) ?: PHP_INT_MAX;
        $rows = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . mm_social_table('post_comments') . ' WHERE post_id=%d AND id<%d ORDER BY id DESC LIMIT 31', $post->id, $before));
        $has_more = count($rows) > 30;
        return rest_ensure_response(['success' => true, 'comments' => array_map('mm_interactions_comment_payload', array_reverse(array_slice($rows, 0, 30))), 'has_more' => $has_more]);
    }
    if (!$current) return new WP_Error('mm_unauthorized', 'Inicia sesión para participar.', ['status' => 401]);
    if ($action === 'reaction') {
        $reaction = sanitize_key((string) $request['reaction']);
        if (!in_array($reaction, ['', 'like', 'love', 'haha', 'wow', 'sad', 'angry'], true)) return new WP_Error('mm_reaction_invalid', 'Reacción no válida.', ['status' => 400]);
        $table = mm_social_table('post_reactions');
        $ok = $reaction === '' ? $wpdb->delete($table, ['post_id' => $post->id, 'user_id' => $current], ['%d', '%d'])
            : $wpdb->replace($table, ['post_id' => $post->id, 'user_id' => $current, 'reaction' => $reaction, 'updated_at' => current_time('mysql', true)], ['%d', '%d', '%s', '%s']);
        // Aviso al dueño de la publicación (se retira si se quita la reacción).
        if (function_exists('mm_social_create_notification')) {
            $dedupe = 'post_reaction:' . (int) $post->id . ':' . $current;
            if ($reaction === '') $wpdb->delete(mm_social_table('notifications'), ['dedupe_key' => $dedupe], ['%s']);
            else mm_social_create_notification((int) $post->user_id, $current, 'post_reaction', $post->id, ['post_id' => (int) $post->id, 'reaction' => $reaction], $dedupe);
        }
        if ($ok === false) return new WP_Error('mm_write_failed', 'No se pudo guardar la reacción.', ['status' => 500]);
    } elseif ($action === 'comments') {
        $content = trim(sanitize_textarea_field((string) $request['content']));
        $length = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
        if ($content === '' || $length > 2000) return new WP_Error('mm_comment_invalid', 'Escribe entre 1 y 2000 caracteres.', ['status' => 400]);
        $table = mm_social_table('post_comments');
        if (!$wpdb->insert($table, ['post_id' => $post->id, 'user_id' => $current, 'content' => $content, 'created_at' => current_time('mysql', true)], ['%d', '%d', '%s', '%s'])) return new WP_Error('mm_write_failed', 'No se pudo guardar el comentario.', ['status' => 500]);
        $comment = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $wpdb->insert_id));
        if (function_exists('mm_social_create_notification')) {
            mm_social_create_notification((int) $post->user_id, $current, 'post_comment', $post->id, ['post_id' => (int) $post->id, 'comment_id' => (int) $comment->id, 'excerpt' => mb_substr($content, 0, 80)], 'post_comment:' . (int) $comment->id);
        }
        return new WP_REST_Response(['success' => true, 'comment' => mm_interactions_comment_payload($comment), 'post' => mm_social_post_payload($post)], 201);
    } elseif ($action === 'share') {
        if (!empty($post->shared_post_id)) $post = mm_interactions_post($post->shared_post_id);
        if (!$post) return new WP_Error('mm_post_missing', 'La publicación original ya no está disponible.', ['status' => 404]);
        $table = mm_social_table('profile_posts');
        $now = current_time('mysql', true);
        $ok = $wpdb->query($wpdb->prepare("INSERT INTO {$table} (user_id,content,shared_post_id,visibility,status,created_at,updated_at)
            VALUES (%d,'',%d,'public','published',%s,%s) ON DUPLICATE KEY UPDATE status='published',updated_at=VALUES(updated_at)", $current, $post->id, $now, $now));
        if ($ok === false) return new WP_Error('mm_write_failed', 'No se pudo compartir la publicación.', ['status' => 500]);
        $shared = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE user_id=%d AND shared_post_id=%d", $current, $post->id));
        if (function_exists('mm_social_create_notification')) {
            mm_social_create_notification((int) $post->user_id, $current, 'post_share', $post->id, ['post_id' => (int) $post->id], 'post_share:' . (int) $post->id . ':' . $current);
        }
        return rest_ensure_response(['success' => true, 'post' => mm_social_post_payload($post), 'shared' => mm_social_post_payload($shared)]);
    } else return new WP_Error('mm_action_invalid', 'Acción no válida.', ['status' => 400]);
    return rest_ensure_response(['success' => true, 'post' => mm_social_post_payload($post)]);
}

add_action('rest_api_init', static function () {
    register_rest_route('mangamukai/v1', '/social/posts/(?P<id>\d+)/(?P<action>comments|reaction|share)', [
        ['methods' => 'GET', 'callback' => 'mm_interactions_posts', 'permission_callback' => '__return_true'],
        ['methods' => 'POST', 'callback' => 'mm_interactions_posts', 'permission_callback' => 'mm_social_auth_permission'],
    ]);
    register_rest_route('mangamukai/v1', '/chapters/comment-counts', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => static function ($request) {
        global $wpdb;
        $ids = array_slice(array_values(array_unique(array_filter(array_map('absint', explode(',', (string) $request['ids']))))), 0, 100);
        if (!$ids) return rest_ensure_response(['success' => true, 'counts' => (object) []]);
        $counts = array_fill_keys($ids, 0);
        $placeholders = implode(',', array_fill(0, count($ids), '%d'));
        $rows = $wpdb->get_results($wpdb->prepare("SELECT c.comment_post_ID,COUNT(*) total FROM {$wpdb->comments} c INNER JOIN {$wpdb->posts} p ON p.ID=c.comment_post_ID WHERE c.comment_post_ID IN ({$placeholders}) AND c.comment_approved='1' AND c.comment_type IN ('','comment') AND p.post_status='publish' GROUP BY c.comment_post_ID", ...$ids));
        foreach ($rows as $row) $counts[(int) $row->comment_post_ID] = (int) $row->total;
        return rest_ensure_response(['success' => true, 'counts' => (object) $counts]);
    }]);
});

// Existing token endpoints do not all bind their authenticated user to WP.
add_filter('rest_request_before_callbacks', static function ($response, $handler, $request) {
    if (strpos($request->get_route(), '/mangamukai/v1/') !== 0) return $response;
    mm_interactions_viewer($request);
    if ($request->get_route() !== '/mangamukai/v1/comments') return $response;
    if (function_exists('mmwp_comments_table')) return $response;
    $chapter = absint($request['chapter_id']);
    $manga = absint($request['manga_id']);
    $target = $chapter ?: $manga;
    if ($target && get_post_status($target) !== 'publish') return new WP_Error('mm_comment_target', 'Contenido no disponible.', ['status' => 404]);
    if ($request->get_method() === 'POST') {
        if (!$target || get_post_status($target) !== 'publish') return new WP_Error('mm_comment_target', 'Contenido no disponible.', ['status' => 404]);
        if ($chapter && $manga && (int) get_post_meta($chapter, 'ero_seri', true) !== $manga) return new WP_Error('mm_comment_target', 'El capítulo no pertenece al manga.', ['status' => 400]);
        $parent = absint($request['parent_id']);
        $parent_row = $parent ? get_comment($parent) : null;
        if ($parent && (!$parent_row || (int) $parent_row->comment_post_ID !== $target || $parent_row->comment_approved !== '1')) return new WP_Error('mm_comment_parent', 'La respuesta pertenece a otra conversación.', ['status' => 400]);
        if (strlen((string) $request['content']) > 12000) return new WP_Error('mm_comment_length', 'Comentario demasiado largo.', ['status' => 400]);
    }
    return $response;
}, 9, 3);

// New React clients request an explicitly global discussion, without chapter replies.
add_filter('rest_post_dispatch', static function ($response, $server, $request) {
    if (is_wp_error($response) || $response->get_status() >= 400) return $response;
    $route = $request->get_route();
    if (preg_match('#^/mangamukai/v1/(social/|reactions/|comments|chapters/comment-counts)#', $route)) {
        $response->header('Cache-Control', 'private, no-store, max-age=0');
        $response->header('Vary', 'Origin, Authorization, Cookie');
    }
    $data = $response->get_data();
    if (!function_exists('mmwp_comments_table') && $route === '/mangamukai/v1/comments' && $request->get_method() === 'GET' && $request['scope'] === 'global' && !$request['chapter_id'] && is_array($data)) {
        $manga = absint($request['manga_id']);
        $data = array_values(array_filter($data, static function ($item) use ($manga) {
            $comment = isset($item['id']) ? get_comment($item['id']) : null;
            return $comment && (int) $comment->comment_post_ID === $manga;
        }));
    }
    if ($route === '/mangamukai/v1/profile/image' && $request->get_method() === 'POST' && !empty($data['success']) && !empty($data['url']) && get_current_user_id()) {
        $field = $request['type'] === 'banner' ? 'banner' : 'avatar';
        $url = esc_url_raw($data['url']);
        update_user_meta(get_current_user_id(), 'mm_' . $field . '_url', $url);
        $profile = mm_social_profile_meta(get_current_user_id());
        $profile[$field . '_url'] = $url;
        update_user_meta(get_current_user_id(), 'mm_social_profile', $profile);
    }
    if (in_array($route, ['/mangamukai/v1/me', '/mangamukai/v1/login', '/mangamukai/v1/register'], true) && !empty($data['user']['id'])) {
        $profile = mm_social_profile_meta((int) $data['user']['id']);
        if ($profile['avatar_url'] !== '') $data['user']['avatar'] = $profile['avatar_url'];
    }
    $response->set_data($data);
    return $response;
}, 30, 3);
