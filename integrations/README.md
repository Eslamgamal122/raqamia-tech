# Raqamia Tech client portal and website connections

Client users sign in with app credentials without ChatGPT. An admin creates their account against an existing client record. `/api/client` derives the client scope from the server session; request parameters cannot select a different client. It exposes project dates/status, aggregate task progress, explicitly shared task details, preview URL, customer notes and safe website metadata only. Deleted clients cannot authenticate; deleted projects disappear. Password reset and deactivation revoke sessions.

## WordPress

Download `/downloads/raqamia-tech-connect.zip`, upload via WordPress Plugins and activate. In the project's **Client portal and website connection** panel select WordPress, enter the HTTPS website base URL (root domain, matching WordPress `home_url`) and generate a key. Paste the system URL and key into **Settings → Raqamia Tech** in WordPress. The key is displayed once, is project-scoped and stored centrally as a SHA-256 hash. Rotation and disconnect revoke the previous key.

The plugin sends only site name, URL, WordPress version, theme name, published page count and whether WooCommerce is active. It never sends users, orders, payments or passwords. Hourly sync uses WP-Cron and therefore requires visits or a configured server Cron. Manual sync is also available. Central sync requests are throttled to one per 30 seconds per connection. Last successful sync is a heartbeat, not continuous uptime monitoring.

Source: `wordpress/raqamia-tech-connect/raqamia-tech-connect.php`. Build the committed ZIP from that file whenever updating the plugin. Settings use `manage_options`, WordPress nonces and escaped output; HTTP requests use `wp_safe_remote_post` with no redirects. Deactivation clears the cron job; uninstall deletes plugin settings.

## Shopify

No WordPress plugin can be installed on Shopify. Create and install a Shopify Dev Dashboard app with **read_themes** access. This connection is read-only and retrieves the shop name, primary domain and published theme through Admin GraphQL 2026-10. Sync is manual from the project panel.

Two credential modes:

- Client ID and Client Secret for an app created and installed within the merchant's **own Shopify organization**. The server exchanges credentials using the client credentials grant on each sync, so it does not retain expired access tokens.
- An already authorized Admin API access token from OAuth or an eligible existing custom app. Token refresh/renewal must be handled by the issuing app and replaced here when needed; this is not a public multi-merchant OAuth installer.

Only exact `*.myshopify.com` store domains are accepted, HTTPS is mandatory and redirects are rejected. Credentials are encrypted with AES-GCM, using project ID as authenticated additional data, and never returned by any browser API or placed in audit records. `SITE_CONNECTION_ENCRYPTION_KEY` is a production runtime secret; keep it stable to preserve existing connections. Changing it requires re-entering Shopify credentials. It is not stored in source.

## Progress and visibility

Project status comes from its sale, and progress is completed tasks divided by all active project tasks. A delivered project with no tasks displays 100%. Shared task names are opt-in per project. Website metadata does not automatically mark development work complete. These settings/accounts/connections require an internet connection and are deliberately excluded from the admin financial offline snapshot.

## Verification

Checked real D1 migrations, client credential login, client/project scope, role protections, task sharing, progress, password reset/deactivation, soft deletes, WordPress authentication/site binding/rate limits/key rotation/revocation, financial isolation and secret filtering. Shopify exchanges and GraphQL responses are verified against mocked remote endpoints; live merchant verification requires a store with an installed authorized app. No live WordPress or Shopify merchant credentials are included in this project.

## Client entrance, support and WordPress health (1.1.0)

Share `/client` with customers. It keeps the company logo, mint/aqua palette, Cairo typeface, Arabic/English switch and client-focused copy. Client sign-in uses the same protected app credentials and enforces `role=client` before issuing a session. Existing admin/programmer sign-in remains at `/`.

Support tickets and threaded replies live in D1 (`support_tickets`, `support_messages`). Clients can create tickets only against their active own projects, see only their own client's conversations, and reply. Admins see active-project tickets, reply, and move status between open, in progress, waiting for client and resolved. A client reply to a resolved or waiting ticket reopens it. Creation/reply request identifiers protect retries from duplication. Client creation is capped at ten tickets per 24 hours; messages at 100 per user per hour. Passwords and payment details should not be included in ticket text. Ticket management is online-only and never changes the financial ledger.

The updated WordPress ZIP (version 1.1.0) retains saved connection settings when replaced through WordPress's Upload Plugin / Replace flow. It measures an anonymous safe GET to the homepage (first 1 KB, timeout 10 seconds), reports elapsed milliseconds, final HTTP status, pending plugin/theme update count from WordPress transients and a recent fatal-PHP-error flag. Only the error flag/time is retained, never a stack trace, filesystem path or raw error message. This is a server-side response check, **not** a browser loading time, PageSpeed/Core Web Vitals score, comprehensive issue detector, or externally verified uptime monitor. Alert threshold is 2.5 seconds. A missing successful heartbeat for more than two hours is labelled unconfirmed, never automatically “down”. Checks run hourly through the existing WP-Cron schedule or manually through Sync Now. A site that cannot execute WordPress cannot send a heartbeat. Shopify continues to expose connection metadata only; this update does not claim to measure Shopify performance.

Admin Dashboard and Support and website health show the current status independently of the financial date filter. Project connection metadata refreshes every 30 seconds and on window focus, without overwriting unsaved customer-facing notes/task selection. Older plugin payloads without health data remain supported and show an update prompt instead of invented measurements.
