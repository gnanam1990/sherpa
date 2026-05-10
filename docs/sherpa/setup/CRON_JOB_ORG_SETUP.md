# cron-job.org setup for /api/cron/hourly

cron-job.org is the free external scheduler firing Sherpa's hourly
maintenance window. We chose it over Vercel Pro's $20/mo cron addon —
through Stage 1 we're pre-revenue and the only thing the cron does is
loop an empty registry. See
`docs/sherpa/decisions/2026-05-14-sentry-cron-infra.md` for the full
trade-off.

## One-time setup

1. **Generate a fresh secret** (don't reuse anything):

       openssl rand -hex 32

   Treat it as you would a database password.

2. **Set the secret in Vercel** (Production *and* Preview environments):

       vercel env add CRON_SECRET production
       vercel env add CRON_SECRET preview

   Local `.env.local` reads `CRON_SECRET` for the smoke test.

3. **Create the job at https://console.cron-job.org/**:

   | Field        | Value                                                           |
   | ------------ | --------------------------------------------------------------- |
   | URL          | `https://<your-deployment>/api/cron/hourly`                     |
   | Schedule     | Every hour at minute 0 (`0 * * * *`)                            |
   | Method       | `POST`                                                          |
   | Headers      | `Authorization: Bearer <CRON_SECRET>`                           |
   | Save responses| ✅ (helps when debugging — you'll see the tasks JSON)          |
   | Notifications| Email on failure                                                |

4. **Verify**:

       curl -i -X POST https://<your-deployment>/api/cron/hourly \
            -H "Authorization: Bearer $CRON_SECRET"
       # Expect: HTTP/2 200 with body {"ok":true,"ranAt":...,"tasks":[...]}

   Without the header you should see `401`. Without `CRON_SECRET` set
   on the deployment at all, `503` ("cron disabled").

## Operational notes

- **Per-task audit rows.** Every task in the registry produces one
  row in `audit_log` with `surface='cron'` and `intent='CRON:<name>'`.
  Failed tasks land with `status='failed'` and `error_detail` set.
  Query for the last 24h of failures:

      SELECT intent, error_detail, submitted_at FROM audit_log
       WHERE surface = 'cron' AND status = 'failed'
         AND submitted_at > NOW() - INTERVAL '24 hours'
       ORDER BY submitted_at DESC;

- **Sentry.** Failed tasks are logged via `log.error` which forwards
  to Sentry tagged `surface=cron` (when `SENTRY_DSN` is set). Grep
  Sentry by tag rather than by stack to find cron-specific incidents.

- **Stage 1 registry is empty.** A 200 response with `tasks: []` is
  the expected steady state today. Stage 4 adds price-refresh and
  gas-cap recalibration.

- **Rotating the secret.** Change Vercel env, redeploy, then update
  the cron-job.org job header. Brief overlap is fine — old secret
  works until redeploy completes.
