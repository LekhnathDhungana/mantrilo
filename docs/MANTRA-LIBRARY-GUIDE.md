# Build a mantra library on the Mantrilo API

A guide for customers who want a browsable, searchable mantra library in their own app or site. Everything below matches the API as it runs today (`developer/api/server.mjs`), except where a section is marked **Proposed**.

## 1. Architecture: call Mantrilo from your backend

```
Your app / browser ──▶ Your backend (holds the key, caches) ──▶ api.mantrilo.com/v1
```

- **Keep the key on your server.** The API sends no CORS headers on purpose; browser calls fail. Store `MANTRILO_API_KEY` in your secret manager and never ship it in an app bundle.
- **Use the right key.** Your sandbox key (`mtr_sbx_…`) works on every plan but returns only the 5-item sample, with `"sandbox": true` on every response. Your live key (`mtr_live_…`) comes with a paid plan and reads the full catalog.
- **Pass errors through by code, not message.** Every error is `{"error": {"code", "message"}, "requestId"}`.

## 2. Browse: list mantras with cursor pagination

```bash
curl "https://api.mantrilo.com/v1/mantras?limit=50" \
  -H "Authorization: Bearer $MANTRILO_API_KEY"
```

| Parameter | Values                                                       | Notes                                                        |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `limit`   | 1–100, default 20                                            | Anything else is `400 invalid_limit` and costs nothing.      |
| `cursor`  | the `nextCursor` from the previous page                      | Opaque. A malformed one is `400 invalid_cursor`.             |
| `deity`   | a deity **id**, e.g. `shiva`, `devi`, `annapurna`            | Exact match. 1–60 letters, digits, spaces, dots or dashes.   |

Response:

```json
{
  "data": [
    {
      "id": "annapurna-aham-vaishvanaro-bhuthva",
      "title": "…",
      "deity": { "id": "annapurna", "name": "…" },
      "category": "…",
      "source": "…",
      "description": "…",
      "verseCount": 1,
      "audio": { "href": "/v1/mantras/annapurna-aham-vaishvanaro-bhuthva/audio" }
    }
  ],
  "nextCursor": "ZGV2aS1rYW5ha2FkaGFyYS1zdG90cmFt",
  "requestId": "…"
}
```

- Items come in a stable order (by id), so pages never overlap or skip, even while you page slowly.
- `nextCursor` is `null` on the last page. A cursor is tied to its filters, so start again from page 1 when the user changes a filter.
- `audio` is `null` when there is no recording.
- `description` is the short, reviewed summary of the mantra, or `null` when it has none.

## 3. Search

**Today:** `/v1` has no text search. The only server-side filter is `deity`. Filtering on `deity` is the closest thing to a search and costs one request per call.

