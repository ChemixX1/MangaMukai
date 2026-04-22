<?php
/*
Plugin Name: Expose Manga Data to REST API
Description: Adds manga_cover, manga_description, and manga_tags fields to the posts REST API response using the ero_seri metadata.
Version: 1.1
Author: System
*/

add_action('rest_api_init', function () {
    register_rest_field('post', 'manga_cover', array(
        'get_callback' => function ($post_arr) {
            $manga_id = get_post_meta($post_arr['id'], 'ero_seri', true);
            if ($manga_id) {
                $url = get_the_post_thumbnail_url($manga_id, 'full');
                return $url ? $url : null;
            }
            return null;
        },
        'schema' => null,
    ));

    register_rest_field('post', 'manga_description', array(
        'get_callback' => function ($post_arr) {
            $manga_id = get_post_meta($post_arr['id'], 'ero_seri', true);
            if ($manga_id) {
                $post = get_post($manga_id);
                return $post ? $post->post_content : null;
            }
            return null;
        },
        'schema' => null,
    ));

    register_rest_field('post', 'manga_tags', array(
        'get_callback' => function ($post_arr) {
            $manga_id = get_post_meta($post_arr['id'], 'ero_seri', true);
            if ($manga_id) {
                $taxonomies = get_object_taxonomies('manga');
                $tags = array();
                foreach ($taxonomies as $tax) {
                    $terms = get_the_terms($manga_id, $tax);
                    if ($terms && !is_wp_error($terms)) {
                        foreach ($terms as $term) {
                            $tags[] = $term->name;
                        }
                    }
                }
                
                // If manga post has no registered taxonomies, try standard ones
                if (empty($tags)) {
                   $standard_terms = get_the_terms($manga_id, 'category');
                   if ($standard_terms && !is_wp_error($standard_terms)) {
                        foreach ($standard_terms as $t) { $tags[] = $t->name; }
                   }
                }

                return $tags;
            }
            return array();
        },
        'schema' => null,
    ));
});
