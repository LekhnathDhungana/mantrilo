# Mantrilo public API

Read-only content API for B2B customers, served separately from the console. Every request needs a
key created in the Developer Console: `Authorization: Bearer mtr_live_…` (or `mtr_sbx_…`).

| Endpoint | Returns |
| --- | --- |
| `GET /v1` | API info (no key needed) |
| `GET /v1/shlokas?limit=&cursor=&deity=` | Shloka collections, 1–100 per page, cursor pagination |
| `GET /v1/shlokas/{id}` | One collection with verses, transliteration, translation, word meanings |
| `GET /v1/shlokas/{id}/audio` | `302` to a signed link valid 15 minutes (`?format=json` returns the link) |
| `GET /v1/mantras?limit=&cursor=&deity=` | Mantras |
| `GET /v1/mantras/{id}` | One mantra with text, transliterations and translations by language |

## How a request is handled

1. **Key** — hashed (SHA-256) and looked up in `apiKeys/{hash}`, which the console writes when keys
   are created or revoked. Cached 60 s, so a revoked key stops within a minute. Production keys need
   a paid plan. Ten bad keys from one IP are then throttled.
2. **Rate limit** — per key, by plan (`RATE_LIMITS` in `usage.mjs`); sandbox keys always get the
   Sandbox rate. In memory per instance.
3. **Allowance** — monthly requests and audio bytes from `shared/content-plans.json`. Usage is
   written as increments to `apiUsage/{workspace}_{YYYY-MM}_{0-9}` (sharded, no transactions) and
   totals are cached 30 s, so a quota can overshoot slightly; the stored totals are exact.
4. **Content** — read from Firestore with server credentials (client rules stay deny-all) and
   mapped to the public shape in `content.mjs`. Storage paths and internal fields are never returned.
   Sandbox keys see the first 5 items of each resource.
5. **Audio** — the file size is charged when the link is issued. The bucket stays private.

Only successful responses are charged.

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
