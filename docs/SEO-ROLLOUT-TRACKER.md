# Mantrilo SEO rollout tracker

Source: November 13 production and repository audit. This tracks changes and verification for the work that followed.

| Status | Work | Evidence |
| --- | --- | --- |
| Live | Align homepage, metadata, product pages, and guides with the API. Document original Sanskrit, available transliteration, empty translation fields, and conditional recording availability. | Site lint and typecheck passed. The featured-mantra guide, public API examples, and Library use the same reviewed mantra snapshot. |
| Verified in production | Show Isha Upanishad as the sandbox result, distinguish paid pagination, and link to the opening chapter. | A temporary production sandbox workspace confirmed exactly one Upanishad (Isha), no next cursor, and original Sanskrit with empty translation fields in the chapter preview. It also confirmed the live mantra description matches the docs snapshot. The workspace was removed. |
| Live and verified | Carry the selected request from public docs, product pages and Library through console sign-in. | A mobile Chrome smoke test signed into an isolated workspace from the legacy Upanishads guide, then received HTTP 200 from the collection, mantra quickstart, featured mantra, audio link, and book list. Instant Panchang returned HTTP 200 and counted one request. Console lint, typecheck, build, and all 99 developer tests passed. A mobile browser on the live Upanishads guide opened the prefilled console request and returned Isha with HTTP 200. The temporary workspace was removed. |
| Live | Restore the homepage Library anchor, link to priority guides, and consolidate known legacy guide links. | The production-mode export checker passed 22 routes and 885 internal links. Mobile Chrome resolved the anchor and redirected the old Upanishads query link after JavaScript loaded. Known astrology operations now link directly to their standalone references. |
| Live and verified | Release console and public site, then verify live discovery and signup destinations. | Cloud Run revision `mantrilo-console-hosting-seo-journey-20261113` serves all console traffic. Firebase Hosting deployed the public site. The live check passed all 16 sitemap URLs, canonical and crawl controls, legacy redirects, a true 404, and 11 HTTPS signup URLs. |
| Verified in Search Console | Confirm sitemap discovery and inspect priority URLs. | On November 13, Google showed sitemap Success with 16 discovered URLs. The homepage was indexed with a robots warning from the November 11 crawl. Google’s November 13 live test confirmed the homepage can be indexed, and Google confirmed a priority recrawl request. Mantra API, Docs and Upanishads showed “URL is unknown to Google.” Recrawl requests were initiated for Docs and Upanishads, but Google did not display a confirmation. Page Indexing was still processing and Core Web Vitals showed no field data. |
| After indexing | Review prospective standalone Library pages and public hostname consolidation. | Keep catalog filters out of the sitemap. Require verified coverage, reviewed copy, and a distinct developer use case before expanding it. Preserve the apex console when configuring redirects. |
| Baselines recorded | Report sandbox activation and measure mobile catalog interactions. | Run `node developer/scripts/seo-activation-report.mjs YYYY-MM` with authorized Google Cloud credentials. The November baseline showed one workspace, one sandbox key issued, and one workspace with positive net sandbox usage. This is a same-month cohort across acquisition sources, with no visitor attribution. Across three mobile lab runs per route (390 px, 4× CPU slowdown, 120 ms latency, 1.6 Mbps), median search/detail times were 65/233 ms for Books and 138/924 ms for Astrology. |

The demo browser used placeholder records and a placeholder recording link. It does not establish production email delivery, recording playback, or access to every astrology calculation.

## Search Console follow-up

Google's fresh smartphone crawls on November 13 succeeded for the homepage and Mantra API. Both are indexed, Google selected the inspected www URL for each, and the homepage's earlier robots warning cleared.

Docs and the Upanishads guide advanced to “Discovered – currently not indexed.” Google's live test fetched both successfully, allowed indexing, and found each page's intended self-canonical. Manual requests were attempted for both, but Search Console showed no confirmation. The Page Indexing report was still processing. Search Performance showed zero impressions and zero clicks for the available November 9–10 data, before the fresh crawls.

On the next check, compare URL Inspection for Docs and Upanishads and read Performance once its data covers November 13 or later. If either URL still has a problem after crawling, use the reported reason and selected canonical to decide what to change.

## What to ship next

1. **Verify the first API call in the Console.** Use an authorized sandbox workspace to reach and run a request from each public entry point. Start with Katha → Upanishads, then try the featured mantra, audio and Kundali. Confirm the selected request survives sign-in on mobile and returns a usable result with clear quota or error feedback.
2. **Measure activation from the public pages.** Track “Try API” clicks separately from signup starts. Connect the selected preset or operation to the workspace’s first successful sandbox request and report the conversion by landing page. Keep API keys and birth inputs out of the events.
3. **Make the sandbox examples easier to choose.** Show which titles the sandbox can read beside the Books CTA. Add a short “What you’ll get” preview to the Console’s first request, including the endpoint, expected response and next step after success.
4. **Check Google coverage before adding pages.** In Search Console, inspect Docs, Books API, the five book previews and the Daily Panchang and Kundali guides. Record indexing, selected canonical and query impressions. Use that evidence to choose the next substantive preview or guide.
5. **Run a small developer outreach pilot.** Offer the Books reader, Daily Panchang and Kundali examples to a handful of relevant app teams. Ask where integration stalled and use first successful calls and recurring sandbox usage to prioritize follow-up.

## November 15 expansion

The existing production sandbox returned HTTP 200 for the Upanishads list and the featured audio request. The Console also returned both chart divisions and Vimshottari Dasha for the synthetic Kundali example. The Upanishads list returned Isha with 18 numbered verses. Two new book previews and a collection page connect these verified examples to the Library.

The Cloud Run report now distinguishes tagged Console visits from signup starts. These are request counts. The activation report still measures successful usage across sources. A later change can connect the entry page and first successful request at workspace level.

Search Console showed 16 discovered URLs before the expansion, while the public sitemap already served 25. The Page Indexing report was still processing. The expansion was published with 28 canonical sitemap URLs, and Search Console accepted the sitemap submission and priority crawl requests for the Books API and Upanishads collection. Compare the reported discovery and indexing after Google reads the sitemap again. The new collection’s test click also appeared under Console visits in Cloud Run.
