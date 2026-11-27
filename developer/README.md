# Mantrilo Developer Console

A separate Expo 58/React Native project in `developer/`, with an authenticated Node backend prepared for Cloud Run, Firebase Authentication, and Firestore. The complete console is responsive web. Native routes provide an explicit browser-console handoff, not a second credential/session implementation.

## Run locally

From `developer/`:

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:4190**. With no environment file the server starts in **isolated local demo mode**, bound only to `127.0.0.1`. Choose **Explore demo workspace**, or **Open demo administrator**. Demo sessions and workspace changes reset on server restart. These are fixture identities, not Firebase accounts. No privileged server credential or initial administrator password is used by the demo.

The Node server serves the exported app and same-origin `/api` routes together. `npm run web` starts Expo alone for UI development, but it does not supply the backend; the built same-origin server is the supported full-console preview. The marketing website remains a separate project on port 4187.

## Working functionality

- Protected console routes with a loading state and login redirection. Backend authorization is independent of browser navigation.
- Keys are issued automatically, with no create step: every workspace gets a sandbox key (`mtr_sbx_`, sample catalog only) on first sign-in, and a live key (`mtr_live_`, full catalog) once it has a paid plan. Existing workspaces are migrated the same way and keep their older keys until revoked. 256-bit random secrets, looked up by SHA-256 hash; the console can show, copy and regenerate each key. A live key is refused (`plan_inactive`) while the workspace has no paid plan. Workspace isolation.
- Free tier by default: 500 API calls a month. Starter, Growth and Business raise the quota and add the live key.
- Server-enforced product registration and plan limits; workspace name, notification preferences, and usage thresholds persist in the selected backend.
- A Library that shows the real catalog in Firebase mode and placeholder records in demo mode. Free plans see the sample; browsing is not metered.
- An actually implemented **local-only** `GET /api/demo/catalog?type=text|audio|books`, authenticated by the workspace sandbox key. The playground shows real HTTP status, elapsed client time, request ID, body, and usage cost. This is not a claimed production content endpoint.
- Atomic backend demo metering and counters for content requests (astrology calculations included) and delivered audio bytes. Demo counters start at zero. Date-filtered daily charts and endpoint totals use server records; recent activity retains the latest 200 events.
- Exact content plans, each including astrology calculations.
- Administrator-only workspace listing/provisioning. Every privileged request checks the authenticated server-side role. Customers cannot invoke these operations.

Anyone can sign up from `/login`. A new account starts on its own Free workspace (500 calls a month, sandbox key ready) and never receives a paid plan automatically.

## Sign-in (web only)

`/login` uses email and password today, with Firebase creating accounts and sending password-reset emails. Email codes and phone codes are built but off: they appear when `RESEND_API_KEY` or `MANTRILO_PHONE_AUTH=true` is set, and a correct code signs in or creates the account. First sign-in then asks for a name, workspace name, and usage-alert preference. Settings can permanently delete a non-administrator account, including its workspace, API keys, and usage.

- **Email:** `server/email-codes.mjs` stores only a hash in `authCodes/{hash(email)}`. Codes expire after 10 minutes and allow 5 attempts. Each email gets one code per 30 seconds and 5 per hour; each IP gets 20 per hour. A correct code returns a Firebase custom token. Mail goes through Resend (`RESEND_API_KEY`, `MANTRILO_EMAIL_FROM`).
- **Phone (off by default):** Firebase phone auth with an invisible reCAPTCHA. Set `MANTRILO_PHONE_AUTH=true`, enable the Phone provider in Firebase, restrict its SMS regions, and use test numbers in development. SMS is billed per message.
- **Google:** a Firebase popup (`signInWithPopup`) creates the account on first sign-in. Enable the Google provider in Firebase Authentication, add every console host (`localhost`, `www.mantrilo.com`, the Cloud Run URL) to its authorized domains, and set `MANTRILO_GOOGLE_AUTH=true` in `.env.local`; `deployment/deploy.sh` copies the flag to both console services.
- **Session:** the browser holds Firebase auth in memory only, exchanges a fresh ID token for an HTTP-only, SameSite=Strict backend cookie (Secure and `__Host-` on HTTPS, up to 5 days), then signs out of the client SDK. Sessions are stored as hashes, and logout deletes the stored session.

