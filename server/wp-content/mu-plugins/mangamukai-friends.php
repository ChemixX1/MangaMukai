<?php
/**
 * Plugin Name: MangaMukai Social
 * Description: Perfiles publicos, seguidores, chat, notificaciones, lecturas y seguimiento de mangas para React.
 * Version: 4.3.0
 */

if (!defined('ABSPATH')) exit;

const MM_SOCIAL_DB_VERSION = '4.3.0';
// Minutos sin actividad tras los que un lector deja de mostrarse como "Conectado".
const MM_SOCIAL_ONLINE_MINUTES = 3;

function mm_social_table($suffix) {
    global $wpdb;
    return $wpdb->prefix . 'mm_' . $suffix;
}

function mm_social_install_schema() {
    if (get_option('mm_social_db_version') === MM_SOCIAL_DB_VERSION) return;
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();

    $friendships = mm_social_table('friendships');
    $messages = mm_social_table('messages');
    $notifications = mm_social_table('notifications');
    $comment_refs = mm_social_table('comment_refs');
    $subscriptions = mm_social_table('manga_subscriptions');
    $posts = mm_social_table('profile_posts');
    $follows = mm_social_table('follows');
    $reads = mm_social_table('manga_reads');
    $progress = mm_social_table('chapter_progress');

    dbDelta("CREATE TABLE {$friendships} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_low bigint(20) unsigned NOT NULL,
        user_high bigint(20) unsigned NOT NULL,
        requester_id bigint(20) unsigned NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY user_pair (user_low,user_high),
        KEY requester_id (requester_id),
        KEY status (status)
    ) {$charset};");
    dbDelta("CREATE TABLE {$messages} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        sender_id bigint(20) unsigned NOT NULL,
        recipient_id bigint(20) unsigned NOT NULL,
        body text NOT NULL,
        created_at datetime NOT NULL,
        read_at datetime DEFAULT NULL,
        PRIMARY KEY  (id),
        KEY sender_id (sender_id),
        KEY recipient_id (recipient_id),
        KEY conversation (sender_id,recipient_id,created_at),
        KEY unread (recipient_id,read_at)
    ) {$charset};");
    dbDelta("CREATE TABLE {$notifications} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        actor_id bigint(20) unsigned DEFAULT NULL,
        type varchar(40) NOT NULL,
        entity_id varchar(100) NOT NULL DEFAULT '',
        payload longtext DEFAULT NULL,
        dedupe_key varchar(191) NOT NULL,
        created_at datetime NOT NULL,
        read_at datetime DEFAULT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY dedupe_key (dedupe_key),
        KEY user_read (user_id,read_at),
        KEY user_created (user_id,created_at)
    ) {$charset};");
    dbDelta("CREATE TABLE {$comment_refs} (
        comment_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        manga_id varchar(100) NOT NULL DEFAULT '',
        updated_at datetime NOT NULL,
        PRIMARY KEY  (comment_id),
        KEY user_id (user_id)
    ) {$charset};");
    dbDelta("CREATE TABLE {$subscriptions} (
        user_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (user_id,manga_id),
        KEY manga_id (manga_id)
    ) {$charset};");
    dbDelta("CREATE TABLE {$posts} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        content text NOT NULL,
        media_id bigint(20) unsigned DEFAULT NULL,
        media_url text DEFAULT NULL,
        media_type varchar(20) NOT NULL DEFAULT '',
        shared_post_id bigint(20) unsigned DEFAULT NULL,
        visibility varchar(20) NOT NULL DEFAULT 'public',
        status varchar(20) NOT NULL DEFAULT 'published',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY user_created (user_id,created_at),
        KEY status (status),
        UNIQUE KEY user_shared (user_id,shared_post_id)
    ) {$charset};");
    // Seguir es unidireccional: una fila por (quien sigue, a quien sigue).
    dbDelta("CREATE TABLE {$follows} (
        follower_id bigint(20) unsigned NOT NULL,
        following_id bigint(20) unsigned NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (follower_id,following_id),
        KEY following_id (following_id,created_at)
    ) {$charset};");
    // Mangas leidos: una fila por (lector, serie); chapters cuenta capitulos abiertos.
    dbDelta("CREATE TABLE {$reads} (
        user_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL,
        chapters int(10) unsigned NOT NULL DEFAULT 1,
        last_chapter_id bigint(20) unsigned NOT NULL DEFAULT 0,
        first_read_at datetime NOT NULL,
        last_read_at datetime NOT NULL,
        PRIMARY KEY  (user_id,manga_id),
        KEY user_last (user_id,last_read_at)
    ) {$charset};");
    // Progreso por capitulo: completed pasa a 1 cuando el lector llega al final del capitulo.
    dbDelta("CREATE TABLE {$progress} (
        user_id bigint(20) unsigned NOT NULL,
        chapter_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL DEFAULT 0,
        completed tinyint(1) unsigned NOT NULL DEFAULT 0,
        started_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (user_id,chapter_id),
        KEY user_updated (user_id,completed,updated_at)
    ) {$charset};");
    mm_social_migrate_friendships_to_follows();
    if ($wpdb->get_var("SHOW COLUMNS FROM {$posts} LIKE 'shared_post_id'") === 'shared_post_id'
        && $wpdb->get_var("SHOW TABLES LIKE '{$follows}'") === $follows
        && $wpdb->get_var("SHOW TABLES LIKE '{$progress}'") === $progress) {
        update_option('mm_social_db_version', MM_SOCIAL_DB_VERSION, false);
    }
}
add_action('init', 'mm_social_install_schema', 5);

/**
 * Las amistades previas se convierten en seguimientos: aceptada = se siguen mutuamente,
 * pendiente = quien la envio sigue al otro. INSERT IGNORE la hace idempotente.
 */
