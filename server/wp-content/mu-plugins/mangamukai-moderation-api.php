<?php
/**
 * Plugin Name: MangaMukai Moderation API
 * Description: Lectura de los mensajes privados entre usuarios, solo para administradores, para prevenir fraudes y delitos. La consume la herramienta local tools/moderacion-mensajes del repositorio. Solo lectura: no modifica ni borra nada.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

function mm_mod_messages_table(): string {
    global $wpdb;
    return $wpdb->prefix . 'mm_messages';
}

function mm_mod_request_user(WP_REST_Request $request): ?WP_User {
    $user = function_exists('mm_get_request_user') ? mm_get_request_user($request) : null;
    if (!($user instanceof WP_User) || !$user->ID) {
        $current = wp_get_current_user();
        $user = ($current instanceof WP_User && $current->ID) ? $current : null;
    }
    return $user;
}

/**
 * Clave compartida con la herramienta local. Vive en
 * server/wp-content/mu-plugins/mangamukai-moderation-key.php (fuera de git; la
 * genera la propia herramienta y se publica con npm run deploy).
 */
function mm_mod_shared_key(): string {
    return (defined('MM_MODERATION_KEY') && is_string(MM_MODERATION_KEY)) ? MM_MODERATION_KEY : '';
}

function mm_mod_key_matches(WP_REST_Request $request): bool {
    $expected = mm_mod_shared_key();
    $provided = trim((string) $request->get_header('X-MM-Moderation-Key'));
    return strlen($expected) >= 32 && $provided !== '' && hash_equals($expected, $provided);
}

function mm_mod_permission(WP_REST_Request $request) {
    if (mm_mod_key_matches($request)) return true;

    // Alternativa: alguien con permisos de administracion ya autenticado en el sitio.
    $user = mm_mod_request_user($request);
    if (!$user) return new WP_Error('mm_mod_unauthorized', 'Clave de supervision no valida.', ['status' => 401]);
    if (!user_can($user, 'manage_options')) {
        return new WP_Error('mm_mod_forbidden', 'Sin permiso para supervisar mensajes.', ['status' => 403]);
    }
    wp_set_current_user((int) $user->ID);
    return true;
}

function mm_mod_normalize(string $text): string {
    $text = remove_accents($text);
    return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
}

/** Palabras que conviene revisar (fraude, datos de pago, contacto fuera de la web, menores...). */
function mm_mod_keywords(): array {
    $defaults = [
        'transferencia', 'bizum', 'paypal', 'tarjeta', 'cvv', 'contrasena', 'clave', 'codigo', 'verificacion',
        'premio', 'ganaste', 'sorteo', 'inversion', 'cripto', 'bitcoin', 'usdt', 'prestamo', 'dinero', 'pago',
        'whatsapp', 'telegram', 'discord', 'numero', 'direccion', 'menor', 'edad', 'anos', 'fotos', 'desnud',
        'nudes', 'sexo', 'pack', 'onlyfans', 'amenaza', 'matar', 'suicid', 'droga', 'hack', 'cuenta robada',
        'gratis', 'oferta', 'urgente', 'regalo', 'monedas gratis',
    ];
    $keywords = apply_filters('mm_moderation_keywords', $defaults);
    $clean = [];
    foreach ((array) $keywords as $keyword) {
        $keyword = trim((string) $keyword);
        if ($keyword !== '') $clean[mm_mod_normalize($keyword)] = $keyword;
    }
    return $clean;
}

function mm_mod_flags(string $body): array {
    $flags = [];
    $normalized = mm_mod_normalize($body);
    foreach (mm_mod_keywords() as $needle => $label) {
        if ($needle !== '' && strpos($normalized, $needle) !== false) $flags[] = $label;
    }
    if (preg_match('~https?://|www\.|\.(com|net|org|xyz|io|me|link|app|gg)\b~i', $body)) $flags[] = 'enlace';
    if (preg_match('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', $body)) $flags[] = 'correo';
    if (preg_match('/(?:\d[\s.-]?){13,19}/', $body)) $flags[] = 'posible tarjeta';
    elseif (preg_match('/(?:\+?\d[\s.-]?){8,15}/', $body)) $flags[] = 'telefono';
    return array_values(array_unique($flags));
}

