<?php
/** Plugin Name: MangaMukai Community Tables
 * Creates missing community tables using the contracts recovered from commit 65fc160^.
 * Existing tables and data are preserved. Does not replace installed API handlers.
 */
if (!defined('ABSPATH')) exit;
function mm_community_tables_install() {
    if (get_option('mm_community_tables_version') === '2026.10.15.1') return;
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();
    $schemas = [];
    $schemas['friendships'] = "
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
    ";
    $schemas['messages'] = "
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
    ";
    $schemas['notifications'] = "
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
    ";
    $schemas['comment_refs'] = "
        comment_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        manga_id varchar(100) NOT NULL DEFAULT '',
        updated_at datetime NOT NULL,
        PRIMARY KEY  (comment_id),
        KEY user_id (user_id)
    ";
    $schemas['manga_subscriptions'] = "
        user_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (user_id,manga_id),
        KEY manga_id (manga_id)
    ";
    $schemas['profile_posts'] = "
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
    ";
    $schemas['follows'] = "
        follower_id bigint(20) unsigned NOT NULL,
        following_id bigint(20) unsigned NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (follower_id,following_id),
        KEY following_id (following_id,created_at)
    ";
    $schemas['manga_reads'] = "
        user_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL,
        chapters int(10) unsigned NOT NULL DEFAULT 1,
        last_chapter_id bigint(20) unsigned NOT NULL DEFAULT 0,
        first_read_at datetime NOT NULL,
        last_read_at datetime NOT NULL,
        PRIMARY KEY  (user_id,manga_id),
        KEY user_last (user_id,last_read_at)
    ";
    $schemas['chapter_progress'] = "
        user_id bigint(20) unsigned NOT NULL,
        chapter_id bigint(20) unsigned NOT NULL,
        manga_id bigint(20) unsigned NOT NULL DEFAULT 0,
        completed tinyint(1) unsigned NOT NULL DEFAULT 0,
        started_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (user_id,chapter_id),
        KEY user_updated (user_id,completed,updated_at)
    ";
    $schemas['post_reactions'] = "
        post_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        reaction varchar(12) NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (post_id,user_id),
        KEY user_id (user_id)
    ";
    $schemas['post_comments'] = "
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        post_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        content text NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY post_id (post_id,id),
        KEY user_id (user_id)
    ";
    $schemas['entity_reactions'] = "
        target_type varchar(12) NOT NULL,
        target_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        reaction varchar(12) NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (target_type,target_id,user_id),
        KEY user_id (user_id)
    ";
    $schemas['comments'] = "
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        manga_id BIGINT UNSIGNED NOT NULL,
        chapter_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
        KEY manga_chapter (manga_id,chapter_id),
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
    ";
    $schemas['comment_likes'] = "
        comment_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY  (comment_id, user_id),
        KEY user_id (user_id)
    ";
    $ok = true;
    foreach ($schemas as $name => $body) {
        $table = $wpdb->prefix . 'mm_' . $name;
        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table))) !== $table) {
            dbDelta("CREATE TABLE {$table} ({$body}) ENGINE=InnoDB {$charset};");
        }
        $ok = $ok && $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table))) === $table;
    }
    $comments = $wpdb->prefix . 'mm_comments';
    if ($ok && !$wpdb->get_var("SHOW COLUMNS FROM {$comments} LIKE 'chapter_id'")) {
        $ok = $wpdb->query("ALTER TABLE {$comments} ADD COLUMN chapter_id bigint unsigned NOT NULL DEFAULT 0, ADD KEY manga_chapter (manga_id,chapter_id)") !== false;
    }
    if ($ok) update_option('mm_community_tables_version', '2026.10.15.1', false);
}
add_action('init', 'mm_community_tables_install', 1);
