# Mantrilo public API

Read-only content API for B2B customers, served separately from the console. Every request needs a
key created in the Developer Console: `Authorization: Bearer mtr_live_…` (or `mtr_sbx_…`).

| Endpoint                                        | Returns                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /v1`                                       | API info (no key needed)                                                          |
| `GET /v1/mantras?limit=&cursor=&deity=`         | Mantras, filtered by deity id                                                     |
| `GET /v1/mantras/{id}`                          | One mantra with its verses: Sanskrit, transliteration, translation, word meanings |
| `GET /v1/mantras/{id}/audio`                    | A 15-minute signed recording link (`?format=json` for JSON)                       |
| `GET /v1/books?cursor=`                         | Book catalog, up to 24 titles per page                                            |
| `GET /v1/books/{id}`                            | Book metadata and chapter index                                                   |
| `GET /v1/books/{id}/chapters/{chapter}?offset=` | Chapter metadata and verse pages or prose sections                                |
| `GET /v1/astrology`                             | Lists enabled astrology operations and available example inputs                   |
| `POST /v1/astrology/calculate`                  | Charts, Panchang, Guna Milan, chart images, place search and planetary positions  |

Pass the catalog's `nextCursor` as `cursor`, and a chapter's `data.nextOffset` as `offset`.
`/v1/shlokas` is the former name of `/v1/mantras` and still answers the same way, so existing
integrations keep working. Mantras are stored in the `shlokam` Firestore collection.

## English prose retellings

Use a live key to fetch `GET /v1/books/ramayana` (22 chapters) or
`GET /v1/books/mahabharata` (62 chapters). Both books have `format: "prose"`
and `language: "en"`. Fetch `GET /v1/books/{id}/chapters/{chapter}` for a
chapter's source citation and ordered `sections`. Each section includes its
title and prose in `paragraphs`. Prose chapters return all sections in one
response, with an empty `verses` array and `nextOffset: null`.

## Astrology

Send a JSON body with an `operation`. Each successful request uses one content request.

| Operation               | Inputs                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `chart`                 | `birth`, optional `divisions` (default `[1,9]`), `dashaLevels` (0–3), and `referenceDate` (required when Dasha depth is nonzero) |
| `daily-panchang`        | `date`, `latitude`, `longitude`, `timezone`                                                                                      |
| `match`                 | `person1` and `person2`, each a birth object                                                                                     |
| `chart-image`           | `birth`, optional `divisions` and `layout` (`north`, `south` or `east`). Returns a PNG as `data.imageBase64`.                    |
| `places`                | `query`, optional `country` (uppercase two-letter code) and `limit` (1–10)                                                       |
| `positions`, `panchang` | `datetime` and optional `ayanamsaDegrees`                                                                                        |

For Western, numerology, and additional Vedic operations, use the operation ID from
`GET /v1/astrology` and send its input under `parameters`:

```json
{
  "operation": "numerology-profile",
  "parameters": {
    "method": { "system": "pythagorean" },
    "subject": { "birth_date": "1992-07-16" },
    "date_context": { "reference_date": "2026-11-12" }
  }
}
```

Calculation data comes back in `data.result`. Image operations return `data.imageBase64`
and `data.contentType`. The Developer Console groups operations by category and supplies
sample inputs where available.

A birth object contains `datetime` with an explicit UTC offset and seconds set to 00,
`latitude`, `longitude`, and an IANA `timezone`. Dates use YYYY-MM-DD. Requests that fall
in a repeated local hour are rejected. The console’s Docs → Astrology tab has runnable examples.

## How a request is handled

1. **Key** — hashed (SHA-256) and looked up in `apiKeys/{hash}`, which the console writes when keys
   are created or revoked. Cached 60 s, so a revoked key stops within a minute. Live keys need a
   paid plan or an explicit live promo grant. New keys end in a checksum, so made-up keys are
   refused without a read. After ten
   bad keys from one IP, that IP can't trigger lookups until its allowance refills. Accepting keys
   without a checksum is only for those issued before it existed.
2. **Rate limit** — per workspace and environment, by plan (`RATE_LIMITS` in `usage.mjs`), so extra
   keys don't add capacity; sandbox keys always get the Free rate. In memory per instance. Client
   IPs come from the last `X-Forwarded-For` entry, which assumes no load balancer in front of Cloud Run.
3. **Allowance** — monthly requests and audio bytes from `shared/content-plans.json`. Usage is
   written as increments to `apiUsage/{workspace}_{YYYY-MM}_{0-9}` (sharded, no transactions) and
   totals are cached 30 s, so a quota can overshoot slightly; the stored totals are exact. Each
   key's last use goes to `apiKeyActivity/{workspace}`, at most once a minute per instance. The console's
   Overview and Usage screens read these same documents.
4. **Content** — read from Firestore with server credentials (client rules stay deny-all) and
   mapped to the public shape in `content.mjs`. Storage paths and internal fields are never returned.
   Sandbox keys get a small sample of text resources. For books, they see the first three verses
   of the first chapter of each sample title. Live keys can read the published catalog.
5. **Audio** — the file size is charged when the link is issued. The bucket stays private.

Only successful responses are charged.

Workspaces with the unlimited requests promo receive `X-Quota-Requests-Remaining: unlimited`
instead of a number on metered routes. Successful calls still appear in usage. Rate limits,
audio allowances, and API key permissions still apply. An existing API key may take up to one
minute to pick up the workspace change. An explicitly granted live-access promo can unlock the
production catalog without changing the workspace’s billing plan.

## Console

The console's Docs use `MANTRILO_API_URL` (for example `https://api.mantrilo.com`; run locally
against Firebase it defaults to `http://127.0.0.1:4191`). The
API has no CORS, so the Playground relays requests through `POST /api/playground` on the console.
Local demo mode runs this server over placeholder data (`demo.mjs`) on the console's port + 100.

## Run locally

```sh
gcloud auth application-default login
FIREBASE_PROJECT_ID=mantrilo MANTRILO_API_SIGNER=mantrilo-api@mantrilo.iam.gserviceaccount.com npm run api
```

`MANTRILO_API_SIGNER` lets local user credentials sign media links by impersonating the API service
account (you need `roles/iam.serviceAccountTokenCreator` on it). Tests: `npm test`.

## Deploy (Cloud Run)

Runtime service account `mantrilo-api@mantrilo.iam.gserviceaccount.com` needs:
`roles/datastore.user` (project), `roles/storage.objectViewer` on `gs://mantrilo-media`, and
`roles/iam.serviceAccountTokenCreator` on itself (to sign links). Build with
`deployment/api.Dockerfile`, set `FIREBASE_PROJECT_ID=mantrilo`, and map `api.mantrilo.com`.

Set `MANTRILO_ASTROLOGY_API_KEY` on the API and console servers to enable the location-based
operations. The deployment script binds the `mantrilo-astrology-api-key` Secret Manager secret
to both services when it exists.
