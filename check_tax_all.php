<?php
require_once('wp-load.php');
$taxonomies = get_taxonomies([], 'objects');
foreach ($taxonomies as $tax) {
    if ($tax->name == 'category' || $tax->name == 'post_tag' || $tax->name == 'nav_menu' || $tax->name == 'link_category' || $tax->name == 'post_format') continue;
    echo $tax->name . " => " . count(get_terms(['taxonomy' => $tax->name, 'hide_empty' => false])) . " terms\n";
}
