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
- Demo explorer with searchable text/audio/book fixtures, JSON previews, and chapter/verse navigation. No recording is supplied, so no audio is fetched or falsely played.
- An actually implemented **local-only** `GET /api/demo/catalog?type=text|audio|books`, authenticated by a sandbox API key. The playground shows real HTTP status, elapsed client time, request ID, body, and usage cost. This is not a claimed production content endpoint.
- Atomic backend demo metering and independent counters for content requests, delivered audio bytes, and astrology credits. Demo counters start at zero. Date-filtered daily charts and endpoint totals use server records; recent activity retains the latest 200 events.
- Exact content plans and proposed astrology add-on comparisons. All purchases are disabled. No redirect can activate a plan or set paid status.
- Administrator-only workspace listing/provisioning and configurable **proposed** astrology credit allowances. Every privileged request checks the authenticated server-side role. Customers cannot invoke these operations.

No public registration was added. Customer provisioning assigns an **existing Firebase Auth user** to a Sandbox workspace; it does not create a paid subscription.

## Configure real Firebase authentication

Copy `.env.example` to the ignored `.env.local`. Select `MANTRILO_MODE=firebase`, set a single exact `MANTRILO_APP_ORIGIN`, and supply the Firebase project and web app configuration. Enable Firebase email/password authentication and authorize the console domain in the Firebase project. These are account setup steps, not actions performed by this implementation.

The Firebase web API key is public project configuration and is returned by `/api/auth/config`; it is not an Admin SDK credential. Firebase client authentication uses **in-memory persistence**, exchanges a recently authenticated ID token for a backend session, and signs out the client SDK. The backend sets an HTTP-only, SameSite=Strict cookie (Secure and `__Host-` scoped for HTTPS). Sessions last up to five days. Active sessions are stored as hashes in Firestore; logout deletes the current stored session, preventing replay. Revocation/disabled-account checks and current administrator claims are checked server-side.

Use Application Default Credentials locally and the Cloud Run service identity in GCP. Never put private service account credentials, passwords, or keys in `EXPO_PUBLIC_*`, browser code, logs, or Git. Optional Auth/Firestore emulators are supported via the standard environment variables and are rejected in production/Cloud Run.

Firestore and Storage rule templates deny direct browser access. The backend uses IAM through the Admin SDK. Review service-account least privilege before deployment. Deploying rules or creating cloud resources is an owner-controlled production step; neither was done here.

## Initial administrator bootstrap

The fixed initial administrator is **bebaslekhnath@gmail.com**. Supply `MANTRILO_INITIAL_ADMIN_PASSWORD` securely in `.env.local` or the process environment/Secret Manager. Do not put its value in a command argument or share it in chat.

```sh
npm run bootstrap:admin
```

The idempotent server-side command creates the account only when missing, requires a password of at least 12 characters for creation, preserves other existing custom claims, grants the admin claim, and creates a Sandbox workspace/profile if missing. It **never resets an existing account’s password**. Bootstrap output does not print the password or generated credentials. Sign in again after bootstrap to refresh account access.

The command was tested with a fake Auth adapter; **no actual Firebase administrator account was created**, because project configuration and the securely supplied password are not available.

## Data and accounting

`../shared/content-plans.json` is the single content-pricing source used by both the marketing website and this backend. The developer server derives numeric allowances from it. Current content prices, requests, delivery allowances, product limits, catalog descriptions, and support are unchanged.

Proposed astrology add-ons are separate in `server/domain.mjs`: $29/2,000 provisional credits, $79/10,000, and $199/40,000. Matching combined totals are $78, $228, and $598. Administrators can change provisional credit allowances in server-side configuration; prices are not silently changed and settings never enable purchases. There are no live astrology operations, endpoint costs, calculation claims, or purchased balances.

The demo policy is explicit: a successful authenticated fixture read consumes one **nonbillable demo content request**. Failures, unavailable operations, console browsing, and credential/settings management consume zero usage. Audio and astrology remain zero because no delivery/calculation is implemented. Monthly metering uses UTC calendar months; it is labeled a metering window, not an invented provider billing period.

The local store uses per-workspace serialized mutations. Firestore uses transactions so key status checks and usage reservations, or product-limit checks and registration, commit atomically. A revoked key or simultaneous request cannot trivially bypass these checks. Production throughput/load testing is still required: the single workspace-ledger document favors correctness and low-complexity setup over high-volume scaling. Compact counters are separate from the bounded recent-event list, so trimming logs does not reduce usage totals. General error logs omit request bodies, query strings, secrets, and exact birth details.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Nine backend tests cover unauthenticated access, CSRF/origin protection, logout replay prevention, one-time key disclosure/hashing, ownership isolation, key revocation, simultaneous quota reservations, product limits, administrator authorization, proposed configuration, exact plan totals, settings/date filters, and bootstrap idempotency. These tests use local in-memory adapters and test servers. Real Firebase email delivery, session signing, Firestore transactions/IAM, and Storage need a configured project or emulator verification before production use.

The Firebase client SDK is pinned to a Node 22-compatible release with matching app peers. The gRPC transport is patched via an explicit override rather than an unsafe major downgrade suggested by npm audit. Remaining dependency advisories must be reviewed as part of deployment maintenance; do not apply `npm audit fix --force` blindly.

All console HTML and responses are noindex; robots.txt disallows crawling. Robots directives are not access control. Actual workspace data always requires an authorized backend session. For a private Cloud Run preview, retain IAM authentication in addition to application authentication.

## GCP deployment preparation (not deployed)

Build using the repository root so the shared plan file is included:

```sh
docker build -f developer/deployment/Dockerfile -t mantrilo-developer .
```

The container runs as the non-root `node` user, defaults to Firebase mode, and listens on port 8080. Set the confirmed HTTPS `MANTRILO_APP_ORIGIN`, Firebase project/web configuration, and the service identity. Never run demo mode on Cloud Run; startup rejects it. Restrict the preview's invoker policy. No paid infrastructure or public deployment was provisioned. Docker/GCP verification requires those tools and project access.

## Still requiring configuration or implementation

1. Firebase project, email/password provider, authorized domains, ADC/IAM, and Firestore. Supply the initial admin password securely, then run bootstrap.
2. Real catalog data, source/language coverage, content license, production API contract, and request accounting. The explorer/playground only work with local fixtures until a real adapter is added.
3. Cloud Storage audio assets, permissions, signed delivery URLs, playback coverage, and authoritative delivered-byte accounting.
4. Billing provider, server-verified subscription webhooks, customer portal, invoices, renewal periods, and entitlement updates. No purchase/upgrade flows are active.
5. Astrology scope, supported operations, documented inputs/outputs, credit costs, and final accounting/billing decisions. Proposed add-ons cannot be purchased.
6. Notification/email delivery worker. Preferences and thresholds save correctly but do not send usage alerts yet.
7. Real-provider/emulator integration tests, production rate-limit/throughput assessment, dependency maintenance, and a native-session implementation if a full native console is later required.

## Browser checks performed

Verified demo login/logout, named key creation and one-time secret hiding, a real authenticated fixture request and HTTP/request metadata, usage increment from zero to one, key revocation, book verse selection, administrator proposed-credit saving, and mobile navigation/pricing without page-level overflow at 390px. Backend key/workspace isolation and concurrent quota tests use separate test stores. All exported console HTML is noindex; the browser bundle scan found no initial-password configuration or private-key material. The final runtime dependency audit reports zero high/critical and nine moderate advisories; these remain dependency-maintenance work rather than a claim of a full security audit.