function mm_mod_missing_user(int $user_id): array {
    return [
        'id' => $user_id, 'username' => 'Usuario eliminado (#' . $user_id . ')', 'login' => '', 'email' => '',
        'avatar' => '', 'registered' => null, 'roles' => [], 'profile_url' => '',
    ];
}

function mm_mod_user(int $user_id): ?array {
    static $cache = [];
    if (array_key_exists($user_id, $cache)) return $cache[$user_id];
    $user = get_userdata($user_id);
    if (!$user) {
        $cache[$user_id] = null;
        return null;
    }
    $avatar = get_user_meta($user_id, 'mm_profile_avatar_url', true) ?: get_user_meta($user_id, 'mm_avatar_url', true);
    $cache[$user_id] = [
        'id'          => (int) $user->ID,
        'username'    => (string) ($user->display_name ?: $user->user_login),
        'login'       => (string) $user->user_login,
        'email'       => (string) $user->user_email,
        'avatar'      => $avatar ? esc_url_raw((string) $avatar) : (string) get_avatar_url($user->ID, ['size' => 96]),
        'registered'  => str_replace(' ', 'T', (string) $user->user_registered) . 'Z',
        'roles'       => array_values((array) $user->roles),
        'profile_url' => admin_url('user-edit.php?user_id=' . (int) $user->ID),
    ];
    return $cache[$user_id];
}

function mm_mod_utc(string $value): string {
    return str_replace(' ', 'T', $value) . 'Z';
}

function mm_mod_message_payload($row): array {
    $sender_id = (int) $row->sender_id;
    $recipient_id = (int) $row->recipient_id;
    return [
        'id'         => (int) $row->id,
        'body'       => (string) $row->body,
        'created_at' => mm_mod_utc((string) $row->created_at),
        'read_at'    => $row->read_at ? mm_mod_utc((string) $row->read_at) : null,
        'sender'     => mm_mod_user($sender_id) ?: mm_mod_missing_user($sender_id),
        'recipient'  => mm_mod_user($recipient_id) ?: mm_mod_missing_user($recipient_id),
        'flags'      => mm_mod_flags((string) $row->body),
    ];
}

function mm_mod_datetime_param($value, bool $end_of_day): ?string {
    $value = trim((string) $value);
    if ($value === '') return null;
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) $value .= $end_of_day ? ' 23:59:59' : ' 00:00:00';
    $has_zone = (bool) preg_match('/(Z|[+-]\d{2}:?\d{2})$/', $value);
    $timestamp = strtotime($has_zone ? $value : $value . ' UTC');
    return $timestamp ? gmdate('Y-m-d H:i:s', $timestamp) : null;
}

/** Devuelve [fragmento WHERE con placeholders, parametros] para wpdb::prepare. */
function mm_mod_message_filters(WP_REST_Request $request): array {
    global $wpdb;
    $where = [];
    $params = [];

    $user = absint($request->get_param('user'));
    if ($user) { $where[] = '(sender_id = %d OR recipient_id = %d)'; $params[] = $user; $params[] = $user; }
    $sender = absint($request->get_param('sender'));
    if ($sender) { $where[] = 'sender_id = %d'; $params[] = $sender; }
    $recipient = absint($request->get_param('recipient'));
    if ($recipient) { $where[] = 'recipient_id = %d'; $params[] = $recipient; }
    $q = trim((string) $request->get_param('q'));
    if ($q !== '') { $where[] = 'body LIKE %s'; $params[] = '%' . $wpdb->esc_like($q) . '%'; }
    $since = mm_mod_datetime_param($request->get_param('since'), false);
    if ($since) { $where[] = 'created_at >= %s'; $params[] = $since; }
    $until = mm_mod_datetime_param($request->get_param('until'), true);
    if ($until) { $where[] = 'created_at <= %s'; $params[] = $until; }

    return [$where ? implode(' AND ', $where) : '1=1', $params];
}

function mm_mod_response(array $data) {
    $response = rest_ensure_response($data);
    $response->header('Cache-Control', 'no-store, private');
    return $response;
}