function mm_social_migrate_friendships_to_follows() {
    global $wpdb;
    $friendships = mm_social_table('friendships');
    $follows = mm_social_table('follows');
    if ($wpdb->get_var("SHOW TABLES LIKE '{$friendships}'") !== $friendships) return;
    $wpdb->query("INSERT IGNORE INTO {$follows} (follower_id, following_id, created_at)
        SELECT requester_id, IF(requester_id = user_low, user_high, user_low), created_at
        FROM {$friendships} WHERE status IN ('accepted','pending')");
    $wpdb->query("INSERT IGNORE INTO {$follows} (follower_id, following_id, created_at)
        SELECT IF(requester_id = user_low, user_high, user_low), requester_id, updated_at
        FROM {$friendships} WHERE status = 'accepted'");
}

/** Marca al usuario como activo (como mucho una escritura por minuto). */
function mm_social_touch_presence($user_id) {
    $user_id = (int) $user_id;
    if (!$user_id) return;
    $last = (int) get_user_meta($user_id, 'mm_last_active', true);
    if (time() - $last < 60) return;
    update_user_meta($user_id, 'mm_last_active', time());
}

function mm_social_auth_permission(WP_REST_Request $request) {
    $user = function_exists('mm_get_request_user')
        ? mm_get_request_user($request)
        : (is_user_logged_in() ? wp_get_current_user() : null);

    if ($user instanceof WP_User && $user->ID) {
        // Las rutas sociales usan get_current_user_id() dentro de sus callbacks.
        // Vincular aquí el Bearer token evita depender de una cookie de WordPress,
        // que no está disponible cuando React se ejecuta desde localhost.
        wp_set_current_user((int) $user->ID);
        mm_social_touch_presence($user->ID);
        return true;
    }

    return new WP_Error('mm_social_unauthorized', 'Debes iniciar sesion.', ['status' => 401]);
}

function mm_social_pair($first, $second) {
    $first = (int) $first;
    $second = (int) $second;
    return [min($first, $second), max($first, $second)];
}

function mm_social_profile_meta($user_id) {
    $stored = get_user_meta($user_id, 'mm_social_profile', true);
    if (!is_array($stored)) $stored = [];
    $links = isset($stored['social_links']) && is_array($stored['social_links']) ? $stored['social_links'] : [];
    $legacy_links = get_user_meta($user_id, 'social_links', true);
    if (is_array($legacy_links)) $links = array_merge($legacy_links, $links);

    $read_first = static function ($value, $keys) use ($user_id) {
        if ((string) $value !== '') return (string) $value;
        foreach ($keys as $key) {
            $candidate = (string) get_user_meta($user_id, $key, true);
            if ($candidate !== '') return $candidate;
        }
        return '';
    };

    return [
        'bio' => sanitize_textarea_field($read_first($stored['bio'] ?? '', ['mm_bio', 'bio', 'description'])),
        'location' => sanitize_text_field($read_first($stored['location'] ?? '', ['mm_location', 'location'])),
        'avatar_url' => esc_url_raw($read_first($stored['avatar_url'] ?? '', ['mm_avatar_url', 'avatar_url', 'profile_avatar'])),
        'banner_url' => esc_url_raw($read_first($stored['banner_url'] ?? '', ['mm_banner_url', 'banner_url', 'profile_banner'])),
        'banner_color' => sanitize_text_field((string) ($stored['banner_color'] ?? 'bg-[#FF4D88]')),
        'birth_date' => sanitize_text_field($read_first($stored['birth_date'] ?? '', ['mm_birth_date'])),
        'country_code' => sanitize_text_field($read_first($stored['country_code'] ?? '', ['mm_country_code'])),
        'phone' => preg_replace('/\D+/', '', $read_first($stored['phone'] ?? '', ['mm_phone'])),
        'show_birth_date' => !empty($stored['show_birth_date']),
        'show_phone' => !empty($stored['show_phone']),
        'social_links' => array_map('sanitize_text_field', $links),
    ];
}

function mm_social_public_user($user_id, $detailed = false) {
    $user = get_userdata((int) $user_id);
    if (!$user) return null;
    $meta = mm_social_profile_meta($user->ID);
    $last_active = (int) get_user_meta($user->ID, 'mm_last_active', true);
    $result = [
        'id' => (int) $user->ID,
        'username' => (string) ($user->display_name ?: $user->user_login),
        'avatar_url' => $meta['avatar_url'] ?: (string) get_avatar_url($user->ID, ['size' => $detailed ? 256 : 96]),
        'is_pro' => (bool) get_user_meta($user->ID, 'mm_is_pro', true),
        'is_online' => $last_active > 0 && (time() - $last_active) < MM_SOCIAL_ONLINE_MINUTES * 60,
        'last_active' => $last_active ? gmdate('Y-m-d\TH:i:s\Z', $last_active) : null,
        'created_at' => str_replace(' ', 'T', $user->user_registered) . 'Z',
    ];
    if ($detailed) {
        $counts = mm_social_follow_counts($user->ID);
        $result += [
            'bio' => $meta['bio'], 'location' => $meta['location'],
            'banner_url' => $meta['banner_url'], 'banner_color' => $meta['banner_color'],
            'followers_count' => $counts['followers'], 'following_count' => $counts['following'],
            'mangas_read_count' => mm_social_mangas_read_count($user->ID),
            'chapters_read_count' => mm_social_chapters_read_count($user->ID),
            'birth_date' => $meta['show_birth_date'] ? $meta['birth_date'] : '',
            'phone' => $meta['show_phone'] && $meta['phone'] !== '' ? trim($meta['country_code'] . ' ' . $meta['phone']) : '',
            'social_links' => array_merge([
                'facebook' => '', 'twitter' => '', 'instagram' => '', 'discord' => '',
                'whatsapp' => '', 'telegram' => '', 'youtube' => '', 'github' => '',
            ], $meta['social_links']),
        ];
    }
    return $result;
}

function mm_social_friendship_status($viewer_id, $profile_id) {
    if (!$viewer_id) return ['status' => 'guest', 'request_id' => 0];
    if ((int) $viewer_id === (int) $profile_id) return ['status' => 'self', 'request_id' => 0];
    global $wpdb;
    [$low, $high] = mm_social_pair($viewer_id, $profile_id);
    $row = $wpdb->get_row($wpdb->prepare(
        'SELECT id,requester_id,status FROM ' . mm_social_table('friendships') . ' WHERE user_low=%d AND user_high=%d',
        $low, $high
    ));
    if (!$row || $row->status === 'rejected') return ['status' => 'none', 'request_id' => 0];
    if ($row->status === 'accepted') return ['status' => 'friends', 'request_id' => (int) $row->id];
    return [
        'status' => (int) $row->requester_id === (int) $viewer_id ? 'pending_sent' : 'pending_received',
        'request_id' => (int) $row->id,
    ];
}

function mm_social_is_following($follower, $following) {
    global $wpdb;
    if (!$follower || !$following) return false;
    return (bool) $wpdb->get_var($wpdb->prepare(
        'SELECT 1 FROM ' . mm_social_table('follows') . ' WHERE follower_id=%d AND following_id=%d',
        (int) $follower, (int) $following
    ));
}

function mm_social_follow_counts($user_id) {
    global $wpdb;
    $table = mm_social_table('follows');
    return [
        'followers' => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE following_id=%d", (int) $user_id)),
        'following' => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE follower_id=%d", (int) $user_id)),
    ];
}

function mm_social_mangas_read_count($user_id) {
    global $wpdb;
    return (int) $wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM ' . mm_social_table('manga_reads') . ' WHERE user_id=%d', (int) $user_id));
}

/**
 * Biblioteca personal del lector (pestanas de "Mas"): series que esta leyendo
 * con el ultimo capitulo abierto, capitulos con reaccion y mangas con me gusta.
 */
function mm_social_get_library() {
    global $wpdb;
    $user_id = get_current_user_id();
    $reads = mm_social_table('manga_reads');
    $reactions = mm_social_table('entity_reactions');

    $chapter_payload = static function ($chapter_id) {
        $chapter = get_post((int) $chapter_id);
        if (!$chapter || $chapter->post_status !== 'publish') return null;
        $series_id = absint(get_post_meta($chapter->ID, 'ero_seri', true));
        if (!$series_id) return null;
        return [
            'manga_id' => $series_id,
            'title' => get_the_title($series_id),
            'cover' => mm_social_series_cover($series_id),
            'chapter_id' => (int) $chapter->ID,
            'chapter_number' => (float) get_post_meta($chapter->ID, 'ero_chapter', true),
            'chapter_title' => get_the_title($chapter),
            'image' => mm_social_chapter_image($chapter->ID),
        ];
    };

    // Actividad: capitulos abiertos en el lector sin llegar al final (los mas recientes primero).
    // Mientras no haya progreso registrado de una serie, vale su ultimo capitulo abierto,
    // salvo que ya conste como terminado.
    $progress = mm_social_table('chapter_progress');
    $reading = [];
    $seen = [];
    $completed = array_map('intval', (array) $wpdb->get_col($wpdb->prepare("SELECT chapter_id FROM {$progress} WHERE user_id=%d AND completed=1", $user_id)));
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT chapter_id, manga_id, updated_at FROM {$progress} WHERE user_id=%d AND completed=0 ORDER BY updated_at DESC LIMIT 40",
        $user_id
    ));
    foreach ((array) $rows as $row) {
        $item = $chapter_payload($row->chapter_id);
        if (!$item) continue;
        $seen[(int) $row->chapter_id] = true;
        $item['chapters_read'] = 0;
        $item['last_read_at'] = str_replace(' ', 'T', (string) $row->updated_at) . 'Z';
        $reading[] = $item;
    }
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT manga_id, last_chapter_id, chapters, last_read_at FROM {$reads} WHERE user_id=%d AND last_chapter_id > 0 ORDER BY last_read_at DESC LIMIT 30",
        $user_id
    ));
    foreach ((array) $rows as $row) {
        $chapter_id = (int) $row->last_chapter_id;
        if (isset($seen[$chapter_id]) || in_array($chapter_id, $completed, true)) continue;
        $item = $chapter_payload($chapter_id);
        if (!$item) continue;
        $seen[$chapter_id] = true;
        $item['chapters_read'] = (int) $row->chapters;
        $item['last_read_at'] = str_replace(' ', 'T', (string) $row->last_read_at) . 'Z';
        $reading[] = $item;
    }
    usort($reading, static function ($a, $b) { return strcmp($b['last_read_at'], $a['last_read_at']); });
    $reading = array_slice($reading, 0, 40);

    // Me gusta > capitulos: reacciones del lector sobre capitulos.
    $liked_chapters = [];
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT target_id, reaction, updated_at FROM {$reactions} WHERE user_id=%d AND target_type='chapter' ORDER BY updated_at DESC LIMIT 60",
        $user_id
    ));
    foreach ((array) $rows as $row) {
        $item = $chapter_payload($row->target_id);
        if (!$item) continue;
        $item['reaction'] = (string) $row->reaction;
        $liked_chapters[] = $item;
    }

    // Me gusta > mangas: corazon de la ficha (meta del usuario) y reacciones sobre la serie.
    $ids = get_user_meta($user_id, 'mm_user_likes', true);
    $ids = is_array($ids) ? array_map('absint', $ids) : [];
    $reacted = $wpdb->get_col($wpdb->prepare("SELECT target_id FROM {$reactions} WHERE user_id=%d AND target_type='manga' ORDER BY updated_at DESC", $user_id));
    $liked_mangas = [];
    foreach (array_unique(array_merge($ids, array_map('absint', (array) $reacted))) as $series_id) {
        $series = get_post($series_id);
        if (!$series || $series->post_status !== 'publish') continue;
        $liked_mangas[] = ['manga_id' => (int) $series_id, 'title' => get_the_title($series_id), 'cover' => mm_social_series_cover($series_id)];
    }

    return rest_ensure_response(['success' => true, 'reading' => $reading, 'liked_chapters' => $liked_chapters, 'liked_mangas' => $liked_mangas]);
}

