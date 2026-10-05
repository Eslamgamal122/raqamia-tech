=== Raqamia Tech Connect ===
Stable tag: 1.2.0
Requires at least: 6.0
Requires PHP: 7.4

Upgrade: Upload raqamia-tech-connect.zip through Plugins > Add New > Upload and choose Replace current plugin. Saved connection keys are preserved. Do not uninstall first. Open Settings > Raqamia Tech and click Sync now.

Actual PageSpeed scores: Enable PageSpeed Insights API in your Google Cloud project and create a restricted API key. Add it in the plugin's Google PageSpeed API key field, save, then click Measure speed. The key stays in WordPress; it is never sent to Raqamia. Mobile and desktop scans run separately through WordPress Cron and repeat daily. Scores and dates sync hourly; click Sync now after the scans finish. Failed scans retain the last successful reading and show an error. Unmeasured readings remain empty, never zero. Ensure WordPress Cron runs; a server cron is recommended for low-traffic sites.

Telemetry: WordPress/PHP/theme versions, page count, WooCommerce flag, core/plugin/theme update counts and up to 30 update slugs, administrator count, active plugin count, WPML/Toolset presence, HTTPS status, homepage response/HTTP status, recent PHP fatal-error flag, cached Google Lighthouse performance/LCP/CLS readings, anonymous monthly login count since installation and aggregate monthly WooCommerce order count. No customers, order records, names, usernames, emails, IP addresses, passwords, API keys, file paths or stack traces are transmitted. Login counts begin at installation and reset monthly. Google receives the public homepage URL for its performance scan.

The homepage probe is a server-side response measurement, not PageSpeed or continuous uptime monitoring. A late sync does not prove downtime. Updates use WordPress update transients and may lag its own update check. More than 3 administrators is a review hint, not proof of a security issue. WPML and Toolset are informational and optional.

Readings are metadata only. The plugin does not remotely execute tasks, modify site content or install updates. Disconnect stops monitoring; uninstall removes plugin options and scheduled jobs.