function mm_mod_table_exists(): bool {
    global $wpdb;
    $table = mm_mod_messages_table();
    return $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
}

function mm_mod_get_overview(WP_REST_Request $request) {
    global $wpdb;
    $table = mm_mod_messages_table();
    $keywords = array_values(mm_mod_keywords());
    $viewer = mm_mod_user(get_current_user_id());

    if (!mm_mod_table_exists()) {
        return mm_mod_response([
            'success' => true, 'table' => false, 'keywords' => $keywords, 'viewer' => $viewer, 'server_time' => gmdate('c'),
            'totals' => ['messages' => 0, 'last_24h' => 0, 'last_7d' => 0, 'conversations' => 0, 'senders' => 0, 'unread' => 0],
        ]);
    }

    $totals = [
        'messages'      => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}"),
        'last_24h'      => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE created_at >= %s", gmdate('Y-m-d H:i:s', time() - DAY_IN_SECONDS))),
        'last_7d'       => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE created_at >= %s", gmdate('Y-m-d H:i:s', time() - WEEK_IN_SECONDS))),
        'conversations' => (int) $wpdb->get_var("SELECT COUNT(*) FROM (SELECT 1 FROM {$table} GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) AS pairs"),
        'senders'       => (int) $wpdb->get_var("SELECT COUNT(DISTINCT sender_id) FROM {$table}"),
        'unread'        => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE read_at IS NULL"),
    ];

    return mm_mod_response([
        'success' => true, 'table' => true, 'totals' => $totals, 'keywords' => $keywords,
        'viewer' => $viewer, 'auth' => get_current_user_id() ? 'admin' : 'key', 'server_time' => gmdate('c'),
    ]);
}

/**
 * Mensajes mas recientes primero, con cursor (before_id). Con flagged=1 solo devuelve
 * los que tienen alguna senal, recorriendo lotes hasta reunir per_page o agotar el limite.
 */
function mm_mod_get_messages(WP_REST_Request $request) {
    global $wpdb;
    if (!mm_mod_table_exists()) {
        return mm_mod_response(['success' => true, 'messages' => [], 'total' => 0, 'next_before_id' => null, 'scanned' => 0]);
    }

    $table = mm_mod_messages_table();
    $per_page = min(200, max(1, absint($request->get_param('per_page')) ?: 50));
    $flagged_only = rest_sanitize_boolean($request->get_param('flagged'));
    [$where, $params] = mm_mod_message_filters($request);

    $count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where}";
    $total = (int) ($params ? $wpdb->get_var($wpdb->prepare($count_sql, $params)) : $wpdb->get_var($count_sql));

    $messages = [];
    $next_before = null;
    $scanned = 0;
    $cursor = absint($request->get_param('before_id'));
    $batch = $flagged_only ? 500 : $per_page;
    $max_scan = $flagged_only ? 5000 : $per_page;

    while ($scanned < $max_scan && count($messages) < $per_page) {
        $args = $params;
        $sql = "SELECT * FROM {$table} WHERE {$where}";
        if ($cursor) {
            $sql .= ' AND id < %d';
            $args[] = $cursor;
        }
        $sql .= ' ORDER BY id DESC LIMIT %d';
        $args[] = $batch + 1;

        $rows = $wpdb->get_results($wpdb->prepare($sql, $args));
        if (!$rows) break;
        $has_more = count($rows) > $batch;
        $rows = array_slice($rows, 0, $batch);

        foreach ($rows as $row) {
            $scanned++;
            $cursor = (int) $row->id;
            $payload = mm_mod_message_payload($row);
            if ($flagged_only && empty($payload['flags'])) continue;
            $messages[] = $payload;
            if (count($messages) >= $per_page) break;
        }

        if (count($messages) >= $per_page) {
            $next_before = $cursor;
            break;
        }
        if (!$has_more) break;
        // Lote agotado sin llenar la pagina: seguir desde el ultimo id visto.
        $next_before = $cursor;
    }

    if ($scanned >= $max_scan && count($messages) < $per_page) $next_before = $cursor;

    return mm_mod_response([
        'success' => true, 'messages' => $messages, 'total' => $total,
        'next_before_id' => $next_before, 'scanned' => $scanned, 'flagged_only' => $flagged_only,
    ]);
}