/**
 * POST /social/reading-progress { chapter_id, manga_id, completed }
 * Anota que el lector abrio el capitulo; con completed=1 (llego al final) queda
 * terminado y sale de Actividad. Un capitulo terminado no vuelve a "en curso".
 */
function mm_social_record_chapter_progress(WP_REST_Request $request) {
    global $wpdb;
    $user_id = get_current_user_id();
    $chapter_id = absint($request->get_param('chapter_id'));
    $manga_id = absint($request->get_param('manga_id'));
    $completed = filter_var($request->get_param('completed'), FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    if (!$chapter_id) return new WP_Error('mm_social_progress_chapter', 'Falta el capitulo.', ['status' => 400]);
    $now = current_time('mysql', true);
    $wpdb->query($wpdb->prepare(
        'INSERT INTO ' . mm_social_table('chapter_progress') . ' (user_id, chapter_id, manga_id, completed, started_at, updated_at) VALUES (%d, %d, %d, %d, %s, %s)
         ON DUPLICATE KEY UPDATE completed = GREATEST(completed, VALUES(completed)), manga_id = IF(manga_id = 0, VALUES(manga_id), manga_id), updated_at = VALUES(updated_at)',
        $user_id, $chapter_id, $manga_id, $completed, $now, $now
    ));
    return rest_ensure_response(['success' => true, 'completed' => (bool) $completed]);
}

/** Capitulos leidos: suma de `chapters` (cada capitulo distinto abierto) de todas las series del lector. */
function mm_social_chapters_read_count($user_id) {
    global $wpdb;
    return (int) $wpdb->get_var($wpdb->prepare('SELECT COALESCE(SUM(chapters), 0) FROM ' . mm_social_table('manga_reads') . ' WHERE user_id=%d', (int) $user_id));
}

function mm_social_are_friends($first, $second) {
    global $wpdb;
    [$low, $high] = mm_social_pair($first, $second);
    return (bool) $wpdb->get_var($wpdb->prepare(
        'SELECT id FROM ' . mm_social_table('friendships') . " WHERE user_low=%d AND user_high=%d AND status='accepted'",
        $low, $high
    ));
}

// El chat es abierto: basta con que el destinatario exista y no sea uno mismo.
function mm_social_can_chat_with($current, $other) {
    $other = (int) $other;
    return $other > 0 && $other !== (int) $current && get_userdata($other) instanceof WP_User;
}

function mm_social_create_notification($user_id, $actor_id, $type, $entity_id, $payload, $dedupe_key) {
    if (!$user_id || (int) $user_id === (int) $actor_id) return;
    global $wpdb;
    $table = mm_social_table('notifications');
    $wpdb->query($wpdb->prepare(
        "INSERT INTO {$table} (user_id,actor_id,type,entity_id,payload,dedupe_key,created_at,read_at)
         VALUES (%d,%d,%s,%s,%s,%s,%s,NULL)
         ON DUPLICATE KEY UPDATE payload=VALUES(payload),created_at=VALUES(created_at),read_at=NULL",
        (int) $user_id, (int) $actor_id, sanitize_key($type), sanitize_text_field((string) $entity_id),
        wp_json_encode($payload), sanitize_text_field($dedupe_key), current_time('mysql', true)
    ));
}

function mm_social_get_public_profile(WP_REST_Request $request) {
    if (function_exists('mm_get_request_user')) {
        $viewer = mm_get_request_user($request);
        if ($viewer instanceof WP_User && $viewer->ID) {
            wp_set_current_user((int) $viewer->ID);
        }
    }
    $id = absint($request->get_param('id'));
    $profile = mm_social_public_user($id, true);
    if (!$profile) return new WP_Error('mm_social_profile_missing', 'Perfil no encontrado.', ['status' => 404]);
    $viewer_id = get_current_user_id();
    if ($viewer_id) mm_social_touch_presence($viewer_id);
    $following = mm_social_is_following($viewer_id, $id);
    $follows_you = mm_social_is_following($id, $viewer_id);
    $profile['follow_status'] = !$viewer_id ? 'guest' : ($viewer_id === $id ? 'self' : ($following ? 'following' : 'none'));
    $profile['follows_you'] = $follows_you;
    // Compatibilidad con bundles antiguos que aun leen friendship_status.
    $profile['friendship_status'] = !$viewer_id ? 'guest' : ($viewer_id === $id ? 'self'
        : ($following && $follows_you ? 'friends' : ($following ? 'pending_sent' : ($follows_you ? 'pending_received' : 'none'))));
    $profile['friend_request_id'] = 0;
    $profile['posts'] = mm_social_posts_for_user($id, 18);
    return rest_ensure_response(['success' => true, 'profile' => $profile]);
}

function mm_social_follow_user(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $target = absint($request->get_param('user_id'));
    if (!$target || $target === $current || !get_userdata($target)) {
        return new WP_Error('mm_social_invalid_user', 'Usuario no valido.', ['status' => 400]);
    }
    $table = mm_social_table('follows');
    $inserted = $wpdb->query($wpdb->prepare(
        "INSERT IGNORE INTO {$table} (follower_id, following_id, created_at) VALUES (%d, %d, %s)",
        $current, $target, current_time('mysql', true)
    ));
    if ($inserted) mm_social_create_notification($target, $current, 'follow', $current, [], 'follow:' . $current . ':' . $target);
    $counts = mm_social_follow_counts($target);
    return rest_ensure_response(['success' => true, 'following' => true, 'followers_count' => $counts['followers']]);
}

function mm_social_unfollow_user(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $target = absint($request->get_param('id'));
    if (!$target || $target === $current) return new WP_Error('mm_social_invalid_user', 'Usuario no valido.', ['status' => 400]);
    $wpdb->delete(mm_social_table('follows'), ['follower_id' => $current, 'following_id' => $target], ['%d', '%d']);
    $wpdb->delete(mm_social_table('notifications'), ['dedupe_key' => 'follow:' . $current . ':' . $target], ['%s']);
    $counts = mm_social_follow_counts($target);
    return rest_ensure_response(['success' => true, 'following' => false, 'followers_count' => $counts['followers']]);
}

/** Seguidores y seguidos de un usuario (por defecto, el de la sesion). Publico. */
function mm_social_get_follows(WP_REST_Request $request) {
    global $wpdb;
    if (function_exists('mm_get_request_user')) {
        $viewer = mm_get_request_user($request);
        if ($viewer instanceof WP_User && $viewer->ID) wp_set_current_user((int) $viewer->ID);
    }
    $user_id = absint($request->get_param('user_id')) ?: get_current_user_id();
    if (!$user_id) return new WP_Error('mm_social_unauthorized', 'Debes iniciar sesion.', ['status' => 401]);
    $table = mm_social_table('follows');
    $viewer_id = get_current_user_id();
    $viewer_following = $viewer_id ? array_map('intval', $wpdb->get_col($wpdb->prepare("SELECT following_id FROM {$table} WHERE follower_id=%d", $viewer_id))) : [];
    $build = static function ($rows, $column) use ($viewer_following) {
        $items = [];
        foreach ($rows as $row) {
            $user = mm_social_public_user((int) $row->$column);
            if (!$user) continue;
            $items[] = [
                'user' => $user,
                'created_at' => str_replace(' ', 'T', $row->created_at) . 'Z',
                'viewer_follows' => in_array((int) $row->$column, $viewer_following, true),
            ];
        }
        return $items;
    };
    $followers = $wpdb->get_results($wpdb->prepare("SELECT follower_id, created_at FROM {$table} WHERE following_id=%d ORDER BY created_at DESC LIMIT 300", $user_id));
    $following = $wpdb->get_results($wpdb->prepare("SELECT following_id, created_at FROM {$table} WHERE follower_id=%d ORDER BY created_at DESC LIMIT 300", $user_id));
    return rest_ensure_response([
        'success' => true,
        'followers' => $build($followers, 'follower_id'),
        'following' => $build($following, 'following_id'),
    ]);
}

/** Registra que el lector abrio un capitulo de una serie; devuelve cuantas series lleva. */
function mm_social_record_manga_read(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $manga_id = absint($request->get_param('manga_id'));
    $chapter_id = absint($request->get_param('chapter_id'));
    if (!$manga_id) return new WP_Error('mm_social_invalid_manga', 'Serie no valida.', ['status' => 400]);
    $table = mm_social_table('manga_reads');
    $now = current_time('mysql', true);
    $wpdb->query($wpdb->prepare(
        "INSERT INTO {$table} (user_id, manga_id, chapters, last_chapter_id, first_read_at, last_read_at) VALUES (%d, %d, 1, %d, %s, %s)
         ON DUPLICATE KEY UPDATE chapters = chapters + IF(last_chapter_id = VALUES(last_chapter_id), 0, 1), last_chapter_id = VALUES(last_chapter_id), last_read_at = VALUES(last_read_at)",
        $current, $manga_id, $chapter_id, $now, $now
    ));
    return rest_ensure_response(['success' => true, 'mangas_read_count' => mm_social_mangas_read_count($current)]);
}

/** Busqueda de lectores para iniciar un chat: cualquier usuario menos uno mismo. */
function mm_social_search_all_users(WP_REST_Request $request) {
    $current = get_current_user_id();
    $query = sanitize_text_field((string) $request->get_param('q'));
    if (strlen($query) < 2) return rest_ensure_response(['success' => true, 'users' => []]);
    $users = get_users([
        'number' => 12, 'search' => '*' . $query . '*', 'search_columns' => ['user_login', 'display_name'],
        'exclude' => [$current], 'orderby' => 'display_name', 'order' => 'ASC', 'fields' => 'ID',
    ]);
    return rest_ensure_response(['success' => true, 'users' => array_values(array_filter(array_map('mm_social_public_user', $users)))]);
}

function mm_social_friends_overview() {
    global $wpdb;
    $current = get_current_user_id();
    $rows = $wpdb->get_results($wpdb->prepare(
        'SELECT id,user_low,user_high,requester_id,status,updated_at FROM ' . mm_social_table('friendships') .
        ' WHERE user_low=%d OR user_high=%d ORDER BY updated_at DESC', $current, $current
    ));
    $result = ['success' => true, 'friends' => [], 'incoming' => [], 'outgoing' => []];
    foreach ($rows as $row) {
        $other = (int) $row->user_low === $current ? (int) $row->user_high : (int) $row->user_low;
        $user = mm_social_public_user($other);
        if (!$user) continue;
        $entry = ['request_id' => (int) $row->id, 'updated_at' => mysql_to_rfc3339($row->updated_at), 'user' => $user];
        if ($row->status === 'accepted') $result['friends'][] = $entry;
        elseif ($row->status === 'pending' && (int) $row->requester_id === $current) $result['outgoing'][] = $entry;
        elseif ($row->status === 'pending') $result['incoming'][] = $entry;
    }
    return $result;
}

function mm_social_send_friend_request(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $target = absint($request->get_param('user_id'));
    if (!$target || $target === $current || !get_userdata($target)) {
        return new WP_Error('mm_social_invalid_user', 'Usuario no valido.', ['status' => 400]);
    }
    [$low, $high] = mm_social_pair($current, $target);
    $table = mm_social_table('friendships');
    $existing = $wpdb->get_row($wpdb->prepare('SELECT id,requester_id,status FROM ' . $table . ' WHERE user_low=%d AND user_high=%d', $low, $high));
    $now = current_time('mysql', true);
    if ($existing && $existing->status === 'accepted') return new WP_Error('mm_social_already_friends', 'Ya son amigos.', ['status' => 409]);
    if ($existing && $existing->status === 'pending') {
        if ((int) $existing->requester_id === $current) return new WP_Error('mm_social_request_exists', 'La solicitud ya fue enviada.', ['status' => 409]);
        $wpdb->update($table, ['status' => 'accepted', 'updated_at' => $now], ['id' => (int) $existing->id], ['%s', '%s'], ['%d']);
        mm_social_create_notification($target, $current, 'friend_accepted', $existing->id, [], 'friend_accepted:' . $existing->id . ':' . $current);
        return rest_ensure_response(['success' => true, 'action' => 'accepted']);
    }
    if ($existing) {
        $wpdb->update($table, ['requester_id' => $current, 'status' => 'pending', 'updated_at' => $now], ['id' => (int) $existing->id], ['%d', '%s', '%s'], ['%d']);
        $request_id = (int) $existing->id;
    } else {
        $ok = $wpdb->insert($table, [
            'user_low' => $low, 'user_high' => $high, 'requester_id' => $current,
            'status' => 'pending', 'created_at' => $now, 'updated_at' => $now,
        ], ['%d', '%d', '%d', '%s', '%s', '%s']);
        if (!$ok) return new WP_Error('mm_social_database_error', 'No se pudo enviar la solicitud.', ['status' => 500]);
        $request_id = (int) $wpdb->insert_id;
    }
    mm_social_create_notification($target, $current, 'friend_request', $request_id, [], 'friend_request:' . $request_id);
    return new WP_REST_Response(['success' => true, 'action' => 'requested', 'request_id' => $request_id], 201);
}

function mm_social_respond_friend_request(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $request_id = absint($request->get_param('request_id'));
    $action = sanitize_key((string) $request->get_param('action'));
    $table = mm_social_table('friendships');
    $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . $table . ' WHERE id=%d', $request_id));
    if (!$row || $row->status !== 'pending' || (int) $row->requester_id === $current || ((int) $row->user_low !== $current && (int) $row->user_high !== $current)) {
        return new WP_Error('mm_social_invalid_request', 'Solicitud no valida.', ['status' => 404]);
    }
    if (!in_array($action, ['accept', 'reject'], true)) return new WP_Error('mm_social_invalid_action', 'Accion no valida.', ['status' => 400]);
    $wpdb->update($table, ['status' => $action === 'accept' ? 'accepted' : 'rejected', 'updated_at' => current_time('mysql', true)], ['id' => $request_id], ['%s', '%s'], ['%d']);
    $wpdb->update(mm_social_table('notifications'), ['read_at' => current_time('mysql', true)], ['user_id' => $current, 'dedupe_key' => 'friend_request:' . $request_id], ['%s'], ['%d', '%s']);
    if ($action === 'accept') mm_social_create_notification((int) $row->requester_id, $current, 'friend_accepted', $request_id, [], 'friend_accepted:' . $request_id . ':' . $current);
    return rest_ensure_response(['success' => true, 'action' => $action]);
}

