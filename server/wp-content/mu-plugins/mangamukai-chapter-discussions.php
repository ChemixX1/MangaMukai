<?php
/**
 * Plugin Name: MangaMukai Chapter Discussions
 * Description: Extends the existing comment store without moving or replacing historical comments.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) exit;

function mm_discussion_schema() {
    if (get_option('mm_discussion_schema') === '1.0.0' || !function_exists('mmwp_comments_table')) return;
    global $wpdb;
    $comments = mmwp_comments_table();
    if (!$wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $comments))) mmwp_ensure_tables();
    if (!$wpdb->get_var("SHOW COLUMNS FROM {$comments} LIKE 'chapter_id'")) {
        // Zero explicitly means the existing, global manga discussion. No historical rows are reassigned.
        $wpdb->query("ALTER TABLE {$comments} ADD COLUMN chapter_id bigint unsigned NOT NULL DEFAULT 0, ADD KEY manga_chapter (manga_id,chapter_id)");
    }
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $reactions = mm_social_table('entity_reactions'); $charset = $wpdb->get_charset_collate();
    dbDelta("CREATE TABLE {$reactions} (
        target_type varchar(12) NOT NULL,
        target_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        reaction varchar(12) NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (target_type,target_id,user_id),
        KEY user_id (user_id)
    ) {$charset};");
    if ($wpdb->get_var("SHOW COLUMNS FROM {$comments} LIKE 'chapter_id'") && $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $reactions)) === $reactions) update_option('mm_discussion_schema', '1.0.0', false);
}
add_action('init', 'mm_discussion_schema', 20);

function mm_discussion_reactions($type, $id, $user_id = null) {
    global $wpdb;
    $user_id = $user_id ?? get_current_user_id();
    $table = mm_social_table('entity_reactions');
    $counts = array_fill_keys(['like','love','haha','wow','sad','angry','fire'], 0);
    foreach ($wpdb->get_results($wpdb->prepare("SELECT reaction,COUNT(*) total FROM {$table} WHERE target_type=%s AND target_id=%d GROUP BY reaction", $type, $id)) as $row) $counts[$row->reaction] = (int)$row->total;
    $selected = $user_id ? (string)$wpdb->get_var($wpdb->prepare("SELECT reaction FROM {$table} WHERE target_type=%s AND target_id=%d AND user_id=%d", $type, $id, $user_id)) : '';
    if ($type === 'comment') {
        $counts['like'] = (int)$wpdb->get_var($wpdb->prepare('SELECT likes_count FROM ' . mmwp_comments_table() . ' WHERE id=%d', $id));
        if ($user_id && $wpdb->get_var($wpdb->prepare('SELECT comment_id FROM ' . mmwp_comment_likes_table() . ' WHERE comment_id=%d AND user_id=%d', $id, $user_id))) $selected = 'like';
    }
    return ['reactions'=>$counts, 'my_reaction'=>$selected];
}

function mm_discussion_payload($row) {
    $reaction = mm_discussion_reactions('comment', (int)$row['id']);
    $data = mmwp_comment_payload($row, $reaction['my_reaction'] === 'like');
    $data['chapter_id'] = (int)$row['chapter_id'];
    $data['created_at'] = str_replace(' ','T', get_gmt_from_date($row['created_at'])) . 'Z';
    return $data + $reaction;
}

function mm_discussion_comments($request) {
    global $wpdb;
    mm_interactions_viewer($request);
    $manga = absint($request['manga_id']); $chapter = absint($request['chapter_id']);
    if (!$manga && $chapter) $manga = (int)get_post_meta($chapter, 'ero_seri', true);
    if (!$manga || get_post_status($manga) !== 'publish') return new WP_Error('mm_comment_target','Manga no disponible.',['status'=>404]);
    if ($chapter && (get_post_status($chapter) !== 'publish' || (int)get_post_meta($chapter,'ero_seri',true) !== $manga)) return new WP_Error('mm_comment_target','Capítulo no disponible en este manga.',['status'=>400]);
    $table = mmwp_comments_table();
    if ($request->get_method() !== 'POST') {
        $order = $request['filter'] === 'populares' ? 'likes_count DESC,id DESC' : 'id DESC';
        $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table} WHERE manga_id=%d AND chapter_id=%d ORDER BY {$order} LIMIT 200",$manga,$chapter),ARRAY_A);
        return rest_ensure_response(['success'=>true,'comments'=>array_map('mm_discussion_payload',$rows)]);
    }
    $user = get_current_user_id();
    if (!$user) return new WP_Error('mm_unauthorized','Inicia sesión.',['status'=>401]);
    $content = trim(sanitize_textarea_field((string)$request['content']));
    $length = function_exists('mb_strlen') ? mb_strlen($content) : strlen($content);
    if (!$content || $length > 2000) return new WP_Error('mm_comment_invalid','Escribe entre 1 y 2000 caracteres.',['status'=>400]);
    $parent = absint($request['parent_id']);
    if ($parent && !$wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE id=%d AND manga_id=%d AND chapter_id=%d",$parent,$manga,$chapter))) return new WP_Error('mm_comment_parent','La respuesta pertenece a otra conversación.',['status'=>400]);
    $now = current_time('mysql');
    $row = ['manga_id'=>$manga,'chapter_id'=>$chapter,'user_id'=>$user,'parent_id'=>$parent ?: null,'content'=>$content,'likes_count'=>0,'created_at'=>$now,'updated_at'=>$now];
    if (!$wpdb->insert($table,$row)) return new WP_Error('mm_write_failed','No se pudo guardar el comentario.',['status'=>500]);
    $row['id'] = (int)$wpdb->insert_id;
    return new WP_REST_Response(['success'=>true,'comment'=>mm_discussion_payload($row)],201);
}

function mm_discussion_entity($request) {
    global $wpdb;
    mm_interactions_viewer($request);
    $type = (string)$request['type']; $id = absint($request['id']); $user = get_current_user_id();
    if ($type === 'comment') {
        $comment = $wpdb->get_row($wpdb->prepare('SELECT manga_id,chapter_id FROM ' . mmwp_comments_table() . ' WHERE id=%d',$id));
        $exists = $comment && get_post_status($comment->manga_id) === 'publish' && (!$comment->chapter_id || get_post_status($comment->chapter_id) === 'publish');
    } else $exists = get_post_status($id) === 'publish';
    if (!$id || !$exists) return new WP_Error('mm_reaction_target','Contenido no disponible.',['status'=>404]);
    if ($request->get_method() !== 'POST') return rest_ensure_response(['success'=>true] + mm_discussion_reactions($type,$id));
    if (!$user) return new WP_Error('mm_unauthorized','Inicia sesión.',['status'=>401]);
    $reaction = sanitize_key((string)$request['reaction']);
    $allowed = $type === 'comment' ? ['','like','love','haha','sad','fire'] : ['','like','love','haha','wow','sad','angry'];
    if (!in_array($reaction,$allowed,true)) return new WP_Error('mm_reaction_invalid','Reacción no válida.',['status'=>400]);
    $table = mm_social_table('entity_reactions');
    $wpdb->query('START TRANSACTION');
    $ok = $wpdb->delete($table,['target_type'=>$type,'target_id'=>$id,'user_id'=>$user]) !== false;
    if ($type === 'comment') {
        $likes = mmwp_comment_likes_table();
        if ($reaction === 'like') $ok = $ok && $wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$likes} (comment_id,user_id,created_at) VALUES (%d,%d,%s)",$id,$user,current_time('mysql'))) !== false;
        else $ok = $ok && $wpdb->delete($likes,['comment_id'=>$id,'user_id'=>$user]) !== false;
        $ok = $ok && $wpdb->query($wpdb->prepare('UPDATE ' . mmwp_comments_table() . " SET likes_count=(SELECT COUNT(*) FROM {$likes} WHERE comment_id=%d) WHERE id=%d",$id,$id)) !== false;
    }
    if ($reaction !== '' && !($type === 'comment' && $reaction === 'like')) $ok = $ok && $wpdb->insert($table,['target_type'=>$type,'target_id'=>$id,'user_id'=>$user,'reaction'=>$reaction,'updated_at'=>current_time('mysql',true)]) !== false;
    $wpdb->query($ok ? 'COMMIT' : 'ROLLBACK');
    if (!$ok) return new WP_Error('mm_write_failed','No se pudo guardar la reacción.',['status'=>500]);
    return rest_ensure_response(['success'=>true] + mm_discussion_reactions($type,$id));
}

add_action('rest_api_init', static function() {
    if (!function_exists('mmwp_comments_table')) return;
    mm_discussion_schema();
    register_rest_route('mangamukai/v1','/comments',[
        ['methods'=>'GET','callback'=>'mm_discussion_comments','permission_callback'=>'__return_true'],
        ['methods'=>'POST','callback'=>'mm_discussion_comments','permission_callback'=>'mm_social_auth_permission'],
    ],true);
    register_rest_route('mangamukai/v1','/reactions/(?P<type>manga|chapter|comment)/(?P<id>\d+)',[
        ['methods'=>'GET','callback'=>'mm_discussion_entity','permission_callback'=>'__return_true'],
        ['methods'=>'POST','callback'=>'mm_discussion_entity','permission_callback'=>'mm_social_auth_permission'],
    ]);
    register_rest_route('mangamukai/v1','/comments/like',['methods'=>'POST','permission_callback'=>'mm_social_auth_permission','callback'=>static function($request){
        mm_interactions_viewer($request); $id=absint($request['comment_id']); $state=mm_discussion_reactions('comment',$id);
        $request->set_param('type','comment'); $request->set_param('id',$id); $request->set_param('reaction',$state['my_reaction']==='like' ? '' : 'like');
        $response=mm_discussion_entity($request); if(is_wp_error($response)) return $response;
        $data=$response->get_data(); $data['liked']=$data['my_reaction']==='like'; $data['likes']=$data['reactions']['like']; $response->set_data($data); return $response;
    }],true);
    register_rest_route('mangamukai/v1','/chapters/comment-counts',['methods'=>'GET','permission_callback'=>'__return_true','callback'=>static function($request){
        global $wpdb;
        $ids=array_slice(array_values(array_unique(array_filter(array_map('absint',explode(',',(string)$request['ids']))))),0,100);
        $counts=array_fill_keys($ids,0); $likes=[];
        mm_interactions_viewer($request);
        if ($ids) {
            $placeholders=implode(',',array_fill(0,count($ids),'%d'));
            $rows=$wpdb->get_results($wpdb->prepare('SELECT c.chapter_id,COUNT(*) total FROM ' . mmwp_comments_table() . " c INNER JOIN {$wpdb->posts} p ON p.ID=c.chapter_id WHERE c.chapter_id IN ({$placeholders}) AND p.post_status='publish' GROUP BY c.chapter_id",...$ids));
            foreach($rows as $row) $counts[(int)$row->chapter_id]=(int)$row->total;
            foreach($ids as $id) $likes[$id]=['reactions'=>['like'=>0], 'my_reaction'=>''];
            $table=mm_social_table('entity_reactions');
            $rows=$wpdb->get_results($wpdb->prepare("SELECT target_id,reaction,COUNT(*) total FROM {$table} WHERE target_type='chapter' AND target_id IN ({$placeholders}) GROUP BY target_id,reaction",...$ids));
            foreach($rows as $row) $likes[(int)$row->target_id]['reactions'][$row->reaction]=(int)$row->total;
            if(get_current_user_id()) {
                $rows=$wpdb->get_results($wpdb->prepare("SELECT target_id,reaction FROM {$table} WHERE target_type='chapter' AND target_id IN ({$placeholders}) AND user_id=%d",...array_merge($ids,[get_current_user_id()])));
                foreach($rows as $row) $likes[(int)$row->target_id]['my_reaction']=$row->reaction;
            }
        }
        return rest_ensure_response(['success'=>true,'counts'=>(object)$counts,'engagement'=>(object)$likes]);
    }],true);
},1000);