To run with real Firebase, copy `.env.example` to the ignored `.env.local`, set `MANTRILO_MODE=firebase`, one exact `MANTRILO_APP_ORIGIN`, and the Firebase web config, then run `gcloud auth application-default login`. Add the console domain to Firebase authorized domains. The web API key is public configuration, not an Admin credential.

To test without real accounts, run `firebase emulators:start --only auth` and set `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`; with no Resend key, email codes print to the server log. Production startup rejects emulators.

On Cloud Run the console's service account needs `roles/firebaseauth.admin`, `roles/datastore.user`, and `roles/iam.serviceAccountTokenCreator` on itself. Never put service account credentials, keys, or passwords in `EXPO_PUBLIC_*`, browser code, logs, or Git.

Firestore and Storage rules deny all browser access. The backend uses IAM through the Admin SDK.

## Initial administrator bootstrap

The fixed initial administrator is **sri@mantrilo.com**. Supply `MANTRILO_INITIAL_ADMIN_PASSWORD` securely in `.env.local` or the process environment/Secret Manager. Do not put its value in a command argument or share it in chat.

```sh
npm run bootstrap:admin
```

The idempotent server-side command creates the account only when missing, requires a password of at least 12 characters for creation, preserves other existing custom claims, grants the admin claim, and creates a Free workspace/profile if missing. It **never resets an existing account’s password**. Bootstrap output does not print the password or generated credentials. Sign in again after bootstrap to refresh account access.

The command was tested with a fake Auth adapter; **no actual Firebase administrator account was created**, because project configuration and the securely supplied password are not available.

## Data and accounting

`../shared/content-plans.json` is the single content-pricing source used by both the marketing website and this backend. The developer server derives numeric allowances from it. Current content prices, requests, delivery allowances, product limits, catalog descriptions, and support are unchanged.

Astrology has no add-on or separate credits. Each successful calculation counts as one content request on the workspace's plan.

The demo policy is explicit: a successful authenticated fixture read consumes one **nonbillable demo content request**. Failures, unavailable operations, console browsing, and credential/settings management consume zero usage. Audio remains zero because delivery is not implemented. A successful astrology calculation consumes one content request. Monthly metering uses UTC calendar months; it is labeled a metering window, not an invented provider billing period.

The local store uses per-workspace serialized mutations. Firestore uses transactions so key status checks and usage reservations, or product-limit checks and registration, commit atomically. A revoked key or simultaneous request cannot trivially bypass these checks. Production throughput/load testing is still required: the single workspace-ledger document favors correctness and low-complexity setup over high-volume scaling. Compact counters are separate from the bounded recent-event list, so trimming logs does not reduce usage totals. General error logs omit request bodies, query strings, secrets, and exact birth details.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The engine, console, API, and sign-in tests cover unauthenticated access, CSRF/origin protection, logout replay prevention, one-time key disclosure/hashing, ownership isolation, key revocation, simultaneous quota reservations, product limits, administrator authorization, proposed configuration, exact plan totals, settings/date filters, and bootstrap idempotency. These tests use local in-memory adapters and test servers. Real Firebase email delivery, session signing, Firestore transactions/IAM, and Storage need a configured project or emulator verification before production use.

The Firebase client SDK is pinned to a Node 22-compatible release with matching app peers. The gRPC transport is patched via an explicit override rather than an unsafe major downgrade suggested by npm audit. Remaining dependency advisories must be reviewed as part of deployment maintenance; do not apply `npm audit fix --force` blindly.

All console HTML and responses are noindex; robots.txt disallows crawling. Robots directives are not access control. Actual workspace data always requires an authorized backend session. For a private Cloud Run preview, retain IAM authentication in addition to application authentication.

## GCP deployment preparation (not deployed)