function mm_social_remove_friend(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $other = absint($request->get_param('id'));
    if (!$other || $other === $current) return new WP_Error('mm_social_invalid_user', 'Usuario no valido.', ['status' => 400]);
    [$low, $high] = mm_social_pair($current, $other);
    $removed = $wpdb->delete(mm_social_table('friendships'), ['user_low' => $low, 'user_high' => $high], ['%d', '%d']);
    return rest_ensure_response(['success' => true, 'removed' => (bool) $removed]);
}

function mm_social_search_users(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $query = sanitize_text_field((string) $request->get_param('q'));
    if (strlen($query) < 2) return rest_ensure_response(['success' => true, 'users' => []]);
    $related = $wpdb->get_col($wpdb->prepare(
        "SELECT CASE WHEN user_low=%d THEN user_high ELSE user_low END FROM " . mm_social_table('friendships') . " WHERE (user_low=%d OR user_high=%d) AND status IN ('pending','accepted')",
        $current, $current, $current
    ));
    $users = get_users([
        'number' => 12, 'search' => '*' . $query . '*', 'search_columns' => ['user_login', 'display_name'],
        'exclude' => array_values(array_unique(array_merge([$current], array_map('intval', $related)))),
        'orderby' => 'display_name', 'order' => 'ASC', 'fields' => 'ID',
    ]);
    return rest_ensure_response(['success' => true, 'users' => array_values(array_filter(array_map('mm_social_public_user', $users)))]);
}

