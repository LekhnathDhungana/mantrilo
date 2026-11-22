# Catalog pages plan: one page per mantra, book and astrology capability

Status: plan, not started. Written 2026-11-19.

## Goal

Grow mantrilo.com from 22 known URLs (11 indexed, Search Console 2026-11-15) to roughly 680 pages
that each document one real item in the API catalog. Every page is **API documentation first**:
what the endpoint returns for this item, how to request it, and what the fields mean, with the item's
own content shown as the example. Mantra pages can play the recording.

In scope: astrology capabilities, books (plus chapters), mantras.
Out of scope: per-verse pages, articles.

## Page inventory

| Area | Route | Count | Source |
| --- | --- | --- | --- |
| Astrology capability | `/astrology-api/{capability}` | 60 (3 exist today) | `developer/src/data/published-astrology.json` + `integrations.ts` |
| Book | `/library/books/{book}` | 33 (8 exist today) | `books/**/*.json` + books API catalogue (`developer/server/pustak.mjs`) |
| Book chapter | `/library/books/{book}/{chapter}` | about 87 (multi-chapter books only) | `books/**/*.json` |
| Mantra | `/library/mantras/{slug}` | about 460 after merging duplicates (1 exists today) | Firestore `shlokam` (671 records, 343 with audio) |
| Mantra deity hub | `/library/mantras/deity/{deity}` | about 35 | `shlokam` `deityKey` |
| Hubs | `/library/mantras`, `/library/books`, `/astrology-api` | 3 | the above |
| **Total new** | | **about 665** | |

Books with a single chapter (most Prakarana Granthas, the Ramana Maharshi works, Isha, Kaivalya and
Mandukya) get a book page only. Multi-chapter books are Bhagavad Gita (18), Ashtavakra Gita (20),
Avadhuta Gita (8), Chandogya (8), Prashna (6), Brahma Sutras (4), Yoga Sutras (4), Kena (4),
Mundaka (3), Taittiriya (3) and Katha (2).

## Page templates

Every template uses the existing site chrome (`SiteFrame`, `PageHero`, `CodePanel`, `KeyButton`) and
the same two-column split as `MantraPreview.web.tsx`: content on the left, the API on the right.

### Mantra page — `/library/mantras/{slug}`

Title: `{Title} — Mantra API Reference | Mantrilo`.
Description: built from `seoDescription`, ending with what the API returns.

1. Hero: title, deity link(s), category, source, verse count, "Recording available" badge.
2. **Request**: `GET /v1/mantras/{id}` as curl, JavaScript (fetch from a server) and Python tabs.
3. **Response**: the real response for this mantra (from `mantraDetail` in
   `developer/api/content.mjs`), trimmed to the first 2 verses with a "{n} more verses" note.
4. **Fields**: a table of every field with this mantra's actual value, type and notes
   (`translation` is `null` and `wordMeanings` is empty by design: say so).
5. **Text**: all verses in Devanagari and transliteration, rendered from the same data.
6. **Audio** (when `hasAudio`): a play button using the public preview endpoint below, plus
   `GET /v1/mantras/{id}/audio` and its response shape (`url`, `expiresAt`), linking the
   sacred-audio guide.
7. Availability: which plans include it, sandbox button (the first 5 ids are sandbox-visible).
8. Related: other mantras for the same deity, the deity hub, the search-mantras guide.
9. No links to Satyam: it is a customer, not part of the API docs.

The documentation framing is deliberate: Satyam already has a reader page for each of these hymns
with full English meanings. Mantrilo pages target developers ("{title} API", "{title} JSON",
"Sanskrit text with audio") rather than readers ("{title} lyrics meaning"), so the two sites don't
compete for the same searches. Same hymn, different page purpose.

### Book page — `/library/books/{book}`

Title: `{Title} API: Sanskrit Verses & English | Mantrilo`.
Hero with author/tradition, chapter and verse counts; `GET /v1/books/{id}` request and real
response; chapter index table (number, Sanskrit name, verse count, link); the first 3 verses with
Sanskrit, transliteration and the English rendering; fields table; related books in the collection.
Replaces `BookPreview.web.tsx` and the 8 hand-written book routes (keeping their URLs).

### Chapter page — `/library/books/{book}/{chapter}`

Title: `{Book} Chapter {n}: {name} — Verses via API | Mantrilo`.
`GET /v1/books/{id}/chapters/{n}` (confirm the exact path in `pustak.mjs`) with pagination
(`offset`, `limit`); every verse in Sanskrit, transliteration and English; previous/next chapter.
This is the most original content on the site: the English renderings are Mantrilo's own.

### Astrology capability page — `/astrology-api/{capability}`

Title from the guide name, for example `Vedic Dasha API | Mantrilo`.
Generalize `AstrologyCapability.web.tsx`: inputs, `POST` request, sample response
(`sampleLabel`), render and usage notes, related capabilities in the same category, sandbox button
(hidden when `limited`). Keep the three current URLs through a slug map
(`instant-panchang` → `panchang`, `planetary-positions` → `positions`, `daily-panchang`).

