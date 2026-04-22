<?php
require_once('wp-load.php');
$posts = get_posts(['post_type' => 'post', 'numberposts' => 5]);
foreach ($posts as $post) {
    echo "ID: " . $post->ID . "\n";
    $meta = get_post_meta($post->ID);
    foreach ($meta as $k => $v) {
        if (strpos($k, 'manga') !== false || strpos($k, 'tag') !== false) {
            echo "  Meta $k: " . print_r($v, true);
        }
    }
}
