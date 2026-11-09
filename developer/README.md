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
- Named API key creation; 256-bit random secrets shown once; SHA-256 hashes stored privately; masked prefixes thereafter; creation/last-used times; sandbox/production distinction; revocation; workspace isolation.
- Server-enforced product registration and plan limits; workspace name, notification preferences, and usage thresholds persist in the selected backend.
- A Library that shows the real catalog in Firebase mode and placeholder records in demo mode. Free plans see the sample; browsing is not metered.
- An actually implemented **local-only** `GET /api/demo/catalog?type=text|audio|books`, authenticated by a sandbox API key. The playground shows real HTTP status, elapsed client time, request ID, body, and usage cost. This is not a claimed production content endpoint.
- Atomic backend demo metering and counters for content requests (astrology calculations included) and delivered audio bytes. Demo counters start at zero. Date-filtered daily charts and endpoint totals use server records; recent activity retains the latest 200 events.
- Exact content plans, each including astrology calculations.
- Administrator-only workspace listing/provisioning. Every privileged request checks the authenticated server-side role. Customers cannot invoke these operations.

Anyone can sign up from `/login`. A new account starts on its own Sandbox workspace and never receives a paid plan automatically.

## Sign-in (web only)

`/login` uses email and password today, with Firebase creating accounts and sending password-reset emails. Email codes and phone codes are built but off: they appear when `RESEND_API_KEY` or `MANTRILO_PHONE_AUTH=true` is set, and a correct code signs in or creates the account. First sign-in then asks for a name, workspace name, and usage-alert preference. Settings can permanently delete a non-administrator account, including its workspace, API keys, and usage.

- **Email:** `server/email-codes.mjs` stores only a hash in `authCodes/{hash(email)}`. Codes expire after 10 minutes and allow 5 attempts. Each email gets one code per 30 seconds and 5 per hour; each IP gets 20 per hour. A correct code returns a Firebase custom token. Mail goes through Resend (`RESEND_API_KEY`, `MANTRILO_EMAIL_FROM`).
- **Phone (off by default):** Firebase phone auth with an invisible reCAPTCHA. Set `MANTRILO_PHONE_AUTH=true`, enable the Phone provider in Firebase, restrict its SMS regions, and use test numbers in development. SMS is billed per message.
- **Session:** the browser holds Firebase auth in memory only, exchanges a fresh ID token for an HTTP-only, SameSite=Strict backend cookie (Secure and `__Host-` on HTTPS, up to 5 days), then signs out of the client SDK. Sessions are stored as hashes, and logout deletes the stored session.

To run with real Firebase, copy `.env.example` to the ignored `.env.local`, set `MANTRILO_MODE=firebase`, one exact `MANTRILO_APP_ORIGIN`, and the Firebase web config, then run `gcloud auth application-default login`. Add the console domain to Firebase authorized domains. The web API key is public configuration, not an Admin credential.

To test without real accounts, run `firebase emulators:start --only auth` and set `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`; with no Resend key, email codes print to the server log. Production startup rejects emulators.

On Cloud Run the console's service account needs `roles/firebaseauth.admin`, `roles/datastore.user`, and `roles/iam.serviceAccountTokenCreator` on itself. Never put service account credentials, keys, or passwords in `EXPO_PUBLIC_*`, browser code, logs, or Git.

Firestore and Storage rules deny all browser access. The backend uses IAM through the Admin SDK.

## Initial administrator bootstrap

The fixed initial administrator is **bebaslekhnath@gmail.com**. Supply `MANTRILO_INITIAL_ADMIN_PASSWORD` securely in `.env.local` or the process environment/Secret Manager. Do not put its value in a command argument or share it in chat.

```sh
npm run bootstrap:admin
```

The idempotent server-side command creates the account only when missing, requires a password of at least 12 characters for creation, preserves other existing custom claims, grants the admin claim, and creates a Sandbox workspace/profile if missing. It **never resets an existing account’s password**. Bootstrap output does not print the password or generated credentials. Sign in again after bootstrap to refresh account access.

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

Build using the repository root so the shared plan file is included:

```sh
docker build -f developer/deployment/Dockerfile -t mantrilo-developer .
```

The container runs as the non-root `node` user, defaults to Firebase mode, and listens on port 8080. Set the confirmed HTTPS `MANTRILO_APP_ORIGIN`, Firebase project/web configuration, and the service identity. Never run demo mode on Cloud Run; startup rejects it. Restrict the preview's invoker policy. No paid infrastructure or public deployment was provisioned. Docker/GCP verification requires those tools and project access.

## Stripe billing

Customers subscribe through Stripe Checkout and manage plans, cards and invoices in the Customer Portal. A plan only changes from Stripe's own records (`server/billing.mjs`): the Billing page asks Stripe about the customer saved on the workspace, and a signed webhook does the same in the background. A subscription keeps its plan while `past_due`, and returns to Sandbox when it ends. Deleting an account cancels its subscription immediately.

**Without a webhook, a cancellation or failed renewal only takes effect when the customer next opens Billing, so their production keys keep working until then. Add the webhook before relying on this with real customers.**

1. Set `STRIPE_SECRET_KEY` and the three `STRIPE_PRICE_*` values from `.env.example` on the console, using a Stripe sandbox first.
2. Add `STRIPE_WEBHOOK_SECRET` and a webhook endpoint for `https://YOUR_CONSOLE/api/billing/webhook` with `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
3. In the Customer Portal settings, allow cancelling, card updates, invoice history, and switching between the three plans.

To test locally, run `stripe listen --forward-to localhost:4190/api/billing/webhook` and use the `whsec_` secret it prints.

## Still requiring configuration or implementation

1. The production authorized domain and the initial administrator bootstrap.
2. The content license, and `/v1` endpoints for books.
3. Setting `MANTRILO_API_URL` on the console, so Home and Docs can run real requests.
4. Detailed astrology scope beyond the implemented planetary positions and instant Panchang engine, and an exact ayanamsa model if required.
5. Notification/email delivery worker. Preferences and thresholds save correctly but do not send usage alerts yet.
6. Real-provider/emulator integration tests, production rate-limit/throughput assessment, dependency maintenance, and a native-session implementation if a full native console is later required.

## Browser checks performed

Verified demo login/logout, named key creation and one-time secret hiding, a real authenticated fixture request and HTTP/request metadata, usage increment from zero to one, key revocation, book verse selection, and mobile navigation/pricing without page-level overflow at 390px. Backend key/workspace isolation and concurrent quota tests use separate test stores. All exported console HTML is noindex; the browser bundle scan found no initial-password configuration or private-key material. The final runtime dependency audit reports zero high/critical and nine moderate advisories; these remain dependency-maintenance work rather than a claim of a full security audit.

## Working astrology engine

Open `/astrology` to calculate planetary positions or instant Panchang elements. The engine runs on the backend without an external provider. The same calculation is available at `POST /v1/astrology/calculate` with any API key. Each success counts as one content request on the workspace's plan. See [the engine contract, methodology, privacy and extension guide](server/astrology/README.md). The default Lahiri offset is explicitly approximate; custom ayanamsa values are supported.