function mm_social_message_payload($row, $current) {
    $other = (int) $row->sender_id === (int) $current ? (int) $row->recipient_id : (int) $row->sender_id;
    return [
        'id' => (int) $row->id, 'sender_id' => (int) $row->sender_id, 'recipient_id' => (int) $row->recipient_id,
        'body' => (string) $row->body, 'created_at' => str_replace(' ', 'T', $row->created_at) . 'Z',
        'read_at' => $row->read_at ? str_replace(' ', 'T', $row->read_at) . 'Z' : null,
        'other_user' => mm_social_public_user($other),
    ];
}

function mm_social_get_conversations() {
    global $wpdb;
    $current = get_current_user_id();
    $table = mm_social_table('messages');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT m.* FROM {$table} m INNER JOIN (SELECT MAX(id) last_id FROM {$table} WHERE sender_id=%d OR recipient_id=%d GROUP BY IF(sender_id=%d,recipient_id,sender_id)) latest ON latest.last_id=m.id ORDER BY m.id DESC LIMIT 40",
        $current, $current, $current
    ));
    $unread_rows = $wpdb->get_results($wpdb->prepare("SELECT sender_id,COUNT(*) total FROM {$table} WHERE recipient_id=%d AND read_at IS NULL GROUP BY sender_id", $current));
    $unread = [];
    foreach ($unread_rows as $row) $unread[(int) $row->sender_id] = (int) $row->total;
    $items = [];
    foreach ($rows as $row) {
        $item = mm_social_message_payload($row, $current);
        if (!$item['other_user']) continue;
        $item['unread_count'] = $unread[(int) $item['other_user']['id']] ?? 0;
        $items[] = $item;
    }
    return rest_ensure_response(['success' => true, 'conversations' => $items, 'unread_count' => array_sum($unread)]);
}

function mm_social_get_messages(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $other = absint($request->get_param('id'));
    if (!mm_social_can_chat_with($current, $other)) return new WP_Error('mm_social_chat_forbidden', 'No se puede abrir esta conversación.', ['status' => 403]);
    $before = absint($request->get_param('before')) ?: PHP_INT_MAX;
    $rows = $wpdb->get_results($wpdb->prepare(
        'SELECT * FROM ' . mm_social_table('messages') . ' WHERE ((sender_id=%d AND recipient_id=%d) OR (sender_id=%d AND recipient_id=%d)) AND id<%d ORDER BY id DESC LIMIT 61',
        $current, $other, $other, $current, $before
    ));
    $items = array_reverse(array_map(static function ($row) use ($current) { return mm_social_message_payload($row, $current); }, array_slice($rows, 0, 60)));
    return rest_ensure_response(['success' => true, 'messages' => $items, 'has_more' => count($rows) > 60]);
}

function mm_social_send_message(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $recipient = absint($request->get_param('recipient_id'));
    $body = trim(sanitize_textarea_field((string) $request->get_param('body')));
    if (!mm_social_can_chat_with($current, $recipient)) return new WP_Error('mm_social_chat_forbidden', 'No se puede enviar un mensaje a este usuario.', ['status' => 403]);
    $body_length = function_exists('mb_strlen') ? mb_strlen($body) : strlen($body);
    if ($body === '' || $body_length > 2000) return new WP_Error('mm_social_invalid_message', 'El mensaje debe tener entre 1 y 2000 caracteres.', ['status' => 400]);
    $ok = $wpdb->insert(mm_social_table('messages'), [
        'sender_id' => $current, 'recipient_id' => $recipient, 'body' => $body,
        'created_at' => current_time('mysql', true), 'read_at' => null,
    ], ['%d', '%d', '%s', '%s', '%s']);
    if (!$ok) return new WP_Error('mm_social_database_error', 'No se pudo enviar el mensaje.', ['status' => 500]);
    $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . mm_social_table('messages') . ' WHERE id=%d', $wpdb->insert_id));
    return new WP_REST_Response(['success' => true, 'message' => mm_social_message_payload($row, $current)], 201);
}

function mm_social_mark_messages_read(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $other = absint($request->get_param('user_id'));
    $wpdb->query($wpdb->prepare('UPDATE ' . mm_social_table('messages') . ' SET read_at=%s WHERE sender_id=%d AND recipient_id=%d AND read_at IS NULL', current_time('mysql', true), $other, $current));
    return rest_ensure_response(['success' => true]);
}

function mm_social_get_notifications(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $limit = min(50, max(1, absint($request->get_param('limit')) ?: 25));
    $rows = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . mm_social_table('notifications') . ' WHERE user_id=%d ORDER BY id DESC LIMIT %d', $current, $limit));
    $items = array_map(static function ($row) {
        return [
            'id' => (int) $row->id, 'type' => (string) $row->type, 'entity_id' => (string) $row->entity_id,
            'payload' => json_decode((string) $row->payload, true) ?: [],
            'actor' => $row->actor_id ? mm_social_public_user((int) $row->actor_id) : null,
            'created_at' => str_replace(' ', 'T', $row->created_at) . 'Z', 'read' => !empty($row->read_at),
        ];
    }, $rows);
    $unread = (int) $wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM ' . mm_social_table('notifications') . ' WHERE user_id=%d AND read_at IS NULL', $current));
    return rest_ensure_response(['success' => true, 'notifications' => $items, 'unread_count' => $unread]);
}

function mm_social_mark_notifications_read(WP_REST_Request $request) {
    global $wpdb;
    $where = ['user_id' => get_current_user_id()];
    $format = ['%d'];
    $id = absint($request->get_param('id'));
    if ($id) { $where['id'] = $id; $format[] = '%d'; }
    $wpdb->update(mm_social_table('notifications'), ['read_at' => current_time('mysql', true)], $where, ['%s'], $format);
    return rest_ensure_response(['success' => true]);
}

function mm_social_sync_manga_subscriptions(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $table = mm_social_table('manga_subscriptions');
    $ids = $request->get_param('manga_ids');
    $now = current_time('mysql', true);
    if (is_array($ids)) {
        $ids = array_slice(array_values(array_unique(array_filter(array_map('absint', $ids)))), 0, 1000);
        $wpdb->delete($table, ['user_id' => $current], ['%d']);
        foreach ($ids as $manga_id) $wpdb->replace($table, ['user_id' => $current, 'manga_id' => $manga_id, 'created_at' => $now], ['%d', '%d', '%s']);
        return rest_ensure_response(['success' => true, 'synced' => count($ids)]);
    }
    $manga_id = absint($request->get_param('manga_id'));
    $action = sanitize_key((string) $request->get_param('action'));
    if (!$manga_id || !in_array($action, ['added', 'removed'], true)) return new WP_Error('mm_social_invalid_subscription', 'Datos no validos.', ['status' => 400]);
    if ($action === 'added') $wpdb->replace($table, ['user_id' => $current, 'manga_id' => $manga_id, 'created_at' => $now], ['%d', '%d', '%s']);
    else $wpdb->delete($table, ['user_id' => $current, 'manga_id' => $manga_id], ['%d', '%d']);
    return rest_ensure_response(['success' => true, 'action' => $action]);
}

