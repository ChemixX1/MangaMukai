<?php
require_once('wp-load.php');
$posts = get_posts(['post_type' => 'post', 'numberposts' => 10]);
foreach ($posts as $post) {
    echo "ID: " . $post->ID . " - Title: " . $post->post_title . "\n";
    $tags = get_the_tags($post->ID);
    if ($tags) {
        echo "  Tags: ";
        foreach ($tags as $tag) { echo $tag->name . ", "; }
        echo "\n";
    }
    $cats = get_the_category($post->ID);
    if ($cats) {
        echo "  Categories: ";
        foreach ($cats as $cat) { echo $cat->name . ", "; }
        echo "\n";
    }
}