function mm_mod_get_conversations(WP_REST_Request $request) {
    global $wpdb;
    if (!mm_mod_table_exists()) {
        return mm_mod_response(['success' => true, 'conversations' => [], 'total' => 0, 'page' => 1, 'per_page' => 40, 'total_pages' => 0]);
    }

    $table = mm_mod_messages_table();
    $per_page = min(100, max(1, absint($request->get_param('per_page')) ?: 40));
    $page = max(1, absint($request->get_param('page')) ?: 1);
    $user = absint($request->get_param('user'));

    $where = $user ? $wpdb->prepare('WHERE sender_id = %d OR recipient_id = %d', $user, $user) : '';
    $group = "SELECT LEAST(sender_id, recipient_id) AS user_a, GREATEST(sender_id, recipient_id) AS user_b, COUNT(*) AS total, MAX(id) AS last_id, MIN(created_at) AS first_at, MAX(created_at) AS last_at FROM {$table} {$where} GROUP BY user_a, user_b";
    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM ({$group}) AS pairs");
    $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM ({$group}) AS pairs ORDER BY last_id DESC LIMIT %d OFFSET %d", $per_page, ($page - 1) * $per_page));

    $last_messages = [];
    $last_ids = array_map(static function ($row) { return (int) $row->last_id; }, $rows ?: []);
    if ($last_ids) {
        $placeholders = implode(',', array_fill(0, count($last_ids), '%d'));
        $found = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table} WHERE id IN ({$placeholders})", $last_ids));
        foreach ($found ?: [] as $message) $last_messages[(int) $message->id] = $message;
    }

    $items = [];
    foreach ($rows ?: [] as $row) {
        $last = $last_messages[(int) $row->last_id] ?? null;
        $items[] = [
            'user_a'       => mm_mod_user((int) $row->user_a) ?: mm_mod_missing_user((int) $row->user_a),
            'user_b'       => mm_mod_user((int) $row->user_b) ?: mm_mod_missing_user((int) $row->user_b),
            'total'        => (int) $row->total,
            'first_at'     => mm_mod_utc((string) $row->first_at),
            'last_at'      => mm_mod_utc((string) $row->last_at),
            'last_message' => $last ? mm_mod_message_payload($last) : null,
        ];
    }

    return mm_mod_response([
        'success' => true, 'conversations' => $items, 'total' => $total,
        'page' => $page, 'per_page' => $per_page, 'total_pages' => (int) ceil($total / $per_page),
    ]);
}

function mm_mod_get_thread(WP_REST_Request $request) {
    global $wpdb;
    $a = absint($request->get_param('a'));
    $b = absint($request->get_param('b'));
    if (!$a || !$b) return new WP_Error('mm_mod_invalid', 'Faltan los usuarios de la conversacion.', ['status' => 400]);
    if (!mm_mod_table_exists()) return mm_mod_response(['success' => true, 'messages' => [], 'has_more' => false, 'users' => []]);

    $table = mm_mod_messages_table();
    $limit = min(300, max(1, absint($request->get_param('limit')) ?: 100));
    $before = absint($request->get_param('before')) ?: PHP_INT_MAX;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} WHERE ((sender_id = %d AND recipient_id = %d) OR (sender_id = %d AND recipient_id = %d)) AND id < %d ORDER BY id DESC LIMIT %d",
        $a, $b, $b, $a, $before, $limit + 1
    ));
    $has_more = count($rows ?: []) > $limit;
    $rows = array_slice($rows ?: [], 0, $limit);
    $messages = array_reverse(array_map('mm_mod_message_payload', $rows));

    return mm_mod_response([
        'success' => true, 'messages' => $messages, 'has_more' => $has_more,
        'users' => [mm_mod_user($a) ?: mm_mod_missing_user($a), mm_mod_user($b) ?: mm_mod_missing_user($b)],
    ]);
}

/* -------------------------------------------------------------------------
 * Usuarios: ficha completa (foto, portada, datos de perfil, actividad)
 * ---------------------------------------------------------------------- */

