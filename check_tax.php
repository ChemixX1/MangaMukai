<?php
require_once('wp-load.php');
echo "Genres:\n";
$genres = get_terms(['taxonomy' => 'wp-manga-genre', 'hide_empty' => false]);
if (!is_wp_error($genres)) {
    foreach ($genres as $g) { echo $g->name . ' (' . $g->count . '), '; }
}
echo "\nTags:\n";
$tags = get_terms(['taxonomy' => 'wp-manga-tag', 'hide_empty' => false]);
if (!is_wp_error($tags)) {
    foreach ($tags as $t) { echo $t->name . ' (' . $t->count . '), '; }
}
