<?php
/**
 * Plugin Name: MangaMukai Registration Profile Fields
 * Description: Persists the extended profile fields sent by the React registration page.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

add_filter('rest_request_before_callbacks', static function ($response, $handler, $request) {
    if (
        !$request instanceof WP_REST_Request
        || $request->get_route() !== '/mangamukai/v1/register'
        || strtoupper($request->get_method()) !== 'POST'
    ) {
        return $response;
    }

    $birth_date = sanitize_text_field((string) $request->get_param('birth_date'));
    $birth_year = absint($request->get_param('birth_year'));
    $country_code = sanitize_text_field((string) $request->get_param('country_code'));
    $phone = preg_replace('/\D+/', '', (string) $request->get_param('phone'));
    $current_year = (int) gmdate('Y');

    $birth_date_parts = preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $birth_date, $matches)
        ? [$matches[1], $matches[2], $matches[3]]
        : [];
    if (
        count($birth_date_parts) !== 3
        || !checkdate((int) $birth_date_parts[1], (int) $birth_date_parts[2], (int) $birth_date_parts[0])
        || $birth_date > gmdate('Y-m-d')
    ) {
        $birth_date = '';
    }

    if ($birth_year < 1900 || $birth_year > $current_year) {
        $birth_year = 0;
    }
    if (!preg_match('/^\+\d{1,4}$/', $country_code)) {
        $country_code = '';
    }
    if (strlen($phone) < 6 || strlen($phone) > 15) {
        $phone = '';
    }

    add_action('user_register', static function ($user_id) use ($birth_date, $birth_year, $country_code, $phone) {
        if ($birth_date !== '') {
            update_user_meta($user_id, 'mm_birth_date', $birth_date);
        }
        if ($birth_year > 0) {
            update_user_meta($user_id, 'mm_birth_year', $birth_year);
        }
        if ($country_code !== '') {
            update_user_meta($user_id, 'mm_country_code', $country_code);
        }
        if ($phone !== '') {
            update_user_meta($user_id, 'mm_phone', $phone);
            update_user_meta($user_id, 'mm_phone_e164', $country_code . $phone);
        }
    }, 10, 1);

    return $response;
}, 10, 3);
