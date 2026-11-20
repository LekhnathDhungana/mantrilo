# Mantrilo SEO release follow-up

November 12, 2026. This records production checks and changes after the snapshots in `SEO-AUDIT.md` and `SEO-TECHNICAL-AUDIT.md`.

| Finding | Result |
| --- | --- |
| Production was unverified or could be shipped with indexing disabled | `www.mantrilo.com` serves a public robots file and 16 canonical sitemap URLs. Firebase Hosting runs the production export checker before every publish. Search Console verification and sitemap submission are already done; crawler coverage and impressions are separate from eligibility. |
| Guides, astrology capabilities and collections shared their parents' URLs | Seven implementation guides have static URLs. Planetary positions and instant Panchang now also have distinct, linked HTML pages with verified sandbox excerpts, inputs and sandbox links. Other astrology operations remain browsable; prioritize new standalone pages after their examples are verified. |
| Books was hidden from search | The technical Books API landing page is now indexable and links to the Book Reader and Upanishads integration guides. Full texts, translations, recordings and the mixed Library remain outside this expansion pending title-level checks. |
| Thin product descriptions, weak trust signals and no social previews | Added an About page with practical provenance guidance, improved titles and heading order, added social metadata and a 1200×630 card, and added Books, capability and pricing structured data. Pricing now visibly answers how to start for free. |
| Signup CTA led to a page that loaded but could not create a session | The old Cloud Run address returned HTTP 403 `origin_denied` on session creation. Marketing now uses the console's configured origin. A disposable production account confirmed Firebase registration, console session, Free workspace, onboarding, sandbox key and authenticated requests to the branded API. The account and workspace were removed. No email delivery or payment was tested. |
| Bare domain did not resolve | The apex uses Firebase Hosting's redirect mapping with the assigned DNS-only A, ownership TXT and certificate validation TXT records. The HTTPS hop must be verified after certificate provisioning. |
| Bundle weight and Core Web Vitals | The entry JavaScript is about 295 KB gzipped in the export. Fonts are self-hosted. No field data was measured; use Search Console or CrUX to decide whether a static-first framework migration is warranted. |

## Remaining work

1. Verify an HTTPS request to `https://mantrilo.com/docs?source=redirect-check` returns a permanent redirect to the identical path and query on `www`. A public DNS answer alone does not verify the redirect.
2. Check the deployed Books revision against the repository contract. `GET /v1/books?limit=1` and the Upanishads filter both returned HTTP 200, but each returned two records. The repository implementation applies the requested page size. Retest pagination and collection results before claiming full contract parity or indexing collection pages.
3. Verify additional astrology operations on a production sandbox key before publishing standalone pages; keep examples labeled according to verification. Start with birth charts, daily Panchang and matching.
4. Confirm record-specific rights and provenance before promoting public recordings or scripture excerpts. Finish reviewed privacy, terms and license pages. Only add a dedicated collection page when it has distinct, verified material.
5. Use Search Console for impressions and query data. Add a first-party funnel after defining the data policy: track guide-to-signup and first successful API call using allowlisted route identifiers, without capturing key values, birth inputs or account identifiers in public analytics. No conversion tracker was added in this release.

## Verification

Production export: 22 HTML routes, 880 internal links, metadata, canonicals, structured data, sitemap and 404 checks passed. Live release check: 16 sitemap URLs, legacy redirects, a true 404 and the HTTPS signup destination passed. Root lint and typecheck passed. The developer server suite passed 94 tests.