function mm_social_post_payload($row, $include_shared = true) {
    if (!$row) return null;
    $payload = [
        'id' => (int) $row->id,
        'user_id' => (int) $row->user_id,
        'content' => (string) $row->content,
        'media_id' => $row->media_id ? (int) $row->media_id : null,
        'media_url' => (string) ($row->media_url ?? ''),
        'media_type' => (string) ($row->media_type ?? ''),
        'created_at' => str_replace(' ', 'T', $row->created_at) . 'Z',
        'author' => mm_social_public_user((int) $row->user_id),
    ];
    if (function_exists('mm_interactions_post_data')) $payload += mm_interactions_post_data($row, $include_shared);
    return $payload;
}

function mm_social_posts_for_user($user_id, $limit = 18) {
    global $wpdb;
    $limit = min(30, max(1, absint($limit)));
    $rows = $wpdb->get_results($wpdb->prepare(
        'SELECT * FROM ' . mm_social_table('profile_posts') . " WHERE user_id=%d AND status='published' AND visibility='public' ORDER BY id DESC LIMIT %d",
        absint($user_id), $limit
    ));
    return array_values(array_filter(array_map('mm_social_post_payload', $rows)));
}

function mm_social_get_profile_posts(WP_REST_Request $request) {
    if (function_exists('mm_interactions_viewer')) mm_interactions_viewer($request);
    $user_id = absint($request->get_param('user_id'));
    if (!$user_id) $user_id = get_current_user_id();
    if (!$user_id || !get_userdata($user_id)) {
        return new WP_Error('mm_social_profile_missing', 'Perfil no encontrado.', ['status' => 404]);
    }
    return rest_ensure_response(['success' => true, 'posts' => mm_social_posts_for_user($user_id, $request->get_param('limit'))]);
}

function mm_social_upload_post_media(WP_REST_Request $request) {
    if (empty($_FILES['file']) || !is_array($_FILES['file'])) {
        return new WP_Error('mm_social_media_missing', 'Selecciona una imagen o video.', ['status' => 400]);
    }

    $file = $_FILES['file'];
    if (!empty($file['error'])) return new WP_Error('mm_social_media_upload_error', 'No se pudo recibir el archivo.', ['status' => 400]);
    $checked = wp_check_filetype_and_ext($file['tmp_name'], $file['name']);
    $mime = sanitize_mime_type((string) ($checked['type'] ?? ''));
    $is_image = strpos($mime, 'image/') === 0;
    $is_video = strpos($mime, 'video/') === 0;
    if (!$is_image && !$is_video) return new WP_Error('mm_social_media_invalid', 'Solo se permiten imágenes o videos.', ['status' => 415]);

    $maximum = $is_video ? 80 * MB_IN_BYTES : 15 * MB_IN_BYTES;
    if ((int) $file['size'] <= 0 || (int) $file['size'] > $maximum) {
        return new WP_Error('mm_social_media_too_large', $is_video ? 'El video supera 80 MB.' : 'La imagen supera 15 MB.', ['status' => 413]);
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $attachment_id = media_handle_upload('file', 0, ['post_author' => get_current_user_id()], ['test_form' => false]);
    if (is_wp_error($attachment_id)) return new WP_Error('mm_social_media_upload_error', $attachment_id->get_error_message(), ['status' => 500]);
    wp_update_post(['ID' => $attachment_id, 'post_author' => get_current_user_id()]);

    return new WP_REST_Response([
        'success' => true,
        'media' => [
            'id' => (int) $attachment_id,
            'url' => (string) wp_get_attachment_url($attachment_id),
            'type' => $is_video ? 'video' : 'image',
        ],
    ], 201);
}

function mm_social_create_profile_post(WP_REST_Request $request) {
    global $wpdb;
    $current = get_current_user_id();
    $content = trim(sanitize_textarea_field((string) $request->get_param('content')));
    $media_id = absint($request->get_param('media_id'));
    $length = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
    if ($length > 3000) return new WP_Error('mm_social_post_too_long', 'La publicación supera 3000 caracteres.', ['status' => 400]);

    $media_url = '';
    $media_type = '';
    if ($media_id) {
        $attachment = get_post($media_id);
        if (!$attachment || $attachment->post_type !== 'attachment' || (int) $attachment->post_author !== $current) {
            return new WP_Error('mm_social_media_forbidden', 'El archivo no pertenece a tu perfil.', ['status' => 403]);
        }
        $mime = (string) get_post_mime_type($media_id);
        $media_type = strpos($mime, 'video/') === 0 ? 'video' : (strpos($mime, 'image/') === 0 ? 'image' : '');
        if ($media_type === '') return new WP_Error('mm_social_media_invalid', 'Archivo no válido.', ['status' => 415]);
        $media_url = (string) wp_get_attachment_url($media_id);
    }
    if ($content === '' && !$media_id) return new WP_Error('mm_social_post_empty', 'Escribe algo o selecciona un archivo.', ['status' => 400]);

    $now = current_time('mysql', true);
    $ok = $wpdb->insert(mm_social_table('profile_posts'), [
        'user_id' => $current,
        'content' => $content,
        'media_id' => $media_id ?: null,
        'media_url' => $media_url,
        'media_type' => $media_type,
        'visibility' => 'public',
        'status' => 'published',
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%d', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s']);
    if (!$ok) return new WP_Error('mm_social_database_error', 'No se pudo guardar la publicación.', ['status' => 500]);
    $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . mm_social_table('profile_posts') . ' WHERE id=%d', $wpdb->insert_id));
    return new WP_REST_Response(['success' => true, 'post' => mm_social_post_payload($row)], 201);
}

function mm_social_delete_profile_post(WP_REST_Request $request) {
    global $wpdb;
    $id = absint($request->get_param('id'));
    $table = mm_social_table('profile_posts');
    $row = $wpdb->get_row($wpdb->prepare('SELECT id,user_id FROM ' . $table . ' WHERE id=%d', $id));
    if (!$row || (int) $row->user_id !== get_current_user_id()) return new WP_Error('mm_social_post_missing', 'Publicación no encontrada.', ['status' => 404]);
    $wpdb->update($table, ['status' => 'deleted', 'updated_at' => current_time('mysql', true)], ['id' => $id], ['%s', '%s'], ['%d']);
    return rest_ensure_response(['success' => true]);
}

add_filter('upload_mimes', static function ($mimes) {
    $mimes['webm'] = 'video/webm';
    return $mimes;
});

add_action('post_updated', static function ($post_id, $after, $before) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id) || $after->post_type !== 'manga' || $after->post_status !== 'publish' || $after->post_modified_gmt === $before->post_modified_gmt) return;
    global $wpdb;
    $subscribers = $wpdb->get_col($wpdb->prepare('SELECT user_id FROM ' . mm_social_table('manga_subscriptions') . ' WHERE manga_id=%d', $post_id));
    foreach ($subscribers as $user_id) {
        mm_social_create_notification((int) $user_id, 0, 'manga_update', $post_id, ['manga_id' => (int) $post_id, 'title' => get_the_title($post_id), 'cover' => mm_social_series_cover($post_id)], 'manga_update:' . $post_id . ':' . $after->post_modified_gmt . ':' . (int) $user_id);
    }
}, 10, 3);

/* ── Capítulo nuevo y manga nuevo ─────────────────────────────────────────────
   Los capítulos son `post` con meta ero_seri (id de la serie, CPT `manga`). Se
   avisa una sola vez por capítulo/serie (meta de control) y se comprueba tanto
   en save_post como al escribirse ero_seri, porque el tema guarda esa meta
   después de publicar. */

function mm_social_series_cover($series_id) {
    $url = get_the_post_thumbnail_url((int) $series_id, 'medium');
    return $url ? set_url_scheme($url, 'https') : '';
}

function mm_social_chapter_image($chapter_id) {
    if (function_exists('mm_chapter_cover_url')) {
        $url = mm_chapter_cover_url($chapter_id);
        if ($url) return $url;
    }
    $url = get_the_post_thumbnail_url((int) $chapter_id, 'medium_large');
    return $url ? set_url_scheme($url, 'https') : '';
}

