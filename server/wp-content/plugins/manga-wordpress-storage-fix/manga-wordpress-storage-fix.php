<?php
/**
 * Plugin Name: MangaMukai WordPress Storage Fix
 * Description: Stores profile, comments, comment likes, and contact messages in WordPress.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('init', function () {
    register_post_type('mm_contact_message', [
        'labels' => [
            'name' => 'MangaMukai Contact Messages',
            'singular_name' => 'MangaMukai Contact Message',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'supports' => ['title', 'editor', 'author'],
        'capability_type' => 'post',
    ]);
});

add_action('rest_api_init', function () {
    mmwp_ensure_tables();

    register_rest_route('mangamukai/v1', '/profile', [
        [
            'methods' => 'GET',
            'callback' => 'mmwp_handle_profile_get',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'mmwp_handle_profile_update',
            'permission_callback' => '__return_true',
        ],
    ], true);

    register_rest_route('mangamukai/v1', '/profile/image', [
        'methods' => 'POST',
        'callback' => 'mmwp_handle_profile_image',
        'permission_callback' => '__return_true',
    ], true);

    register_rest_route('mangamukai/v1', '/comments', [
        [
            'methods' => 'GET',
            'callback' => 'mmwp_handle_comments_get',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'mmwp_handle_comments_post',
            'permission_callback' => '__return_true',
        ],
    ], true);

    register_rest_route('mangamukai/v1', '/comments/like', [
        'methods' => 'POST',
        'callback' => 'mmwp_handle_comment_like',
        'permission_callback' => '__return_true',
    ], true);

    register_rest_route('mangamukai/v1', '/contact', [
        'methods' => 'POST',
        'callback' => 'mmwp_handle_contact',
        'permission_callback' => '__return_true',
    ], true);
}, 99);

register_activation_hook(__FILE__, 'mmwp_ensure_tables');

function mmwp_comments_table(): string
{
    global $wpdb;
    return $wpdb->prefix . 'mm_comments';
}

function mmwp_comment_likes_table(): string
{
    global $wpdb;
    return $wpdb->prefix . 'mm_comment_likes';
}

function mmwp_ensure_tables(): void
{
    if (get_option('mmwp_storage_schema_version') === '1.0.0') return;
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $comments = mmwp_comments_table();
    $likes = mmwp_comment_likes_table();

    dbDelta("CREATE TABLE {$comments} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        manga_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        parent_id BIGINT UNSIGNED NULL,
        content TEXT NOT NULL,
        likes_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY  (id),
        KEY manga_id (manga_id),
        KEY user_id (user_id),
        KEY parent_id (parent_id),
        KEY created_at (created_at)
    ) {$charset};");

    dbDelta("CREATE TABLE {$likes} (
        comment_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY  (comment_id, user_id),
        KEY user_id (user_id)
    ) {$charset};");
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $comments)) === $comments && $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $likes)) === $likes) {
        update_option('mmwp_storage_schema_version', '1.0.0', false);
    }
}

function mmwp_token_from_request(WP_REST_Request $req): string
{
    $header = $req->get_header('Authorization') ?: '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return trim($matches[1]);
    }
    return '';
}

function mmwp_token_secret(): string
{
    return AUTH_KEY . SECURE_AUTH_KEY . LOGGED_IN_KEY . NONCE_KEY;
}

function mmwp_user_from_token(string $token): ?WP_User
{
    $decoded = base64_decode($token, true);
    if (!$decoded) return null;

    $parts = explode(':', $decoded);

    if (count($parts) === 2) {
        [$user_id, $hash] = $parts;
        $expected = wp_hash((int) $user_id . AUTH_KEY . gmdate('Y-m-d'));
        $expected_prev = wp_hash((int) $user_id . AUTH_KEY . gmdate('Y-m-d', strtotime('-1 day')));
        if (!hash_equals($expected, $hash) && !hash_equals($expected_prev, $hash)) {
            return null;
        }
        $user = get_user_by('id', (int) $user_id);
        return $user ?: null;
    }

    if (count($parts) === 4) {
        [$user_id, $issued_at, $expires_at, $sig] = $parts;
        if (!ctype_digit($user_id) || !ctype_digit($issued_at) || !ctype_digit($expires_at)) {
            return null;
        }
        if ((int) $expires_at < time()) return null;
        $payload = $user_id . '|' . $issued_at . '|' . $expires_at;
        $expected = hash_hmac('sha256', $payload, mmwp_token_secret());
        if (!hash_equals($expected, $sig)) return null;
        $user = get_user_by('id', (int) $user_id);
        return $user ?: null;
    }

    return null;
}

function mmwp_auth_user(WP_REST_Request $req): ?WP_User
{
    $token = mmwp_token_from_request($req);
    return $token ? mmwp_user_from_token($token) : null;
}

function mmwp_json_params(WP_REST_Request $req): array
{
    $json = $req->get_json_params();
    return is_array($json) ? $json : $req->get_params();
}

function mmwp_default_social_links(): array
{
    return [
        'facebook' => '',
        'twitter' => '',
        'instagram' => '',
        'discord' => '',
        'whatsapp' => '',
        'telegram' => '',
        'youtube' => '',
        'github' => '',
    ];
}

function mmwp_sanitize_social_links($raw): array
{
    $links = mmwp_default_social_links();
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        $raw = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($raw)) return $links;

    foreach ($links as $key => $_value) {
        $value = isset($raw[$key]) ? (string) $raw[$key] : '';
        $links[$key] = in_array($key, ['discord'], true)
            ? sanitize_text_field($value)
            : esc_url_raw($value);
    }
    return $links;
}

function mmwp_user_is_pro(int $user_id): bool
{
    $keys = ['mm_is_pro', 'mukai_is_pro', 'is_pro'];
    foreach ($keys as $key) {
        $value = get_user_meta($user_id, $key, true);
        if ($value === '1' || $value === 1 || $value === true || $value === 'yes') {
            return true;
        }
    }
    return false;
}

function mmwp_profile_payload(WP_User $user): array
{
    $social = get_user_meta($user->ID, 'mm_profile_social_links', true);
    $created = $user->user_registered ?: current_time('mysql');

    return [
        'username' => get_user_meta($user->ID, 'mm_profile_username', true) ?: ($user->display_name ?: $user->user_login),
        'bio' => get_user_meta($user->ID, 'mm_profile_bio', true) ?: '',
        'location' => get_user_meta($user->ID, 'mm_profile_location', true) ?: '',
        'avatar_url' => get_user_meta($user->ID, 'mm_profile_avatar_url', true) ?: get_avatar_url($user->ID),
        'banner_url' => get_user_meta($user->ID, 'mm_profile_banner_url', true) ?: '',
        'banner_color' => get_user_meta($user->ID, 'mm_profile_banner_color', true) ?: 'bg-[#FF4D88]',
        'is_pro' => mmwp_user_is_pro($user->ID),
        'created_at' => mysql2date('c', $created),
        'social_links' => mmwp_sanitize_social_links($social),
    ];
}

function mmwp_user_profile_for_comment(int $user_id): array
{
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return [
            'username' => 'Usuario',
            'avatar_url' => null,
            'banner_color' => 'bg-zinc-800',
            'is_pro' => false,
        ];
    }

    $profile = mmwp_profile_payload($user);
    return [
        'username' => $profile['username'],
        'avatar_url' => $profile['avatar_url'],
        'banner_color' => $profile['banner_color'] ?: 'bg-zinc-800',
        'is_pro' => (bool) $profile['is_pro'],
    ];
}

function mmwp_handle_profile_get(WP_REST_Request $req): WP_REST_Response
{
    $user = mmwp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token invalido o expirado.'], 401);
    }

    return new WP_REST_Response([
        'success' => true,
        'profile' => mmwp_profile_payload($user),
    ], 200);
}

function mmwp_handle_profile_update(WP_REST_Request $req): WP_REST_Response
{
    $user = mmwp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token invalido o expirado.'], 401);
    }

    $data = mmwp_json_params($req);
    $username = sanitize_text_field((string) ($data['username'] ?? ''));
    $bio = sanitize_textarea_field((string) ($data['bio'] ?? ''));
    $location = sanitize_text_field((string) ($data['location'] ?? ''));
    $banner_color = sanitize_text_field((string) ($data['banner_color'] ?? 'bg-[#FF4D88]'));
    $social_links = mmwp_sanitize_social_links($data['social_links'] ?? []);

    if ($username !== '') {
        update_user_meta($user->ID, 'mm_profile_username', $username);
        wp_update_user([
            'ID' => $user->ID,
            'display_name' => $username,
        ]);
    }

    update_user_meta($user->ID, 'mm_profile_bio', $bio);
    update_user_meta($user->ID, 'mm_profile_location', $location);
    update_user_meta($user->ID, 'mm_profile_banner_color', $banner_color);
    update_user_meta($user->ID, 'mm_profile_social_links', wp_json_encode($social_links));

    return new WP_REST_Response([
        'success' => true,
        'profile' => mmwp_profile_payload($user),
    ], 200);
}

function mmwp_handle_profile_image(WP_REST_Request $req): WP_REST_Response
{
    $user = mmwp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token invalido o expirado.'], 401);
    }

    $type = sanitize_key((string) ($req->get_param('type') ?? 'avatar'));
    if (!in_array($type, ['avatar', 'banner'], true)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Tipo de imagen invalido.'], 400);
    }

    if (empty($_FILES['file'])) {
        return new WP_REST_Response(['success' => false, 'message' => 'No se recibio imagen.'], 400);
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $attachment_id = media_handle_upload('file', 0, ['post_author' => $user->ID]);
    if (is_wp_error($attachment_id)) {
        return new WP_REST_Response([
            'success' => false,
            'message' => $attachment_id->get_error_message(),
        ], 500);
    }

    $url = wp_get_attachment_url($attachment_id);
    if (!$url) {
        return new WP_REST_Response(['success' => false, 'message' => 'No se pudo obtener la URL.'], 500);
    }

    $meta_key = $type === 'avatar' ? 'mm_profile_avatar_url' : 'mm_profile_banner_url';
    update_user_meta($user->ID, $meta_key, esc_url_raw($url));

    return new WP_REST_Response([
        'success' => true,
        'url' => $url,
    ], 200);
}

function mmwp_comment_payload(array $row, bool $liked): array
{
    return [
        'id' => (int) $row['id'],
        'content' => (string) $row['content'],
        'created_at' => mysql2date('c', $row['created_at']),
        'likes' => (int) $row['likes_count'],
        'parent_id' => $row['parent_id'] ? (int) $row['parent_id'] : null,
        'user_id' => (string) $row['user_id'],
        'is_liked_by_user' => $liked,
        'profiles' => mmwp_user_profile_for_comment((int) $row['user_id']),
    ];
}

function mmwp_liked_comment_ids(array $comment_ids, ?WP_User $user): array
{
    if (!$user || empty($comment_ids)) return [];

    global $wpdb;
    $likes = mmwp_comment_likes_table();
    $placeholders = implode(',', array_fill(0, count($comment_ids), '%d'));
    $sql = $wpdb->prepare(
        "SELECT comment_id FROM {$likes} WHERE user_id = %d AND comment_id IN ({$placeholders})",
        array_merge([$user->ID], array_map('intval', $comment_ids))
    );

    $rows = $wpdb->get_col($sql);
    return array_map('intval', $rows ?: []);
}

function mmwp_handle_comments_get(WP_REST_Request $req): WP_REST_Response
{
    global $wpdb;
    $manga_id = (int) ($req->get_param('manga_id') ?? 0);
    if ($manga_id <= 0) {
        return new WP_REST_Response(['success' => false, 'message' => 'Manga invalido.'], 400);
    }

    $filter = sanitize_key((string) ($req->get_param('filter') ?? 'recientes'));
    $order = $filter === 'populares' ? 'likes_count DESC, created_at DESC' : 'created_at DESC';
    $table = mmwp_comments_table();

    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} WHERE manga_id = %d ORDER BY {$order} LIMIT 200",
        $manga_id
    ), ARRAY_A);

    $user = mmwp_auth_user($req);
    $comment_ids = array_map(fn($row) => (int) $row['id'], $rows ?: []);
    $liked_ids = mmwp_liked_comment_ids($comment_ids, $user);
    $liked_lookup = array_fill_keys($liked_ids, true);

    $comments = array_map(function ($row) use ($liked_lookup) {
        return mmwp_comment_payload($row, isset($liked_lookup[(int) $row['id']]));
    }, $rows ?: []);

    return new WP_REST_Response([
        'success' => true,
        'comments' => $comments,
    ], 200);
}

function mmwp_handle_comments_post(WP_REST_Request $req): WP_REST_Response
{
    global $wpdb;
    $user = mmwp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token invalido o expirado.'], 401);
    }

    $data = mmwp_json_params($req);
    $manga_id = (int) ($data['manga_id'] ?? 0);
    $content = trim(wp_strip_all_tags((string) ($data['content'] ?? '')));
    $parent_id = isset($data['parent_id']) && $data['parent_id'] ? (int) $data['parent_id'] : null;

    if ($manga_id <= 0 || $content === '') {
        return new WP_REST_Response(['success' => false, 'message' => 'Comentario invalido.'], 400);
    }

    if (function_exists('mb_substr')) {
        $content = mb_substr($content, 0, 500);
    } else {
        $content = substr($content, 0, 500);
    }

    if ($parent_id) {
        $parent_manga = (int) $wpdb->get_var($wpdb->prepare(
            'SELECT manga_id FROM ' . mmwp_comments_table() . ' WHERE id = %d',
            $parent_id
        ));
        if ($parent_manga !== $manga_id) {
            return new WP_REST_Response(['success' => false, 'message' => 'Respuesta invalida.'], 400);
        }
    }

    $now = current_time('mysql');
    $inserted = $wpdb->insert(mmwp_comments_table(), [
        'manga_id' => $manga_id,
        'user_id' => $user->ID,
        'parent_id' => $parent_id,
        'content' => $content,
        'likes_count' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%d', '%d', '%d', '%s', '%d', '%s', '%s']);

    if (!$inserted) {
        return new WP_REST_Response(['success' => false, 'message' => 'No se pudo guardar.'], 500);
    }

    $row = [
        'id' => (int) $wpdb->insert_id,
        'manga_id' => $manga_id,
        'user_id' => $user->ID,
        'parent_id' => $parent_id,
        'content' => $content,
        'likes_count' => 0,
        'created_at' => $now,
    ];

    return new WP_REST_Response([
        'success' => true,
        'comment' => mmwp_comment_payload($row, false),
    ], 201);
}

function mmwp_handle_comment_like(WP_REST_Request $req): WP_REST_Response
{
    global $wpdb;
    $user = mmwp_auth_user($req);
    if (!$user) {
        return new WP_REST_Response(['success' => false, 'message' => 'Token invalido o expirado.'], 401);
    }

    $data = mmwp_json_params($req);
    $comment_id = (int) ($data['comment_id'] ?? 0);
    if ($comment_id <= 0) {
        return new WP_REST_Response(['success' => false, 'message' => 'Comentario invalido.'], 400);
    }

    $comments = mmwp_comments_table();
    $likes = mmwp_comment_likes_table();
    $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$comments} WHERE id = %d", $comment_id));
    if (!$exists) {
        return new WP_REST_Response(['success' => false, 'message' => 'Comentario no encontrado.'], 404);
    }

    $already = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$likes} WHERE comment_id = %d AND user_id = %d",
        $comment_id,
        $user->ID
    ));

    if ($already) {
        $wpdb->delete($likes, ['comment_id' => $comment_id, 'user_id' => $user->ID], ['%d', '%d']);
        $wpdb->query($wpdb->prepare(
            "UPDATE {$comments} SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = %d",
            $comment_id
        ));
        $liked = false;
    } else {
        $wpdb->insert($likes, [
            'comment_id' => $comment_id,
            'user_id' => $user->ID,
            'created_at' => current_time('mysql'),
        ], ['%d', '%d', '%s']);
        $wpdb->query($wpdb->prepare(
            "UPDATE {$comments} SET likes_count = likes_count + 1 WHERE id = %d",
            $comment_id
        ));
        $liked = true;
    }

    $count = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT likes_count FROM {$comments} WHERE id = %d",
        $comment_id
    ));

    return new WP_REST_Response([
        'success' => true,
        'liked' => $liked,
        'likes' => $count,
    ], 200);
}

function mmwp_handle_contact(WP_REST_Request $req): WP_REST_Response
{
    $data = mmwp_json_params($req);
    $name = sanitize_text_field((string) ($data['name'] ?? ''));
    $email = sanitize_email((string) ($data['email'] ?? ''));
    $subject = sanitize_text_field((string) ($data['subject'] ?? ''));
    $message = sanitize_textarea_field((string) ($data['message'] ?? ''));

    if ($name === '' || $email === '' || $subject === '' || $message === '' || !is_email($email)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Datos invalidos.'], 400);
    }

    $user = mmwp_auth_user($req);
    $post_id = wp_insert_post([
        'post_type' => 'mm_contact_message',
        'post_status' => 'private',
        'post_title' => $subject . ' - ' . $name,
        'post_content' => $message,
        'post_author' => $user ? $user->ID : 0,
    ], true);

    if (is_wp_error($post_id)) {
        return new WP_REST_Response(['success' => false, 'message' => $post_id->get_error_message()], 500);
    }

    update_post_meta($post_id, 'mm_contact_name', $name);
    update_post_meta($post_id, 'mm_contact_email', $email);
    update_post_meta($post_id, 'mm_contact_subject', $subject);
    if ($user) update_post_meta($post_id, 'mm_contact_user_id', $user->ID);

    $admin_email = get_option('admin_email');
    if ($admin_email) {
        wp_mail(
            $admin_email,
            '[MangaMukai] ' . $subject,
            "Nombre: {$name}\nEmail: {$email}\n\n{$message}"
        );
    }

    return new WP_REST_Response([
        'success' => true,
        'message' => 'Mensaje guardado en WordPress.',
    ], 201);
}