function mm_mod_table(string $suffix): string {
    global $wpdb;
    return $wpdb->prefix . 'mm_' . $suffix;
}

function mm_mod_has_table(string $table): bool {
    static $cache = [];
    if (!array_key_exists($table, $cache)) {
        global $wpdb;
        $cache[$table] = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
    }
    return $cache[$table];
}

function mm_mod_decode_links($raw): array {
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        $raw = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($raw)) return [];
    $links = [];
    foreach ($raw as $key => $value) {
        $key = sanitize_key((string) $key);
        $value = trim((string) $value);
        if ($key !== '' && $value !== '') $links[$key] = $value;
    }
    return $links;
}

/** Datos de perfil unificando las tres fuentes que conviven en el sitio. */
function mm_mod_profile(int $user_id): array {
    $stored = get_user_meta($user_id, 'mm_social_profile', true);
    if (!is_array($stored)) $stored = [];

    $first = static function (array $keys, string $stored_key = '') use ($user_id, $stored): string {
        if ($stored_key !== '' && isset($stored[$stored_key]) && (string) $stored[$stored_key] !== '') {
            return (string) $stored[$stored_key];
        }
        foreach ($keys as $key) {
            $value = get_user_meta($user_id, $key, true);
            if (is_scalar($value) && (string) $value !== '') return (string) $value;
        }
        return '';
    };

    $links = array_merge(
        mm_mod_decode_links(get_user_meta($user_id, 'social_links', true)),
        mm_mod_decode_links(get_user_meta($user_id, 'mm_social_links', true)),
        mm_mod_decode_links(get_user_meta($user_id, 'mm_profile_social_links', true)),
        mm_mod_decode_links($stored['social_links'] ?? [])
    );

    $phone = preg_replace('/\D+/', '', $first(['mm_phone'], 'phone'));
    $country = $first(['mm_country_code'], 'country_code');

    return [
        'public_name'   => $first(['mm_profile_username']),
        'bio'           => sanitize_textarea_field($first(['mm_profile_bio', 'mm_bio', 'description'], 'bio')),
        'location'      => sanitize_text_field($first(['mm_profile_location', 'mm_location'], 'location')),
        'birth_date'    => sanitize_text_field($first(['mm_birth_date'], 'birth_date')),
        'birth_year'    => sanitize_text_field($first(['mm_birth_year'])),
        'country_code'  => sanitize_text_field($country),
        'phone'         => $phone,
        'phone_e164'    => sanitize_text_field($first(['mm_phone_e164'])) ?: trim($country . $phone),
        'avatar_url'    => esc_url_raw($first(['mm_profile_avatar_url', 'mm_avatar_url', 'avatar_url', 'profile_avatar'], 'avatar_url')) ?: (string) get_avatar_url($user_id, ['size' => 256]),
        'banner_url'    => esc_url_raw($first(['mm_profile_banner_url', 'mm_banner_url', 'banner_url', 'profile_banner'], 'banner_url')),
        'banner_color'  => sanitize_text_field($first(['mm_profile_banner_color', 'mm_banner_color'], 'banner_color')),
        'show_birth_date' => !empty($stored['show_birth_date']),
        'show_phone'    => !empty($stored['show_phone']),
        'social_links'  => array_map('sanitize_text_field', $links),
    ];
}

function mm_mod_account(WP_User $user): array {
    $uid = (int) $user->ID;
    $coins = null;
    if (function_exists('mm_get_coins')) $coins = (float) mm_get_coins($uid);
    elseif (function_exists('mmfix_get_coins')) $coins = (float) mmfix_get_coins($uid);
    $is_pro = (bool) get_user_meta($uid, 'mm_is_pro', true);
    if (!$is_pro && function_exists('mmwp_user_is_pro')) $is_pro = (bool) mmwp_user_is_pro($uid);
    $last_login = get_user_meta($uid, '_um_last_login', true);
    return [
        'roles'          => array_values((array) $user->roles),
        'registered'     => mm_mod_utc((string) $user->user_registered),
        'is_premium'     => function_exists('mm_is_user_premium') ? (bool) mm_is_user_premium($uid) : false,
        'premium_expiry' => get_user_meta($uid, 'mm_premium_expiry', true) ?: null,
        'is_pro'         => $is_pro,
        'coins'          => $coins,
        'last_login'     => $last_login ? gmdate('c', is_numeric($last_login) ? (int) $last_login : (int) strtotime((string) $last_login)) : null,
        'website'        => (string) $user->user_url,
        'nicename'       => (string) $user->user_nicename,
        'social_ids'     => array_filter([
            'google'  => (string) get_user_meta($uid, '_uid_google', true),
            'discord' => (string) get_user_meta($uid, '_uid_discord', true),
        ]),
    ];
}

