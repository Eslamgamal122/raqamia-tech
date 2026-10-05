<?php
/**
 * Plugin Name: Raqamia Tech Connect
 * Description: Secure project connection to Raqamia Tech. Sends site health, update counts, aggregated activity and cached PageSpeed measurements; no customer records.
 * Version: 1.2.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Raqamia Tech
 */
if (!defined('ABSPATH')) exit;
function raqamia_connect_menu() { add_options_page('Raqamia Tech Connect', 'Raqamia Tech', 'manage_options', 'raqamia-connect', 'raqamia_connect_page'); }
add_action('admin_menu', 'raqamia_connect_menu');
function raqamia_connect_schedule() { if (!wp_next_scheduled('raqamia_connect_hourly')) wp_schedule_event(time() + 60, 'hourly', 'raqamia_connect_hourly'); }
register_activation_hook(__FILE__, 'raqamia_connect_schedule');
register_deactivation_hook(__FILE__, function () { wp_clear_scheduled_hook('raqamia_connect_hourly'); wp_clear_scheduled_hook('raqamia_connect_speed', array('mobile')); wp_clear_scheduled_hook('raqamia_connect_speed', array('desktop')); });
add_action('raqamia_connect_hourly', 'raqamia_connect_send');
function raqamia_connect_health() {
    $started = microtime(true);
    $probe = wp_safe_remote_get(home_url('/'), array('timeout' => 10, 'redirection' => 3, 'limit_response_size' => 1024, 'headers' => array('Cache-Control' => 'no-cache', 'User-Agent' => 'Raqamia-Tech-Health/1.2')));
    $elapsed = min(60000, max(0, (int) round((microtime(true) - $started) * 1000)));
    $plugins = get_site_transient('update_plugins');
    $themes = get_site_transient('update_themes');
    $updates = (is_object($plugins) && isset($plugins->response) ? count((array) $plugins->response) : 0) + (is_object($themes) && isset($themes->response) ? count((array) $themes->response) : 0);
    $fatal = (int) get_option('raqamia_connect_last_fatal', 0);
    return array('checked_at' => gmdate('Y-m-d\TH:i:s\Z'), 'response_ms' => $elapsed, 'http_status' => is_wp_error($probe) ? 0 : (int) wp_remote_retrieve_response_code($probe), 'updates' => min(10000, $updates), 'fatal_recent' => $fatal > time() - DAY_IN_SECONDS);
}
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR), true)) {
        // Send only a flag and time, never stack traces, file paths or error details.
        update_option('raqamia_connect_last_fatal', time(), false);
    }
});
function raqamia_connect_send() {
    $settings = get_option('raqamia_connect_settings', array());
    if (empty($settings['url']) || empty($settings['key'])) return;
    $theme = wp_get_theme();
    $response = wp_safe_remote_post($settings['url'] . '/api/site-sync', array(
        'timeout' => 20, 'redirection' => 0,
        'headers' => array('Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $settings['key']),
        'body' => wp_json_encode(array('siteUrl' => untrailingslashit(home_url('/')), 'name' => wp_html_excerpt(get_bloginfo('name'), 200, ''), 'version' => get_bloginfo('version'), 'theme' => wp_html_excerpt($theme->get('Name'), 200, ''), 'pages' => (int) wp_count_posts('page')->publish, 'woocommerce' => class_exists('WooCommerce'), 'health' => raqamia_connect_health(), 'monitoring' => raqamia_connect_monitoring()))
    ));
    $ok = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
    update_option('raqamia_connect_result', array('ok' => $ok, 'at' => time()), false);
    return $ok;
}
function raqamia_connect_page() {
    if (!current_user_can('manage_options')) return;
    $settings = get_option('raqamia_connect_settings', array());
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['raqamia_action'])) {
        check_admin_referer('raqamia_connect_save');
        if (sanitize_text_field(wp_unslash($_POST['raqamia_action'])) === 'save') {
            $url = isset($_POST['raqamia_url']) ? untrailingslashit(esc_url_raw(wp_unslash($_POST['raqamia_url']))) : '';
            $parts = wp_parse_url($url);
            $key = isset($_POST['raqamia_key']) ? sanitize_text_field(wp_unslash($_POST['raqamia_key'])) : '';
            if (empty($parts['host']) || ($parts['scheme'] ?? '') !== 'https' || !empty($parts['user']) || !empty($parts['pass']) || !empty($parts['query']) || !empty($parts['fragment']) || !empty($parts['port']) || (!empty($parts['path']) && $parts['path'] !== '/') || ($key && !preg_match('/^[a-f0-9-]{72}$/', $key))) {
                echo '<div class="notice notice-error"><p>Enter a valid HTTPS system URL and project key. / أدخل رابط النظام الأساسي باستخدام HTTPS ومفتاح المشروع الصحيح.</p></div>';
            } else {
                $psi = isset($_POST['raqamia_psi']) ? sanitize_text_field(wp_unslash($_POST['raqamia_psi'])) : '';
                $settings = array('url' => $url, 'key' => $key ?: ($settings['key'] ?? ''), 'psi' => $psi ?: ($settings['psi'] ?? ''));
                if (strlen($settings['psi']) > 200) $settings['psi'] = '';
                raqamia_connect_schedule_speed();
                update_option('raqamia_connect_settings', $settings, false);
                raqamia_connect_schedule();
                raqamia_connect_send();
            }
        } else if ($_POST['raqamia_action'] === 'speed') { raqamia_connect_schedule_speed(); echo '<div class="notice notice-info"><p>تم جدولة فحص الموبايل والكمبيوتر. يعتمد على WordPress Cron؛ راجع النتيجة بعد دقائق.</p></div>'; } else if ($_POST['raqamia_action'] === 'sync') raqamia_connect_send();
        else if ($_POST['raqamia_action'] === 'disconnect') { delete_option('raqamia_connect_settings'); delete_option('raqamia_connect_result'); delete_option('raqamia_connect_last_fatal'); delete_option('raqamia_connect_speed'); delete_option('raqamia_connect_logins'); wp_clear_scheduled_hook('raqamia_connect_hourly'); wp_clear_scheduled_hook('raqamia_connect_speed', array('mobile')); wp_clear_scheduled_hook('raqamia_connect_speed', array('desktop')); $settings = array(); }
    }
    $result = get_option('raqamia_connect_result', array());
    ?>
    <div class="wrap"><h1>Raqamia Tech Connect <small>1.2.0</small></h1><p>ربط الموقع بمشروعه في النظام. تُرسل حالة الموقع والتحديثات وعدد المديرين وأعداد الدخول والطلبات الشهرية فقط، بدون بيانات العملاء أو كلمات المرور. / Basic site metadata, homepage response time, HTTP status, update count and a recent PHP error flag are sent. / يُرسل زمن استجابة الصفحة وكود HTTP وعدد التحديثات ومؤشر خطأ PHP حديث، بدون تفاصيل حساسة.</p>
    <p><strong>Site URL / رابط هذا الموقع:</strong> <code><?php echo esc_html(untrailingslashit(home_url('/'))); ?></code> — يجب أن يطابق رابط المشروع ويستخدم HTTPS.</p>
    <?php if ($result) { ?><p><?php echo $result['ok'] ? '✓ Connected / تمت المزامنة' : 'Sync failed / تعذرت المزامنة؛ راجع الرابط والمفتاح وانتظر 30 ثانية قبل إعادة المحاولة.'; ?> — <?php echo esc_html(wp_date('Y-m-d H:i', $result['at'])); ?></p><?php } ?>
    <form method="post"><?php wp_nonce_field('raqamia_connect_save'); ?><input type="hidden" name="raqamia_action" value="save"><table class="form-table"><tr><th><label for="raqamia_url">System URL / رابط النظام</label></th><td><input class="regular-text" id="raqamia_url" name="raqamia_url" type="url" required value="<?php echo esc_attr($settings['url'] ?? ''); ?>" placeholder="https://your-system.example"></td></tr><tr><th><label for="raqamia_key">Project key / مفتاح المشروع</label></th><td><input class="regular-text" id="raqamia_key" name="raqamia_key" type="password" autocomplete="new-password" value="" <?php echo empty($settings['key']) ? 'required' : ''; ?>><p class="description">اتركه فارغًا للاحتفاظ بالمفتاح الحالي. / Leave blank to keep the saved key.</p></td></tr><tr><th><label for="raqamia_psi">Google PageSpeed API key</label></th><td><input class="regular-text" id="raqamia_psi" name="raqamia_psi" type="password" autocomplete="new-password" value=""><p>اختياري لقياس السرعة الفعلي. يبقى داخل WordPress ولا يرسل للنظام؛ اتركه فارغًا للاحتفاظ بالمفتاح.</p></td></tr></table><?php submit_button('Save & Connect / حفظ وربط'); ?></form>
    <form method="post"><?php wp_nonce_field('raqamia_connect_save'); ?><button class="button" name="raqamia_action" value="speed">فحص السرعة / Measure speed</button> <button class="button" name="raqamia_action" value="sync">Sync now / مزامنة الآن</button> <button class="button" name="raqamia_action" value="disconnect">Disconnect / إلغاء الربط</button></form><p>Automatic hourly sync uses WordPress Cron and needs site visits (or a server cron job). / التحديث كل ساعة يعتمد على زيارات الموقع أو تفعيل Cron على السيرفر.</p></div>
    <?php
}
register_uninstall_hook(__FILE__, 'raqamia_connect_uninstall');
function raqamia_connect_uninstall() { delete_option('raqamia_connect_settings'); delete_option('raqamia_connect_result'); delete_option('raqamia_connect_last_fatal'); delete_option('raqamia_connect_speed'); delete_option('raqamia_connect_logins'); wp_clear_scheduled_hook('raqamia_connect_hourly'); wp_clear_scheduled_hook('raqamia_connect_speed', array('mobile')); wp_clear_scheduled_hook('raqamia_connect_speed', array('desktop')); }