## Build approach

Expo 58 with `web.output: "static"` (already set in `app.json`).

- Each dynamic route exports **`generateStaticParams`**, which runs in Node at export time and
  returns one entry per page.
- Each route exports **`loader`** and reads it with `useLoaderData`. Loaders are stable in SDK 58;
  their data goes into that page's HTML and JSON only and is dropped from the client bundle, so
  the catalogue never ends up in the shared JavaScript. Satyam avoided the app bundle for exactly
  this reason; loaders solve it inside Expo Router.
- Keep loader payloads small: send only what the page renders.
- Verify before relying on it: that `generateStaticParams` and `loader` work together in one
  dynamic route, and how `generateMetadata` receives params in SDK 58. Prove both with one route
  first (step 1 below).

### Catalog snapshot

The site build can't call Firestore with deny-all rules and shouldn't need credentials in Docker.

- New `scripts/snapshot-catalog.mjs`: reads `shlokam` with the developer server's service account
  (`developer/server/firebase.mjs`), maps each record through the public `mantraDetail` shape,
  merges hymns that are word-for-word identical across deities (same rule as Satyam:
  one URL, every deity listed) and writes `src/data/catalog/mantras.json`.
- Books are read from `books/` directly. **Commit `books/` first**: it is untracked today.
- Astrology reads the existing JSON.
- Commit the snapshot so builds are reproducible; refresh it on a schedule or before a release.
- Slugs: from the title, matching Satyam's slug where the same hymn exists; collisions get the
  deity appended. Store the slug in the snapshot so URLs never change between builds.

### Audio on public pages

Signed links expire, so a static page can't contain one.

- New public endpoint `GET /v1/public/mantras/{id}/preview` on the API server: no key, signs a
  short-lived link (for example 5 minutes), rate-limited per IP, only for mantras with audio.
- Page player: fetch the link on click, then play. Guest limit of 3 plays per browser (same idea as
  Satyam's `playAllowance.ts`), after which it shows "Get a key to stream this in your app".
- Count preview bytes separately from customer usage so they don't touch any plan's allowance.
- Decision for you: full recording or a 30-second clip. Plan assumes full recording with the limit.

### SEO plumbing

- `src/data/metadata.ts`: add `itemMetadata({ path, title, description, indexable })` beside
  `pageMetadata`, sharing the canonical/robots/social logic.
- `scripts/finalize-web.mjs`: read a route manifest written during the build (or the snapshot) in
  addition to `seo-pages.json`; write a **sitemap index** (`sitemap.xml`) pointing to
  `sitemap-pages.xml`, `sitemap-mantras.xml`, `sitemap-books.xml`, `sitemap-astrology.xml`; extend
  the nginx `.html` redirects to the new routes.
- Indexing rule: a mantra page is indexable when it has an `seoDescription` and at least one verse;
  otherwise `noindex,follow` until fixed. Book and chapter pages need verses with English.
- Structured data: `BreadcrumbList` everywhere (Library › Mantras › Deity › Title); `AudioObject`
  only where audio exists. No ratings, offers or FAQ markup.
- Internal links: hubs list every item as plain links so crawlers reach everything without the
  sitemap; each item links to siblings and its hub.
- `scripts/check-seo.py`: check every generated page for a unique title and description, canonical,
  robots, one `h1`, and that the sitemap only lists indexable pages.

## Order of work

1. **Prove the pattern**: astrology `[capability]` route with `generateStaticParams` + `loader` +
   per-page metadata; confirm the HTML contains the content and the client bundle didn't grow.
2. **Astrology**: all 60 capabilities, `/astrology-api` hub lists them, old 3 URLs unchanged.
3. **Books**: commit `books/`, book and chapter routes, replace the 8 hand-written pages.
4. **Mantra snapshot**: `snapshot-catalog.mjs`, slugs, duplicate merging.
5. **Mantras**: mantra route, deity hubs, `/library/mantras` hub.
6. **Audio preview**: public endpoint, player and guest limit.
7. **Sitemaps and checks**: sitemap index, redirects, `check-seo.py`, full build timing.
8. **Release**: deploy, submit the sitemap index in Search Console, watch "Pages" weekly.

Each step ends with `npx expo lint`, `npx tsc --noEmit` and `npm run build`.

## Open decisions

- Audio: full recording or 30-second clip on public pages.
- Whether mantra pages link to the matching Satyam page (recommended: yes, one footer link).
- Snapshot refresh: manual before each release, or a scheduled job.

## Checks after launch

- Search Console: indexed count per sitemap, and "Duplicate, Google chose different canonical" on
  mantra pages (the sign that Mantrilo and Satyam pages are seen as the same page).
- Build time and `dist` size at about 700 pages.
- Core Web Vitals on a mantra page with audio.