/** Aviso a los suscriptores de la serie cuando un capítulo queda publicado. */
function mm_social_maybe_notify_chapter($post_id) {
    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'post' || $post->post_status !== 'publish') return;
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
    if (get_post_meta($post_id, '_mm_chapter_notified', true)) return;
    $series_id = absint(get_post_meta($post_id, 'ero_seri', true));
    if (!$series_id) return;
    $series = get_post($series_id);
    if (!$series || $series->post_status !== 'publish') return;
    update_post_meta($post_id, '_mm_chapter_notified', current_time('mysql', true));

    global $wpdb;
    $subscribers = $wpdb->get_col($wpdb->prepare('SELECT user_id FROM ' . mm_social_table('manga_subscriptions') . ' WHERE manga_id=%d', $series_id));
    if (!$subscribers) return;
    $sell = function_exists('mmfix_sell_info') ? mmfix_sell_info($post_id) : ['is_paid' => false, 'price' => 0];
    $payload = [
        'manga_id' => (int) $series_id,
        'title' => get_the_title($series_id),
        'chapter_id' => (int) $post_id,
        'chapter_number' => (float) get_post_meta($post_id, 'ero_chapter', true),
        'chapter_title' => get_the_title($post_id),
        'image' => mm_social_chapter_image($post_id),
        'cover' => mm_social_series_cover($series_id),
        'is_paid' => !empty($sell['is_paid']),
        'price' => (int) ($sell['price'] ?? 0),
    ];
    foreach ($subscribers as $user_id) {
        mm_social_create_notification((int) $user_id, 0, 'chapter_new', $post_id, $payload, 'chapter_new:' . $post_id . ':' . (int) $user_id);
    }
}
add_action('save_post', 'mm_social_maybe_notify_chapter', 99);
add_action('added_post_meta', static function ($meta_id, $post_id, $key) { if ($key === 'ero_seri') mm_social_maybe_notify_chapter($post_id); }, 10, 3);
add_action('updated_post_meta', static function ($meta_id, $post_id, $key) { if ($key === 'ero_seri') mm_social_maybe_notify_chapter($post_id); }, 10, 3);

/** Aviso a todos los lectores cuando se publica una serie nueva (una fila por usuario, en una sola consulta). */
function mm_social_maybe_notify_new_manga($post_id) {
    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'manga' || $post->post_status !== 'publish') return;
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
    if (get_post_meta($post_id, '_mm_manga_notified', true)) return;
    update_post_meta($post_id, '_mm_manga_notified', current_time('mysql', true));

    global $wpdb;
    $table = mm_social_table('notifications');
    $payload = wp_json_encode(['manga_id' => (int) $post_id, 'title' => get_the_title($post_id), 'cover' => mm_social_series_cover($post_id)]);
    $wpdb->query($wpdb->prepare(
        "INSERT IGNORE INTO {$table} (user_id, actor_id, type, entity_id, payload, dedupe_key, created_at, read_at)
         SELECT ID, NULL, 'manga_new', %s, %s, CONCAT('manga_new:', %d, ':', ID), %s, NULL FROM {$wpdb->users}",
        (string) $post_id, $payload, (int) $post_id, current_time('mysql', true)
    ));
    // Los avisos masivos caducan: se limpian los de más de 60 días para que la tabla no crezca sin freno.
    $wpdb->query($wpdb->prepare("DELETE FROM {$table} WHERE type IN ('manga_new','chapter_new','manga_update') AND created_at < %s", gmdate('Y-m-d H:i:s', time() - 60 * DAY_IN_SECONDS)));
}
add_action('save_post', 'mm_social_maybe_notify_new_manga', 99);

function mm_social_response_data($response) {
    if (is_wp_error($response)) return [];
    $data = rest_ensure_response($response)->get_data();
    return is_array($data) ? $data : [];
}

function mm_social_record_comment($comment, $fallback_manga_id = '') {
    if (!is_array($comment)) return;
    $id = absint($comment['id'] ?? 0);
    $user_id = absint($comment['user_id'] ?? 0);
    if (!$id || !$user_id) return;
    global $wpdb;
    $wpdb->replace(mm_social_table('comment_refs'), [
        'comment_id' => $id, 'user_id' => $user_id,
        'manga_id' => sanitize_text_field((string) ($comment['manga_id'] ?? $fallback_manga_id)),
        'updated_at' => current_time('mysql', true),
    ], ['%d', '%d', '%s', '%s']);
}

function mm_social_notify_comment_reaction(WP_REST_Request $request) {
    $comment_id = absint($request->get_param('comment_id'));
    $reaction = sanitize_key((string) $request->get_param('reaction'));
    $active = filter_var($request->get_param('active'), FILTER_VALIDATE_BOOLEAN);
    $allowed = ['fire', 'love', 'haha', 'sad'];
    if (!$comment_id || ($active && !in_array($reaction, $allowed, true))) {
        return new WP_Error('mm_social_invalid_reaction', 'Reaccion no valida.', ['status' => 400]);
    }

    global $wpdb;
    $reference = $wpdb->get_row($wpdb->prepare(
        'SELECT user_id,manga_id FROM ' . mm_social_table('comment_refs') . ' WHERE comment_id=%d',
        $comment_id
    ));
    $owner = $reference ? (int) $reference->user_id : 0;
    $manga_id = $reference ? (string) $reference->manga_id : '';
    if (!$owner) {
        $comment = get_comment($comment_id);
        if ($comment) $owner = (int) $comment->user_id;
    }

    $actor = get_current_user_id();
    $dedupe = 'comment_reaction:' . $comment_id . ':' . $actor;
    if ($active && $owner) {
        mm_social_create_notification($owner, $actor, 'comment_reaction', $comment_id, [
            'comment_id' => $comment_id,
            'manga_id' => $manga_id,
            'reaction' => $reaction,
        ], $dedupe);
    } else {
        $wpdb->delete(mm_social_table('notifications'), ['dedupe_key' => $dedupe], ['%s']);
    }

    return rest_ensure_response(['success' => true, 'active' => $active, 'reaction' => $active ? $reaction : '']);
}