// Anonymous monthly counters; no account names, emails, IPs or customer records.
add_action('wp_login', function () {
    $month = gmdate('Y-m'); $data = get_option('raqamia_connect_logins', array());
    $n = ($data['month'] ?? '') === $month ? (int) ($data['count'] ?? 0) : 0;
    update_option('raqamia_connect_logins', array('month' => $month, 'count' => min(10000000, $n + 1)), false);
});
function raqamia_connect_schedule_speed() {
    $settings = get_option('raqamia_connect_settings', array());
    if (empty($settings['psi'])) return;
    foreach (array('mobile' => 10, 'desktop' => 180) as $strategy => $delay) {
        if (!wp_next_scheduled('raqamia_connect_speed', array($strategy))) wp_schedule_single_event(time() + $delay, 'raqamia_connect_speed', array($strategy));
    }
}
add_action('raqamia_connect_speed', 'raqamia_connect_measure_speed');
function raqamia_connect_measure_speed($strategy) {
    if (!in_array($strategy, array('mobile', 'desktop'), true)) return;
    $settings = get_option('raqamia_connect_settings', array()); if (empty($settings['psi'])) return;
    $cache = get_option('raqamia_connect_speed', array());
    $url = add_query_arg(array('url' => home_url('/'), 'strategy' => $strategy, 'category' => 'performance', 'key' => $settings['psi']), 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed');
    $response = wp_safe_remote_get($url, array('timeout' => 60, 'redirection' => 0, 'limit_response_size' => 3000000));
    $json = is_wp_error($response) ? array() : json_decode(wp_remote_retrieve_body($response), true);
    $result = $json['lighthouseResult'] ?? array(); $score = $result['categories']['performance']['score'] ?? null;
    $ok = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200 && is_numeric($score) && $score >= 0 && $score <= 1 && empty($result['runtimeError']);
    $cache['errors'][$strategy] = !$ok;
    if ($ok) $cache[$strategy] = array('score' => (int) round($score * 100), 'checked_at' => gmdate('Y-m-d\TH:i:s\Z'), 'lcp_ms' => isset($result['audits']['largest-contentful-paint']['numericValue']) ? min(600000, max(0, (float) $result['audits']['largest-contentful-paint']['numericValue'])) : null, 'cls' => isset($result['audits']['cumulative-layout-shift']['numericValue']) ? min(100, max(0, (float) $result['audits']['cumulative-layout-shift']['numericValue'])) : null);
    update_option('raqamia_connect_speed', $cache, false);
    wp_schedule_single_event(time() + DAY_IN_SECONDS, 'raqamia_connect_speed', array($strategy));
    // Metadata is sent by the normal hourly sync; slow scans never block its request.
}
function raqamia_connect_monitoring() {
    $plugins = get_site_transient('update_plugins'); $themes = get_site_transient('update_themes'); $core = get_site_transient('update_core');
    $p = is_object($plugins) ? (array) ($plugins->response ?? array()) : array(); $th = is_object($themes) ? (array) ($themes->response ?? array()) : array();
    $core_count = 0; if (is_object($core)) foreach ((array) ($core->updates ?? array()) as $update) if (($update->response ?? '') === 'upgrade') $core_count++;
    $names = array(); foreach ($p as $slug => $update) $names[] = wp_html_excerpt(sanitize_text_field($slug), 200, ''); foreach ($th as $slug => $update) $names[] = wp_html_excerpt(sanitize_text_field($slug), 200, '');
    $users = count_users(); $active = (array) get_option('active_plugins', array()); $month = gmdate('Y-m'); $logins = get_option('raqamia_connect_logins', array());
    $orders = null; if (function_exists('wc_get_orders')) { $result = wc_get_orders(array('date_created' => gmdate('Y-m-01 00:00:00') . '...' . gmdate('Y-m-d H:i:s'), 'limit' => 1, 'paginate' => true, 'return' => 'ids', 'type' => 'shop_order')); $orders = is_object($result) ? min(10000000, (int) $result->total) : null; }
    $cache = get_option('raqamia_connect_speed', array()); $settings = get_option('raqamia_connect_settings', array());
    if (!empty($settings['psi']) && empty($cache['mobile'])) raqamia_connect_schedule_speed();
    $status = empty($settings['psi']) ? 'unconfigured' : (!empty($cache['errors']['mobile']) || !empty($cache['errors']['desktop']) ? 'error' : (!empty($cache['mobile']) && !empty($cache['desktop']) ? 'ok' : 'pending'));
    return array('plugin_version' => '1.2.0', 'php_version' => PHP_VERSION, 'admins' => min(100000, (int) ($users['avail_roles']['administrator'] ?? 0)), 'active_plugins' => min(10000, count($active)), 'core_updates' => min(100, $core_count), 'plugin_updates' => min(10000, count($p)), 'theme_updates' => min(10000, count($th)), 'update_names' => array_slice($names, 0, 30), 'wpml' => defined('ICL_SITEPRESS_VERSION'), 'toolset' => defined('TYPES_VERSION') || defined('WPV_VERSION'), 'https' => is_ssl() || strpos(home_url('/'), 'https://') === 0, 'monthly_logins' => ($logins['month'] ?? '') === $month ? (int) $logins['count'] : 0, 'month' => $month, 'orders' => $orders, 'pagespeed' => array('mobile' => $cache['mobile'] ?? null, 'desktop' => $cache['desktop'] ?? null, 'status' => $status));
}
