<?php
/**
 * Plugin Name: MangaMukai Payments Report
 * Description: Resumen de solo lectura de las operaciones PayPal (recargas de monedas y suscripciones). Usa la misma clave X-MM-Moderation-Key que la supervision de mensajes. No modifica nada.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    if (!function_exists('mm_mod_permission')) return; // requiere mangamukai-moderation-api.php
    register_rest_route('mangamukai/v1', '/moderation/payments', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'mm_payments_report',
        'permission_callback' => 'mm_mod_permission',
    ]);
});

function mm_payments_report(WP_REST_Request $request): WP_REST_Response {
    global $wpdb;
    $detail = $request->get_param('detail') === '1';
    $money  = static fn($v): float => round((float) $v, 2);
    $when   = static fn($ts): ?string => $ts ? gmdate('Y-m-d H:i:s', is_numeric($ts) ? (int) $ts : (int) strtotime((string) $ts)) : null;

    // 1) Recargas de monedas del plugin manga-paypal-payments (wp_options mmpp_c_*)
    $coins = ['orders' => 0, 'completed' => 0, 'pending' => 0, 'usd' => 0.0, 'coins' => 0, 'first' => null, 'last' => null, 'items' => []];
    $rows = $wpdb->get_results("SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'mmpp\\_c\\_%'", ARRAY_A);
    foreach ($rows as $row) {
        $o = maybe_unserialize($row['option_value']);
        if (!is_array($o)) continue;
        $done = ($o['status'] ?? '') === 'completed';
        $coins['orders']++;
        $coins[$done ? 'completed' : 'pending']++;
        if ($done) {
            $coins['usd']   += (float) ($o['cost'] ?? 0);
            $coins['coins'] += (int) ($o['amount'] ?? 0);
            $paid = $when($o['paid_at'] ?? null);
            if ($paid && (!$coins['first'] || $paid < $coins['first'])) $coins['first'] = $paid;
            if ($paid && (!$coins['last']  || $paid > $coins['last']))  $coins['last']  = $paid;
        }
        if ($detail) $coins['items'][] = [
            'key' => $row['option_name'], 'user_id' => (int) ($o['user_id'] ?? 0), 'coins' => (int) ($o['amount'] ?? 0),
            'usd' => $money($o['cost'] ?? 0), 'status' => $o['status'] ?? '', 'txn_id' => $o['txn_id'] ?? null,
            'created_at' => $when($o['created_at'] ?? null), 'paid_at' => $when($o['paid_at'] ?? null),
        ];
    }
    $coins['usd'] = $money($coins['usd']);

    // 2) Suscripciones premium (wp_options mmpp_sub_*)
    $subs = ['orders' => 0, 'activated' => 0, 'pending' => 0, 'usd' => 0.0, 'by_plan' => [], 'first' => null, 'last' => null, 'items' => []];
    $rows = $wpdb->get_results("SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'mmpp\\_sub\\_%'", ARRAY_A);
    foreach ($rows as $row) {
        $o = maybe_unserialize($row['option_value']);
        if (!is_array($o)) continue;
        $done = ($o['status'] ?? '') === 'activated';
        $plan = (string) ($o['plan'] ?? 'monthly');
        $subs['orders']++;
        $subs[$done ? 'activated' : 'pending']++;
        if ($done) {
            $subs['usd'] += (float) ($o['amount'] ?? 0);
            $subs['by_plan'][$plan] = ($subs['by_plan'][$plan] ?? 0) + 1;
            $paid = $when($o['paid_at'] ?? null);
            if ($paid && (!$subs['first'] || $paid < $subs['first'])) $subs['first'] = $paid;
            if ($paid && (!$subs['last']  || $paid > $subs['last']))  $subs['last']  = $paid;
        }
        if ($detail) $subs['items'][] = [
            'key' => $row['option_name'], 'user_id' => (int) ($o['user_id'] ?? 0), 'plan' => $plan, 'usd' => $money($o['amount'] ?? 0),
            'status' => $o['status'] ?? '', 'txn_id' => $o['txn_id'] ?? null,
            'created_at' => $when($o['created_at'] ?? null), 'paid_at' => $when($o['paid_at'] ?? null),
        ];
    }
    $subs['usd'] = $money($subs['usd']);

    // 3) Flujo antiguo via buyCRED (posts buycred_payment + log de myCRED con ref buy_creds_with_*)
    $legacy = ['pending_posts' => 0, 'log_entries' => 0, 'coins' => 0, 'usd' => 0.0, 'usd_known' => true, 'items' => []];
    $legacy['pending_posts'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'buycred_payment' AND post_status <> 'trash'");
    $log_table = $wpdb->prefix . 'myCRED_log';
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $log_table)) === $log_table) {
        $entries = $wpdb->get_results("SELECT id, user_id, creds, time, data, ref FROM {$log_table} WHERE ref LIKE 'buy_creds_with_%' ORDER BY time ASC", ARRAY_A);
        foreach ($entries as $e) {
            $legacy['log_entries']++;
            $legacy['coins'] += (int) $e['creds'];
            $data = maybe_unserialize($e['data']);
            $cost = null;
            if (is_array($data) && !empty($data['sales_data'])) {
                $parts = explode('|', (string) $data['sales_data']); // from|to|amount|cost|currency|token|other
                if (isset($parts[3]) && is_numeric($parts[3])) $cost = (float) $parts[3];
            }
            if ($cost === null) $legacy['usd_known'] = false; else $legacy['usd'] += $cost;
            if ($detail) $legacy['items'][] = ['log_id' => (int) $e['id'], 'user_id' => (int) $e['user_id'], 'coins' => (int) $e['creds'], 'usd' => $cost === null ? null : $money($cost), 'gateway' => $e['ref'], 'at' => $when($e['time'])];
        }
    }
    $legacy['usd'] = $money($legacy['usd']);

    $premium_users = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key = 'mm_is_premium' AND meta_value = '1'");

    return new WP_REST_Response([
        'success'      => true,
        'generated_at' => gmdate('c'),
        'currency'     => 'USD',
        'coin_recharges' => $coins,
        'subscriptions'  => $subs,
        'legacy_buycred' => $legacy,
        'premium_users_now' => $premium_users,
        'totals' => [
            'paid_operations' => $coins['completed'] + $subs['activated'] + $legacy['log_entries'],
            'usd'             => $money($coins['usd'] + $subs['usd'] + $legacy['usd']),
            'usd_complete'    => $legacy['usd_known'],
        ],
    ], 200);
}