/** Conteos de mensajes y amistades para un lote de usuarios (una consulta por tabla). */
function mm_mod_bulk_counts(array $ids): array {
    global $wpdb;
    $ids = array_values(array_unique(array_map('intval', $ids)));
    $counts = [];
    foreach ($ids as $id) $counts[$id] = ['messages_sent' => 0, 'messages_received' => 0, 'friends' => 0, 'posts' => 0];
    if (!$ids) return $counts;
    $in = implode(',', array_fill(0, count($ids), '%d'));

    $messages = mm_mod_messages_table();
    if (mm_mod_has_table($messages)) {
        foreach ($wpdb->get_results($wpdb->prepare("SELECT sender_id AS uid, COUNT(*) AS total FROM {$messages} WHERE sender_id IN ({$in}) GROUP BY sender_id", $ids)) as $row) {
            $counts[(int) $row->uid]['messages_sent'] = (int) $row->total;
        }
        foreach ($wpdb->get_results($wpdb->prepare("SELECT recipient_id AS uid, COUNT(*) AS total FROM {$messages} WHERE recipient_id IN ({$in}) GROUP BY recipient_id", $ids)) as $row) {
            $counts[(int) $row->uid]['messages_received'] = (int) $row->total;
        }
    }
    $friendships = mm_mod_table('friendships');
    if (mm_mod_has_table($friendships)) {
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT user_low, user_high FROM {$friendships} WHERE status = 'accepted' AND (user_low IN ({$in}) OR user_high IN ({$in}))",
            array_merge($ids, $ids)
        ));
        foreach ($rows as $row) {
            foreach ([(int) $row->user_low, (int) $row->user_high] as $uid) {
                if (isset($counts[$uid])) $counts[$uid]['friends']++;
            }
        }
    }
    $posts = mm_mod_table('profile_posts');
    if (mm_mod_has_table($posts)) {
        foreach ($wpdb->get_results($wpdb->prepare("SELECT user_id AS uid, COUNT(*) AS total FROM {$posts} WHERE user_id IN ({$in}) GROUP BY user_id", $ids)) as $row) {
            $counts[(int) $row->uid]['posts'] = (int) $row->total;
        }
    }
    return $counts;
}

function mm_mod_user_card(WP_User $user, array $counts): array {
    $base = mm_mod_user((int) $user->ID) ?: mm_mod_missing_user((int) $user->ID);
    $profile = mm_mod_profile((int) $user->ID);
    $account = mm_mod_account($user);
    return array_merge($base, [
        'avatar'       => $profile['avatar_url'] ?: $base['avatar'],
        'banner_url'   => $profile['banner_url'],
        'banner_color' => $profile['banner_color'],
        'location'     => $profile['location'],
        'is_premium'   => $account['is_premium'],
        'is_pro'       => $account['is_pro'],
        'counts'       => $counts,
    ]);
}