Once billing is enabled on the `mantrilo` project, `deployment/deploy.sh` enables the services, creates the service accounts, builds both images with Cloud Build and deploys the API and console to Cloud Run. It always targets the `mantrilo` project, whatever the active `gcloud` project is, and is safe to run again. Store `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `RESEND_API_KEY` in Secret Manager as `stripe-secret-key`, `stripe-webhook-secret` and `resend-api-key`; the script attaches whichever exist. Cloud Run reserves `/healthz`, so check `/v1` instead.

Build using the repository root so the shared plan file is included:

```sh
docker build -f developer/deployment/Dockerfile -t mantrilo-developer .
```

The container runs as the non-root `node` user, defaults to Firebase mode, and listens on port 8080. Set the confirmed HTTPS `MANTRILO_APP_ORIGIN`, Firebase project/web configuration, and the service identity. Never run demo mode on Cloud Run; startup rejects it. Restrict the preview's invoker policy. No paid infrastructure or public deployment was provisioned. Docker/GCP verification requires those tools and project access.

## Stripe billing

Customers subscribe through Stripe Checkout and manage plans, cards and invoices in the Customer Portal. A plan only changes from Stripe's own records (`server/billing.mjs`): the Billing page asks Stripe about the customer saved on the workspace, and a signed webhook does the same in the background. A subscription keeps its plan while `past_due`, and returns to Free when it ends. Deleting an account cancels its subscription immediately.

**Without a webhook, a cancellation or failed renewal only takes effect when the customer next opens Billing, so their production keys keep working until then. Add the webhook before relying on this with real customers.**

1. Set `STRIPE_SECRET_KEY` and the three `STRIPE_PRICE_*` values from `.env.example` on the console, using a Stripe sandbox first.
2. Add `STRIPE_WEBHOOK_SECRET` and a webhook endpoint for `https://YOUR_CONSOLE/api/billing/webhook` with `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
3. In the default Customer Portal configuration for each Stripe mode, enable subscription cancellation and price changes. Add the exact prices configured as `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, and `STRIPE_PRICE_BUSINESS` to the subscription update product list. Set proration and cancellation timing in Stripe. Home and Usage & billing open Stripe Checkout for a new subscription and the confirmation screen for the selected price or cancellation for existing subscriptions.
4. Optional annual billing (20% off): create a yearly recurring price on each plan's Stripe product for its `annualTotal` in `shared/content-plans.json` ($479.99, $1,429.99 and $3,829.99; ₹14,399 and ₹47,999 for India from `shared/india-annual-totals.json`). Each is about 20% off twelve monthly payments, rounded up to end in 99; `annualPrice` is the per-month figure shown beside it. Set them as `STRIPE_PRICE_<PLAN>_ANNUAL` and `STRIPE_IN_PRICE_<PLAN>_ANNUAL` (`STRIPE_LIVE_…` for `deploy.sh`), and add them to the portal's subscription update product list. Billing checks each one's amount and yearly interval, and annual checkout stays unavailable until they pass. A plan change keeps the subscription's interval; request allowances reset monthly either way. The STARTER99 first-month offer applies to monthly billing only.

To test locally, run `stripe listen --forward-to localhost:4190/api/billing/webhook` and use the `whsec_` secret it prints.

## Still requiring configuration or implementation

1. The production authorized domain and the initial administrator bootstrap.
2. Confirm title and edition rights for public API distribution of books.
3. Setting `MANTRILO_API_URL` on the console, so Home and Docs can run real requests.
4. Detailed astrology scope beyond the implemented planetary positions and instant Panchang engine, and an exact ayanamsa model if required.
5. Notification/email delivery worker. Preferences and thresholds save correctly but do not send usage alerts yet.
6. Real-provider/emulator integration tests, production rate-limit/throughput assessment, dependency maintenance, and a native-session implementation if a full native console is later required.

## Browser checks performed

Verified demo login/logout, named key creation and one-time secret hiding, a real authenticated fixture request and HTTP/request metadata, usage increment from zero to one, key revocation, book verse selection, and mobile navigation/pricing without page-level overflow at 390px. Backend key/workspace isolation and concurrent quota tests use separate test stores. All exported console HTML is noindex; the browser bundle scan found no initial-password configuration or private-key material. The final runtime dependency audit reports zero high/critical and nine moderate advisories; these remain dependency-maintenance work rather than a claim of a full security audit.

## Working astrology engine

Open `/astrology` to calculate planetary positions or instant Panchang elements. The engine runs on the backend without an external provider. The same calculation is available at `POST /v1/astrology/calculate` with any API key. Each success counts as one content request on the workspace's plan. See [the engine contract, methodology, privacy and extension guide](server/astrology/README.md). The default Lahiri offset is explicitly approximate; custom ayanamsa values are supported.

## Personal promo for unlimited monthly requests

Generate a private code with `openssl rand -hex 24`. Set the console server's
`MANTRILO_UNLIMITED_PROMO` to a JSON object with the generated `code` and either the recipient's
exact `workspaceId` or their verified Mantrilo account `email`. For local demo testing, use the
email `developer@demo.invalid` and put the setting
in the developer console's ignored `.env.local`. For production, set the
`mantrilo-unlimited-promo` Secret Manager secret and bind it as `MANTRILO_UNLIMITED_PROMO` on
the serving Cloud Run console (including `mantrilo-console-hosting` when using Firebase Hosting).
The public API reads the redeemed entitlement from Firestore and does not need the secret.

Sign in to the designated workspace (or with the matching verified email) and go to
**Usage & billing → Redeem a promo code**.
Redemption removes the monthly request cap for the workspace across the API and console.
Paid plans normally control live key eligibility and catalog access. Rate and audio byte limits
still apply. Rotating or removing the configured code stops future redemptions; it does not
undo an existing grant. To revoke a grant, remove `unlimitedRequestsSince` from the workspace
document. Allow up to one minute for cached API keys to reflect the change.

A workspace with an unlimited promo can separately be granted live access by setting
`promoLiveAccess: true` on its workspace record. The console provisions a live key on the next
sign-in or refresh. This does not start a subscription or increase the plan's rate or audio limit.

## First month outreach code

`STARTER99` gives eligible new customers a first month for $0.99 USD on Starter, Growth, or
Business. The selected plan renews at its regular monthly price. Customers choose their
plan in Usage & billing and enter the code before continuing to Stripe Checkout.

Each plan uses its own Stripe promotion ID and a fixed amount coupon that applies once,
restricted to that plan's product. Configure the IDs through `STRIPE_STARTER_PROMOTION_ID`,
`STRIPE_GROWTH_PROMOTION_ID`, and `STRIPE_BUSINESS_PROMOTION_ID`. The console verifies the
Stripe quote before returning the Checkout link.

## Mantrilo billing portal branding

Mantrilo leaves the Stripe-hosted customer portal off by default. The console gives existing
subscribers a Mantrilo billing support link for invoices, payment updates, and subscription changes.

To opt into Stripe's hosted layout with Mantrilo branding:

1. On the Stripe account that bills Mantrilo, set the customer-facing business name to **Mantrilo**
   in [Public business information](https://dashboard.stripe.com/settings/public). If that Stripe
   account also bills another brand, use a dedicated Mantrilo account and plan the customer and
   subscription migration before changing production Stripe credentials.
2. In [Branding](https://dashboard.stripe.com/account/branding), upload `mantrilo-logo.png` and
   `mantrilo-icon.png` from `developer/assets`. Set the background to `#ffffff` and buttons to
   `#f28c28`. Preview in a Stripe sandbox before changing the live account.
