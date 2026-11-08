# Mantrilo SEO and astrology implementation

**Positioning update:** Astrology no longer carries a Planned badge in the website or console. This supersedes the planned-positioning descriptions in the original audit below. The local preview still has no live service connection or calculation engine; backend status is `setup_required`, and purchase controls remain tied to actual billing configuration.

## Scope and evidence

The repository contains an Expo 58 static marketing website and illustrative schema fixtures. It has no production catalog, API documentation contract, account/key provisioning, usage dashboard, billing, or astrology service. No Panchang, birth-chart, planetary-position, nakshatra, rashi, or horoscope implementation was found. This is evidence about this checkout, not an audit of an external service.

Astrology is now presented as **planned** in the homepage, navigation, product overview, FAQ, a dedicated overview page, and the inquiry draft flow. It is not included in the existing plan entitlements. No astrology demo, endpoint, calculation accuracy, tradition, release date, or price is invented. Existing plan values and allowances remain unchanged. They are now shared through `shared/content-plans.json`, re-exported by `src/data/plans.ts` for the marketing site and reused by the separate Developer Console.

## Audit findings and fixes

| Confirmed in code or output | Implemented change |
| --- | --- |
| Expo 58 `Head` tags were absent from the initial static HTML. | Each explicit route exports `generateMetadata`; shared page metadata is checked against the exported HTML. Client navigation synchronizes existing head elements without duplicate descriptions, canonical links, or robots tags. |
| No canonical/social metadata or environment-wide indexing gate. | Central route metadata and a public HTTPS origin setting; preview defaults to noindex, production indexing requires explicit opt-in and a valid origin. |
| No XML sitemap or robots.txt. | Build finalizer generates both. Production XML contains only the seven intended indexable canonical routes; private preview XML is empty. |
| Generic `[page]` route and a literal placeholder export. | Explicit routes replace the generic route. A proper 404 artifact and hosting status handling replace the placeholder route. Internal `_sitemap` output is removed from hosting. |
| Only one broad product page; no astrology positioning. | Three content capability pages, planned astrology overview, dedicated pricing page, and linked integration guide. Overlapping mantra/shloka/Sanskrit themes share one page. |
| Narrow desktop navigation wrapped after adding astrology. | Menu breakpoint accommodates the new item; product navigation wraps on smaller screens. Document scrolling remains enabled. |
| Native-style navigator wrapped the web document. | Platform-specific root component uses Router Slot for web and retains Stack for native. This preserves normal document flow; no bundle-size reduction is claimed. |
| No deployed-host redirects or branded 404 response configuration. | Nginx and local server normalize known `.html`/trailing-slash URLs, preserve query strings, and return 404 for unknown pages. No index.html fallback for unknown routes. |

Production-only items not verified: actual hostname/DNS/TLS, Cloud Run IAM or access logs, CDN/cache behavior, Googlebot access, Search Console ownership, indexing, impressions, rankings, and field Core Web Vitals. Docker is unavailable locally, so the GCP container/Nginx configuration is prepared but not container-tested or deployed.

## Candidate search themes and page map

These are candidate themes from the brief, **not validated keyword demand**.

| Route | Search theme / purpose |
| --- | --- |
| `/` | Hindu content API; B2B offering overview and access conversion. |
| `/mantra-shloka-api` | Mantra API, shloka API, Sanskrit verses API; optional text fields, context, provenance, and reading workflow. |
| `/sacred-audio-api` | Sacred audio API; linked recordings, user-initiated loading, delivery allowances, and recording-rights questions. |
| `/shastra-books-api` | Hindu scripture API, shastra and religious books API; reading structures, source editions, and coverage limitations. |
| `/astrology-api` | Astrology API; explicit planned status, scope decisions, and requirements inquiry. |
| `/pricing` | Plan comparison, request limits, audio data delivery, covered apps/websites; astrology inclusion unresolved. |
| `/docs` | Integration planning; server-side credentials and illustrative examples rather than a published production API contract. |

`/access`, `/privacy`, `/terms`, and `/license` remain noindex even in production mode. Legal routes currently disclose missing final documentation. No translated equivalents exist, so no hreflang is emitted.

## Indexing and GCP configuration

- `EXPO_PUBLIC_SITE_URL`: the confirmed public **HTTPS origin only**, no path, credentials, query, or fragment. Leave blank for local/private previews. No production domain has been invented.
- `EXPO_PUBLIC_INDEXING_ENABLED=false`: default. All pages are noindex; robots.txt disallows crawling and sitemap.xml has no URLs. The local preview server also sends `X-Robots-Tag: noindex, nofollow` on every response and binds to `127.0.0.1`.
- Production opt-in requires both a valid origin and `EXPO_PUBLIC_INDEXING_ENABLED=true`. A build with indexing enabled but no domain fails. Rebuild when either setting changes.
- `EXPO_PUBLIC_CONTACT_EMAIL`: optional verified public contact address. Without it, inquiries can only be prepared/downloaded locally. No interest registration or submission is claimed.
- Canonical and social URLs are omitted until a valid origin is configured. With an origin configured, they are absolute, query-free self URLs. Query parameters on access requests do not create indexable pages.
- `npm run build` exports HTML then finalizes robots, sitemap, clean-URL redirects, preview headers, and the not-found artifact. The finalizer handles Expo’s reserved not-found export, whose route metadata is not resolved by the installed exporter.
- The Dockerfile passes these public build arguments through to the static export and copies the generated Nginx include out of the public web root. It runs the unprivileged web server on port 8080.
- Keep Cloud Run previews authenticated with IAM. Robots directives are **not access control**; disallowed URLs can still be known to a search engine. Do not grant public invocation or publish without authorization.
- Production robots.txt allows crawling so crawlers can read noindex directives on excluded pages. The sitemap omits those pages; it does not itself enforce exclusions.