add_filter('rest_request_after_callbacks', static function ($response, $handler, $request) {
    if (!$request instanceof WP_REST_Request || is_wp_error($response)) return $response;
    $route = $request->get_route();
    $method = strtoupper($request->get_method());
    $data = mm_social_response_data($response);

    if ($route === '/mangamukai/v1/profile' && $method === 'GET' && get_current_user_id()) {
        $user = get_userdata(get_current_user_id());
        $profile_meta = mm_social_profile_meta(get_current_user_id());
        $data['success'] = true;
        $data['profile'] = [
            'username' => (string) ($data['username'] ?? ($user->display_name ?: $user->user_login)),
            'bio' => (string) ($data['bio'] ?? $profile_meta['bio']),
            'location' => (string) ($data['location'] ?? $profile_meta['location']),
            'avatar_url' => (string) ($data['avatar_url'] ?? $profile_meta['avatar_url']),
            'banner_url' => (string) ($data['banner_url'] ?? $profile_meta['banner_url']),
            'banner_color' => (string) ($data['banner_color'] ?? $profile_meta['banner_color']),
            'is_pro' => (bool) get_user_meta(get_current_user_id(), 'mm_is_pro', true),
            'created_at' => (string) ($data['created_at'] ?? $user->user_registered),
            'birth_date' => $profile_meta['birth_date'],
            'country_code' => $profile_meta['country_code'],
            'phone' => $profile_meta['phone'],
            'show_birth_date' => $profile_meta['show_birth_date'],
            'show_phone' => $profile_meta['show_phone'],
            'social_links' => array_merge([
                'facebook' => '', 'twitter' => '', 'instagram' => '', 'discord' => '',
                'whatsapp' => '', 'telegram' => '', 'youtube' => '', 'github' => '',
            ], is_array($data['social_links'] ?? null) ? $data['social_links'] : $profile_meta['social_links']),
        ];
        $response = rest_ensure_response($response);
        $response->set_data($data);
    }
    if ($route === '/mangamukai/v1/profile' && $method === 'POST' && get_current_user_id()) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) $payload = [];
        $profile = mm_social_profile_meta(get_current_user_id());
        if (array_key_exists('bio', $payload)) $profile['bio'] = sanitize_textarea_field((string) $payload['bio']);
        if (array_key_exists('location', $payload)) $profile['location'] = sanitize_text_field((string) $payload['location']);
        if (array_key_exists('avatar_url', $payload)) $profile['avatar_url'] = esc_url_raw((string) $payload['avatar_url']);
        if (array_key_exists('banner_url', $payload)) $profile['banner_url'] = esc_url_raw((string) $payload['banner_url']);
        if (array_key_exists('banner_color', $payload)) $profile['banner_color'] = sanitize_text_field((string) $payload['banner_color']);
        if (array_key_exists('birth_date', $payload)) {
            $birth_date = sanitize_text_field((string) $payload['birth_date']);
            if ($birth_date !== '' && (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $birth_date, $parts) || !checkdate((int) ($parts[2] ?? 0), (int) ($parts[3] ?? 0), (int) ($parts[1] ?? 0)) || $birth_date > gmdate('Y-m-d'))) {
                $birth_date = '';
            }
            $profile['birth_date'] = $birth_date;
            update_user_meta(get_current_user_id(), 'mm_birth_date', $birth_date);
        }
        if (array_key_exists('country_code', $payload)) {
            $country_code = sanitize_text_field((string) $payload['country_code']);
            $profile['country_code'] = preg_match('/^\+\d{1,4}$/', $country_code) ? $country_code : '';
            update_user_meta(get_current_user_id(), 'mm_country_code', $profile['country_code']);
        }
        if (array_key_exists('phone', $payload)) {
            $phone = preg_replace('/\D+/', '', (string) $payload['phone']);
            $profile['phone'] = strlen($phone) >= 6 && strlen($phone) <= 15 ? $phone : '';
            update_user_meta(get_current_user_id(), 'mm_phone', $profile['phone']);
            update_user_meta(get_current_user_id(), 'mm_phone_e164', $profile['country_code'] . $profile['phone']);
        }
        if (array_key_exists('show_birth_date', $payload)) $profile['show_birth_date'] = filter_var($payload['show_birth_date'], FILTER_VALIDATE_BOOLEAN);
        if (array_key_exists('show_phone', $payload)) $profile['show_phone'] = filter_var($payload['show_phone'], FILTER_VALIDATE_BOOLEAN);
        if (isset($payload['social_links']) && is_array($payload['social_links'])) {
            $profile['social_links'] = array_map('sanitize_text_field', $payload['social_links']);
        }
        update_user_meta(get_current_user_id(), 'mm_social_profile', $profile);
    }
    if ($route === '/mangamukai/v1/profile/image' && $method === 'POST' && get_current_user_id() && !empty($data['url'])) {
        $profile = mm_social_profile_meta(get_current_user_id());
        $type = sanitize_key((string) $request->get_param('type'));
        if ($type === 'avatar') $profile['avatar_url'] = esc_url_raw($data['url']);
        if ($type === 'banner') $profile['banner_url'] = esc_url_raw($data['url']);
        update_user_meta(get_current_user_id(), 'mm_social_profile', $profile);
    }
    if ($route === '/mangamukai/v1/comments') {
        $comments = $data['comments'] ?? ($data['comment'] ?? $data);
        if (is_array($comments) && isset($comments['id'])) $comments = [$comments];
        if (is_array($comments)) foreach ($comments as $comment) mm_social_record_comment($comment, $request->get_param('manga_id'));
        if ($method === 'POST' && get_current_user_id() && is_array($comments) && !empty($comments[0])) {
            global $wpdb;
            $posted = $comments[0];
            $payload = $request->get_json_params();
            if (!is_array($payload)) $payload = [];
            $parent_id = absint($posted['parent_id'] ?? ($payload['parent_id'] ?? 0));
            $comment_id = absint($posted['id'] ?? 0);
            if ($parent_id && $comment_id) {
                $parent_ref = $wpdb->get_row($wpdb->prepare(
                    'SELECT user_id,manga_id FROM ' . mm_social_table('comment_refs') . ' WHERE comment_id=%d',
                    $parent_id
                ));
                $owner = $parent_ref ? (int) $parent_ref->user_id : 0;
                if (!$owner) { $parent_comment = get_comment($parent_id); if ($parent_comment) $owner = (int) $parent_comment->user_id; }
                $manga_id = (string) ($posted['manga_id'] ?? ($payload['manga_id'] ?? ($parent_ref->manga_id ?? '')));
                if ($owner) mm_social_create_notification($owner, get_current_user_id(), 'comment_reply', $comment_id, [
                    'comment_id' => $comment_id,
                    'parent_comment_id' => $parent_id,
                    'manga_id' => $manga_id,
                ], 'comment_reply:' . $comment_id);
            }
        }
    }
    if ($route === '/mangamukai/v1/comments/like' && $method === 'POST' && get_current_user_id() && !empty($data['success'])) {
        global $wpdb;
        $comment_id = absint($request->get_param('comment_id'));
        $reference = $wpdb->get_row($wpdb->prepare('SELECT user_id,manga_id FROM ' . mm_social_table('comment_refs') . ' WHERE comment_id=%d', $comment_id));
        $owner = $reference ? (int) $reference->user_id : 0;
        $manga_id = $reference ? (string) $reference->manga_id : '';
        if (!$owner) { $comment = get_comment($comment_id); if ($comment) $owner = (int) $comment->user_id; }
        $action = sanitize_key((string) ($data['action'] ?? 'liked'));
        $liked = isset($data['liked']) ? (bool) $data['liked'] : !in_array($action, ['removed', 'unliked'], true);
        $dedupe = 'comment_like:' . $comment_id . ':' . get_current_user_id();
        if ($liked && $owner) mm_social_create_notification($owner, get_current_user_id(), 'comment_like', $comment_id, ['comment_id' => $comment_id, 'manga_id' => $manga_id], $dedupe);
        elseif (!$liked) $wpdb->delete(mm_social_table('notifications'), ['dedupe_key' => $dedupe], ['%s']);
    }
    return $response;
}, 20, 3);

add_action('rest_api_init', static function () {
    $auth = 'mm_social_auth_permission';
    register_rest_route('mangamukai/v1', '/social/profile/(?P<id>\d+)', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_public_profile', 'permission_callback' => '__return_true']);
    register_rest_route('mangamukai/v1', '/friends', ['methods' => WP_REST_Server::READABLE, 'callback' => static function () { return rest_ensure_response(mm_social_friends_overview()); }, 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/friends/search', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_search_users', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/friends/request', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_send_friend_request', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/friends/respond', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_respond_friend_request', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/friends/(?P<id>\d+)', ['methods' => WP_REST_Server::DELETABLE, 'callback' => 'mm_social_remove_friend', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/follow', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_follow_user', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/follow/(?P<id>\d+)', ['methods' => WP_REST_Server::DELETABLE, 'callback' => 'mm_social_unfollow_user', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/follows', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_follows', 'permission_callback' => '__return_true']);
    register_rest_route('mangamukai/v1', '/social/reads', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_record_manga_read', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/library', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_library', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/reading-progress', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_record_chapter_progress', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/users/search', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_search_all_users', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/messages/conversations', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_conversations', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/messages/read', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_mark_messages_read', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/messages/(?P<id>\d+)', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_messages', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/messages', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_send_message', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/notifications', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_notifications', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/notifications/read', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_mark_notifications_read', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/comments/reaction', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_notify_comment_reaction', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/manga-subscriptions', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_sync_manga_subscriptions', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/posts', [
        ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_social_get_profile_posts', 'permission_callback' => '__return_true'],
        ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_create_profile_post', 'permission_callback' => $auth],
    ]);
    register_rest_route('mangamukai/v1', '/social/posts/media', ['methods' => WP_REST_Server::CREATABLE, 'callback' => 'mm_social_upload_post_media', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/social/posts/(?P<id>\d+)', ['methods' => WP_REST_Server::DELETABLE, 'callback' => 'mm_social_delete_profile_post', 'permission_callback' => $auth]);
});