3. Use an [active non-default portal configuration](https://docs.stripe.com/api/customer_portal/configurations/create)
   titled **Mantrilo Customer Portal** in its customer-facing headline. Verify the invoice,
   payment method, and cancellation settings. Set the serving console's
   `STRIPE_MANTRILO_PORTAL_CONFIGURATION` to its `bpc_...` ID.

The console checks the configuration and the account's branding before creating a portal
session. Leave that setting unset to keep the hosted portal disabled. The application never
creates an unbranded checkout session if Stripe rejects the Mantrilo branding.

### India billing

India pricing uses separate monthly INR Stripe prices for Starter and Growth. Configure
`STRIPE_IN_PRICE_STARTER` and `STRIPE_IN_PRICE_GROWTH` in the console service, and keep their
amounts in sync with `shared/india-prices.json`. For `deployment/deploy.sh`, set the matching
`STRIPE_LIVE_IN_PRICE_STARTER` and `STRIPE_LIVE_IN_PRICE_GROWTH` values in `developer/.env.local`.

When a customer requests India pricing, verify the billing address and run
`node scripts/india-pricing.mjs <workspace-id> enable` from the developer directory.
The workspace can then select India and subscribe in INR. Use `disable` to remove eligibility
for future checkouts. Handle INR plan changes and Business quotes through billing support.

## Blog

Articles live in the Firestore `articles` collection (document id = slug). Administrators write
them in the console under **Administration → Blog** (`/console/blog`; `www.mantrilo.com/admin/blog`
redirects there): paste Markdown with YAML frontmatter, check the parsed fields, then **Schedule**,
**Publish now** or **Save draft**. The next open Monday, Wednesday or Friday at 9:00 AM Eastern is
suggested; any day and time can be chosen.

- Access: the console's existing administrator flag (`npm run bootstrap:admin`), checked on the
  server for every `/api/admin/articles` call. No `ADMIN_EMAIL` variable is needed.
- Firestore rules stay deny-all. Only the console service reads and writes articles, with IAM.
- Public pages: `mantrilo-console-hosting` renders `/blog`, `/blog/category/{slug}`,
  `/blog/{slug}`, `/blog/sitemap.xml` and `/blog/feed.xml` (Firebase Hosting rewrites `/blog` and
  `/blog/**` to it). It fills the static site's `/blog-shell` page, so blog pages share the site's
  header, footer and styles. Pages are cached at the CDN for 2 minutes and the shell for 1, so a
  site deploy's new stylesheet reaches the blog within about 3 minutes.
- Scheduling needs no cron: every public page and the sitemap read only articles whose
  `publishAt` has passed, so a scheduled post appears within about 5 minutes of its time.
- `robots.txt` lists `/blog/sitemap.xml` beside the static sitemap.

One-time: create the index the public query uses (also in `deployment/firestore.indexes.json`):

```bash
gcloud firestore indexes composite create --project mantrilo --collection-group articles --query-scope COLLECTION --field-config field-path=status,order=ascending --field-config field-path=publishAt,order=descending
```

Release the hosting console (from the repository root). Its traffic is pinned to tagged
revisions, so deploy a tagged revision, check it, then move traffic:

```bash
IMAGE=us-central1-docker.pkg.dev/mantrilo/mantrilo/console:blog-$(date +%Y%m%d%H%M)
gcloud builds submit . --project mantrilo --region us-central1 --config developer/deployment/cloudbuild.yaml \
  --service-account projects/mantrilo/serviceAccounts/mantrilo-builder@mantrilo.iam.gserviceaccount.com \
  --substitutions _DOCKERFILE=developer/deployment/Dockerfile,_IMAGE=$IMAGE,_CONSOLE_BASE_PATH=/console
gcloud run deploy mantrilo-console-hosting --image $IMAGE --tag blog --no-traffic --project mantrilo --region us-central1
curl -s https://blog---mantrilo-console-hosting-bxjxj2ifdq-uc.a.run.app/blog | grep -o '<title>[^<]*'
gcloud run services update-traffic mantrilo-console-hosting --to-tags blog=100 --project mantrilo --region us-central1
```

Then deploy the site (`npm run build` with the production variables, `firebase deploy --only
hosting`) so `/blog-shell`, the rewrites and the robots.txt sitemap line go live.

Test locally: `npm test` covers parsing, the slot rule, admin access, scheduled publishing and the
rendered pages (`test/blog.test.mjs`). The public blog is only served when
`MANTRILO_CONSOLE_BASE_PATH` is set; in plain local demo mode use the console's Blog screen.