function mm_mod_list_users(WP_REST_Request $request) {
    $q = trim(sanitize_text_field((string) $request->get_param('q')));
    $per_page = min(100, max(1, absint($request->get_param('per_page')) ?: 30));
    $page = max(1, absint($request->get_param('page')) ?: 1);
    $compact = rest_sanitize_boolean($request->get_param('compact'));

    if ($q !== '' && ctype_digit($q)) {
        $single = get_userdata((int) $q);
        $users = $single ? [$single] : [];
        $total = count($users);
    } else {
        $args = [
            'number'  => $per_page,
            'offset'  => ($page - 1) * $per_page,
            'orderby' => 'registered',
            'order'   => 'DESC',
            'fields'  => 'all',
            'count_total' => true,
        ];
        if ($q !== '') {
            $args['search'] = '*' . $q . '*';
            $args['search_columns'] = ['user_login', 'user_email', 'user_nicename', 'display_name'];
        }
        $query = new WP_User_Query($args);
        $users = (array) $query->get_results();
        $total = (int) $query->get_total();
    }

    if ($compact) {
        $items = array_values(array_filter(array_map(static function ($user) { return mm_mod_user((int) $user->ID); }, $users)));
        return mm_mod_response(['success' => true, 'users' => $items, 'total' => $total]);
    }

    $counts = mm_mod_bulk_counts(array_map(static function ($user) { return (int) $user->ID; }, $users));
    $items = [];
    foreach ($users as $user) {
        if ($user instanceof WP_User) $items[] = mm_mod_user_card($user, $counts[(int) $user->ID] ?? []);
    }
    return mm_mod_response([
        'success' => true, 'users' => $items, 'total' => $total,
        'page' => $page, 'per_page' => $per_page, 'total_pages' => (int) ceil($total / $per_page),
    ]);
}

/** Compatibilidad con el autocompletado: lista compacta por texto. */
function mm_mod_search_users(WP_REST_Request $request) {
    $request->set_param('compact', true);
    if (!$request->get_param('per_page')) $request->set_param('per_page', 20);
    return mm_mod_list_users($request);
}