Structured data uses only Organization on the homepage and BreadcrumbList on supporting pages, with visible names and breadcrumb labels. It is emitted only when an origin is configured. No invented legal entity address, contact, reviews, ratings, offers, or availability. Product/SoftwareApplication offers and FAQ rich-result markup were not appropriate to this unconnected offering and are omitted. No rich result is promised.

## Verification and performance conditions

Run:

```sh
npm run lint
npm run typecheck
npm run build
npm run check:seo
npm run preview
```

The SEO check parses initial HTML without running JavaScript. It validates all 11 page titles/descriptions, single H1s, language, unique social metadata, canonicals, robots, JSON-LD, sitemap URLs, the 404 artifact, and 176 internal links/anchors. Production-mode smoke checks use the reserved `https://mantrilo.example` domain in `/tmp/mantrilo-production-seo-qa`; that domain is only a test fixture and is never the local preview or a real deployment.

HTTP checks on the loopback server cover the 11 page routes, robots/sitemap, missing/placeholder/internal routes (404), clean-URL redirects (308 locally), and noindex response headers. Browser checks cover homepage and product pages, astrology inquiry draft generation, client-navigation metadata deduplication, document scrolling, keyboard preview selection, and mobile horizontal overflow.

The framework entry is approximately 1.12 MB raw / 294 KB gzip, compared with approximately 1.12 MB raw / 292 KB gzip before the expansion. This remains a performance limitation, not an improvement claim. Capability pages have route-specific chunks; static content is visible before hydration. Shared CSS is approximately 27 KB raw. Nginx is configured to gzip text, JavaScript, CSS, JSON, XML, and SVG in the GCP container; this hosting configuration remains untested without Docker. No dependencies, remote fonts, trackers, third-party scripts, full audio files, or large photographic assets were added. Existing ornaments use inline SVG dimensions controlled by CSS. Audio remains metadata-only, with no initial media download.

Bundle sizes are local file measurements using Python gzip; server compression and real-user network delivery are not inferred from them. Browser timing observations, where available, are local lab samples in the Codex browser with no CPU/network throttling, not real-user Core Web Vitals or Lighthouse scores. The browser automation scope did not expose the Performance API, so no navigation/paint timing is reported. There is no field performance dataset.

## Decisions needed for astrology

1. Confirm whether the offering will supply calculated astronomical data, interpretive astrology content, or both.
2. Define supported traditions, methodology, inputs, output fields, languages, provenance, and verification criteria.
3. Confirm availability and any timeline before making delivery claims.
4. Decide whether and how astrology maps to the current plans; do not infer inclusion from “full available catalog.” Existing content prices and allowances remain unchanged.
5. Supply a real contact/submission destination before offering interest registration. The current tool is a local draft generator.

## Prioritized content backlog

| Priority | Integration question | Evidence required before publishing a tutorial |
| --- | --- | --- |
| 1 | Which text, translations, editions, and recordings can an app use commercially? | Verified catalog, source/translator data, and content license. |
| 1 | How does a server authenticate, obtain keys, and handle errors or pagination? | Implemented endpoints, authentication, response/error schema, and tested request examples. |
| 2 | How should a reader navigate book → chapter → verse and represent missing translations? | Verified numbering/edition behavior and actual records. |
| 2 | How should an audio player obtain authorized URLs and measure delivered data? | Recording coverage, delivery/auth behavior, formats, and usage reporting. |
| 2 | What does a customer product cover in a multi-app deployment? | Final service/license terms and provisioning behavior. |
| 3 | What does the planned astrology API actually return? | Confirmed scope, implementation, methodology, supported traditions, and plan decision. |

The existing pages explain models and limitations; no unsupported production tutorial was published.

## Production steps requiring owner access

Confirm the real domain and final legal/contact information. Configure the domain and TLS on the existing GCP deployment, preserve IAM protection for previews, and rebuild with the authorized production origin/indexing settings only when launch is approved. Verify HTTPS status codes, redirects, noindex exclusions, sitemap and canonical URLs against the deployed host. Establish Search Console ownership (DNS or another authorized method), inspect representative URLs, submit the production sitemap, and monitor crawl/indexing and field performance over time. None of these external steps has been performed here.

## Research consulted

Current Google guidance was reviewed for [robots and noindex](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemap construction](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), and [truthful structured data](https://developers.google.com/search/docs/appearance/structured-data/sd-policies). The Expo implementation follows [SDK 58 static metadata](https://docs.expo.dev/router/web/static-rendering/), not an assumption that pre-58 Head behavior still applies.

A directional search for Hindu-content and astrology APIs surfaced [OneBhakthi’s developer page](https://www.onebhakthi.org/developers), [Sanatan’s API page](https://sanatan.digital/api), and [TathaAstu’s documentation](https://docs.tathaastuapi.com/). These results were used only to distinguish developer-content discovery from astrology-calculation intent. They do not validate demand, establish Mantrilo capabilities, or support claims about rankings or competitor performance. No keyword volumes, ranking estimates, or traffic-growth claims are made.