**Proposed** (needs a search index; Firestore can't do text search on its own):

| Parameter  | Matches                                                         |
| ---------- | --------------------------------------------------------------- |
| `q`        | Title, deity name and transliteration (case- and accent-insensitive, prefix match), min 2 characters |
| `deity`    | As today: exact deity id                                        |
| `category` | Exact category                                                  |
| `hasAudio` | `true` or `false`                                               |

How they combine:

- Filters are ANDed together.
- `q` searches within whatever the filters allow.
- Results stay in a stable order and page with the same `cursor`. A cursor is valid only for the exact `q` and filters it came from; anything else is `400 invalid_cursor`.
- Zero matches still return `200` with `data: []`, and that counts as one request.

**Debounce on your side.** Every search call is a billed request:

- wait about 300 ms after the last keystroke;
- don't search under 2 characters;
- cancel the in-flight request when a new one starts;
- cache results by the normalized query (trimmed, lowercased) on your backend.

A user typing "shiva" then costs one request, not five.

## 4. Open an entry by its stable ID

```bash
curl "https://api.mantrilo.com/v1/mantras/annapurna-aham-vaishvanaro-bhuthva" \
  -H "Authorization: Bearer $MANTRILO_API_KEY"
```

The detail response is the list summary plus `verses`:

```json
{
  "data": {
    "id": "…", "title": "…", "deity": { "id": "…", "name": "…" },
    "category": "…", "source": "…", "description": "…",
    "verseCount": 1, "audio": { "href": "…" },
    "verses": [
      {
        "number": 1, "title": "…",
        "sanskrit": "…", "transliteration": "…", "translation": "…",
        "wordMeanings": [{ "word": "…", "meaning": "…" }]
      }
    ]
  }
}
```

**What belongs in list results vs. detail.** Lists carry what you need for a results row and for filtering: id, title, deity, category, source, a short description, verse count and whether audio exists. The verse text, translations and word meanings are long, so they come only from the detail call. Build list screens from list responses alone, and fetch detail only when someone opens an item.

- **IDs are stable.** Store them in your database, URLs and bookmarks. An unknown id is `404 not_found` and costs nothing.
- **Audio:** `GET /v1/mantras/{id}/audio` redirects to a short-lived signed link. Add `?format=json` to get `{url, expiresAt, bytes, contentType}` instead. It counts as one request, and its file size counts against your monthly audio allowance. Don't store the signed URL; request a fresh one when it expires.

## 5. Cache on your backend

Mantrilo sends `Cache-Control: no-store` because responses are per-account. Caching is your backend's job:

| What                | Suggested TTL | Key                                 |
| ------------------- | ------------- | ----------------------------------- |
| List pages          | 1–6 hours     | path + `limit` + `cursor` + filters |
| Mantra detail       | 24 hours      | id                                  |
| Search results      | 15–60 minutes | normalized query + filters + cursor |
| Signed audio URL    | until `expiresAt` minus 1 minute | id                 |

A request served from your cache never reaches Mantrilo and costs nothing.

**Content terms:** final content-license terms haven't been published yet (see `/license`). Until they are, cache only to serve your own users, keep `source` visible next to the text, and don't redistribute the catalog as a dataset. Treat the TTLs above as an assumption until the license confirms them.

## 6. Bulk sync or export

**Today:** there is no bulk endpoint. To build an offline or searchable copy, page through `/v1/mantras?limit=100` and fetch detail for each id:

```
pages  = ceil(catalogSize / 100)
cost   = pages + catalogSize        (one detail call per mantra)
```

Re-sync incrementally: list pages are cheap, so re-fetch detail only for ids you haven't seen.

**Rights needed first.** Before storing a full copy, you need written confirmation that your plan's content license allows it: storage duration, offline use, search indexing, and attribution per `source`. Text, translation and recording can each carry different rights.

**Proposed:** a signed, dated export (`GET /v1/exports/mantras`) that's billed once per export rather than per item, available only to plans whose license allows it.

## 7. What counts toward your plan

| Call                                                                 | Proposed | Today                                                         |
| -------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| List page fetch                                                      | 1        | 1                                                             |
| Search call                                                          | 1        | No search endpoint; a `deity`-filtered list costs 1           |
| Detail fetch                                                         | 1        | 1                                                             |
| Search with zero matches                                             | 1        | A filtered list with `data: []` costs 1                       |
| Hit in **your** cache                                                | 0        | 0, because it never reaches Mantrilo                          |
| Rejected: invalid input (`400`)                                      | 0        | 0, checked before anything is counted                         |
| Rejected: auth (`401`, `403 plan_inactive`)                          | 0        | 0                                                             |
| Rejected: rate limit (`429 rate_limited`)                            | 0        | 0                                                             |
| Rejected: quota (`429 quota_exceeded`)                               | 0        | 0, and the allowance is a hard stop with no overage           |
| Unknown id (`404`), outside the sandbox sample (`403`)               | n/a      | 0, refunded                                                   |
| Mantrilo server error (`5xx`)                                        | 0        | 0, refunded                                                   |
| Success served from Mantrilo's own cache                             | 1        | 1, every success counts the same                              |
| Audio link                                                           | n/a      | 1 request, plus the file size against the audio allowance     |

Differences from the terms published before this change:

1. **Sandbox and live keys are now metered separately**, and each gets the plan's monthly allowance. Before, they shared one allowance.
2. **Refusals are guaranteed free.** Invalid input is rejected before counting, and 404s, sandbox-sample refusals and server errors are refunded. The public docs said only that "successful responses count"; the refund behaviour is new and explicit.
3. **The allowance is now exact under concurrency** (see below). Before, cached totals could let a burst of parallel calls run slightly past the limit.
4. **No search is billed yet**, because no search exists.

Your remaining allowance comes back on every counted call in `X-Quota-Requests-Remaining`.

## 8. How limits stay consistent under concurrent calls

- **Per account, not per key.** All live keys of one workspace share one counter, and all sandbox keys share another. Adding keys never adds capacity.
- **Far from the limit**, each API instance counts against a briefly cached total (up to 30 s). That's fast, and it can't overshoot, because the cache is only trusted while the account is further from its limit than a safety margin. The margin is the most traffic every instance together could have served unseen in that window (at least 100 requests, or plan rate × 30 s × 10 instances).
- **Within the margin**, every request is checked and counted in one Firestore transaction. The transaction reads every usage shard and writes the new count atomically, so two parallel requests can't both take the last unit; one of them gets `429 quota_exceeded`.
- **Refunds** are written after the response. For a moment after a refused or failed call, the allowance can look one lower than it is, so the error always falls on the safe side: never over the limit.
- **Rate limits** (requests per second, burst) are per workspace and key type, per API instance. They're there for abuse protection, not billing.

Verified locally:

- 25 parallel calls with 5 units left gave exactly 5 × `200` and 20 × `429`.
- In real Firestore, 12 parallel reservations against a limit of 5 stored exactly 5.

## 9. Worked example: 6 requests

Two pages of 50, one search (today: a `deity` filter), and three opens. These are measured against the real catalog on a Starter workspace (50,000 calls a month):

```bash
H="Authorization: Bearer $MANTRILO_API_KEY"; API=https://api.mantrilo.com

curl "$API/v1/mantras?limit=50" -H "$H"                                   # 1 → remaining 49,999
curl "$API/v1/mantras?limit=50&cursor=ZGV2aS1rYW5ha2FkaGFyYS1zdG90cmFt" -H "$H"   # 2 → 49,998
curl "$API/v1/mantras?deity=annapurna&limit=50" -H "$H"                   # 3 → 49,997 (5 matches)
curl "$API/v1/mantras/annapurna-aham-vaishvanaro-bhuthva" -H "$H"         # 4 → 49,996
curl "$API/v1/mantras/devi-karaagre-vasathe" -H "$H"                      # 5 → 49,995
curl "$API/v1/mantras/annapurna-aham-vaishvanaro-bhuthva" -H "$H"         # 6 → 49,994
```

**Total: 6 requests.**

- The 6th call re-opened an entry from call 4. With a 24-hour detail cache on your backend (section 5) it would have cost 0, making the total 5.
- In the same run, `GET /v1/mantras/not-a-real-id` (404) and `GET /v1/mantras?limit=500` (400) both left the remaining count unchanged.

The cursor value above is real today, but cursors are opaque: always use the one the previous page returned.

## Open decisions

1. **Search:** whether to add `q` and the other filters in section 3, and which index to use (an external search service, or precomputed token arrays in Firestore).
2. **Overage:** none exists, so the allowance is a hard stop. The alternatives are metered overage in Stripe, or automatic upgrade prompts.
3. **Sandbox allowance:** sandbox keys currently get the full plan allowance on their own counter. A small fixed cap (say 1,000 a month) may suit testing better.
4. **Content license:** caching TTLs, offline storage, search indexing and bulk export all wait on the published license (`/license` is a status page today).
5. **Bulk export:** whether to offer the per-export billing proposed in section 6, and on which plans.