function mm_mod_user_detail(WP_REST_Request $request) {
    global $wpdb;
    $uid = absint($request->get_param('id'));
    $user = $uid ? get_userdata($uid) : null;
    if (!$user) return new WP_Error('mm_mod_user_missing', 'El usuario no existe.', ['status' => 404]);

    $profile = mm_mod_profile($uid);
    $account = mm_mod_account($user);
    $base = mm_mod_user($uid);
    $messages = mm_mod_messages_table();
    $friendships = mm_mod_table('friendships');
    $posts_table = mm_mod_table('profile_posts');
    $comments_table = $wpdb->prefix . 'mm_comments';
    $refs_table = mm_mod_table('comment_refs');

    $stats = [
        'messages_sent' => 0, 'messages_received' => 0, 'conversations' => 0, 'unread_received' => 0,
        'first_message_at' => null, 'last_message_at' => null,
        'friends' => 0, 'pending_sent' => 0, 'pending_received' => 0,
        'posts' => 0, 'posts_with_media' => 0, 'comments' => 0,
    ];
    if (mm_mod_has_table($messages)) {
        $stats['messages_sent'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$messages} WHERE sender_id = %d", $uid));
        $stats['messages_received'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$messages} WHERE recipient_id = %d", $uid));
        $stats['unread_received'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$messages} WHERE recipient_id = %d AND read_at IS NULL", $uid));
        $stats['conversations'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT IF(sender_id = %d, recipient_id, sender_id)) FROM {$messages} WHERE sender_id = %d OR recipient_id = %d", $uid, $uid, $uid));
        $range = $wpdb->get_row($wpdb->prepare("SELECT MIN(created_at) AS first_at, MAX(created_at) AS last_at FROM {$messages} WHERE sender_id = %d OR recipient_id = %d", $uid, $uid));
        if ($range && $range->first_at) {
            $stats['first_message_at'] = mm_mod_utc((string) $range->first_at);
            $stats['last_message_at'] = mm_mod_utc((string) $range->last_at);
        }
    }

    $friends = [];
    if (mm_mod_has_table($friendships)) {
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT user_low, user_high, requester_id, status, updated_at FROM {$friendships} WHERE user_low = %d OR user_high = %d ORDER BY updated_at DESC",
            $uid, $uid
        ));
        foreach ($rows as $row) {
            $other = (int) $row->user_low === $uid ? (int) $row->user_high : (int) $row->user_low;
            if ($row->status === 'accepted') {
                $stats['friends']++;
                if (count($friends) < 40) {
                    $friend = mm_mod_user($other) ?: mm_mod_missing_user($other);
                    $friend['since'] = mm_mod_utc((string) $row->updated_at);
                    $friends[] = $friend;
                }
            } elseif ($row->status === 'pending') {
                if ((int) $row->requester_id === $uid) $stats['pending_sent']++;
                else $stats['pending_received']++;
            }
        }
    }

    $posts = [];
    if (mm_mod_has_table($posts_table)) {
        $stats['posts'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$posts_table} WHERE user_id = %d", $uid));
        $stats['posts_with_media'] = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$posts_table} WHERE user_id = %d AND media_url <> ''", $uid));
        $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$posts_table} WHERE user_id = %d ORDER BY id DESC LIMIT 40", $uid));
        foreach ($rows as $row) {
            $posts[] = [
                'id'         => (int) $row->id,
                'content'    => (string) $row->content,
                'media_url'  => (string) ($row->media_url ?? ''),
                'media_type' => (string) ($row->media_type ?? ''),
                'visibility' => (string) ($row->visibility ?? ''),
                'status'     => (string) ($row->status ?? ''),
                'shared_post_id' => $row->shared_post_id ? (int) $row->shared_post_id : null,
                'created_at' => mm_mod_utc((string) $row->created_at),
            ];
        }
    }

    if (mm_mod_has_table($comments_table)) {
        $stats['comments'] += (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$comments_table} WHERE user_id = %d", $uid));
    }
    if (mm_mod_has_table($refs_table)) {
        $stats['comments'] += (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$refs_table} WHERE user_id = %d", $uid));
    }

    // Conversaciones del usuario (ultimo mensaje de cada una).
    $conversations = [];
    if (mm_mod_has_table($messages)) {
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT m.* FROM {$messages} m INNER JOIN (SELECT MAX(id) AS last_id, COUNT(*) AS total FROM {$messages} WHERE sender_id = %d OR recipient_id = %d GROUP BY IF(sender_id = %d, recipient_id, sender_id)) latest ON latest.last_id = m.id ORDER BY m.id DESC LIMIT 30",
            $uid, $uid, $uid
        ));
        foreach ($rows as $row) {
            $other = (int) $row->sender_id === $uid ? (int) $row->recipient_id : (int) $row->sender_id;
            $conversations[] = [
                'other'        => mm_mod_user($other) ?: mm_mod_missing_user($other),
                'last_message' => mm_mod_message_payload($row),
            ];
        }
    }

    // Galeria: foto de perfil, portada y archivos de sus publicaciones.
    $photos = [];
    if ($profile['avatar_url']) $photos[] = ['type' => 'avatar', 'label' => 'Foto de perfil', 'url' => $profile['avatar_url'], 'media_type' => 'image'];
    if ($profile['banner_url']) $photos[] = ['type' => 'banner', 'label' => 'Portada', 'url' => $profile['banner_url'], 'media_type' => 'image'];
    foreach ($posts as $post) {
        if ($post['media_url'] !== '') {
            $photos[] = ['type' => 'post', 'label' => 'Publicación #' . $post['id'], 'url' => $post['media_url'], 'media_type' => $post['media_type'] ?: 'image', 'created_at' => $post['created_at'], 'post_id' => $post['id']];
        }
    }

    return mm_mod_response([
        'success'       => true,
        'user'          => array_merge($base ?: mm_mod_missing_user($uid), ['avatar' => $profile['avatar_url'] ?: ($base['avatar'] ?? '')]),
        'profile'       => $profile,
        'account'       => $account,
        'stats'         => $stats,
        'friends'       => $friends,
        'posts'         => $posts,
        'photos'        => $photos,
        'conversations' => $conversations,
    ]);
}

add_action('rest_api_init', static function () {
    $auth = 'mm_mod_permission';
    register_rest_route('mangamukai/v1', '/moderation/overview', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_get_overview', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/moderation/messages', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_get_messages', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/moderation/conversations', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_get_conversations', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/moderation/conversations/(?P<a>\d+)/(?P<b>\d+)', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_get_thread', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/moderation/users', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_list_users', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/moderation/users/search', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_search_users', 'permission_callback' => $auth]);
    register_rest_route('mangamukai/v1', '/moderation/users/(?P<id>\d+)', ['methods' => WP_REST_Server::READABLE, 'callback' => 'mm_mod_user_detail', 'permission_callback' => $auth]);
});
