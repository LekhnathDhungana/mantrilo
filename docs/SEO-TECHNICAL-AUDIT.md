# Mantrilo technical SEO audit

Audit date: November 12, 2026. Scope: live public marketing site, the current Expo web export, and the public API and console entry points. This is a read-only audit. The code examples below are proposed changes.

## Executive summary

**Estimated live SEO health: 28/100.** This is an audit score, not a Google or Lighthouse score. Rubric: crawl and indexation 2/30, rendering and performance 12/20, information architecture and metadata 8/20, developer content and trust 5/20, and acquisition and measurement 1/10. The pre-rendered HTML is a useful foundation, but the current production release cannot compete for organic visibility under its indexing settings.

1. **P0 · Production blocks indexing.** The reachable site is [www.mantrilo.com](https://www.mantrilo.com/). Its robots file disallows the entire site, sampled HTML pages declare `noindex,follow`, there are no canonical tags in the sampled live HTML, and the sitemap is empty. The apex `mantrilo.com` had no A or AAAA answers and could not resolve in the HTTP check. The web search sample returned no pages for the site queries. Search Console is needed to establish the actual index count. [Live robots](https://www.mantrilo.com/robots.txt) · [Live sitemap](https://www.mantrilo.com/sitemap.xml)
2. **P0 · The live site serves an older build, and the current build needs a verified signup origin.** The live site serves `/mantra-shloka-api` and `/access` while `/mantra-api`, `/library`, and `/contact` return 404. Live Docs is an older planning guide. The repository already has the updated pages and Firebase redirects. The example `console.mantrilo.com` is NXDOMAIN. The deployed Cloud Run console serves the signup URL and auth configuration with HTTP 200, but account creation and the first successful request were outside this read-only audit. [Live Docs](https://www.mantrilo.com/docs) · [Cloud Run signup entry point](https://mantrilo-console-bxjxj2ifdq-uc.a.run.app/login?mode=signup)
3. **P1 · Search-worthy content is hard to index as independent pages.** The current manifest still excludes the Library, Books, and Sacred Audio. Guides and catalog details use query strings, share the parent canonical, and render their detail view only after JS runs. Cold-load tests reproduced a React hydration mismatch on two shared links. Give the strongest guides and cleared catalog samples stable, statically rendered URLs.

### Evidence and scope

| Check | Live `www` | Current production-like export |
| --- | --- | --- |
| Rendering | Initial HTML contains visible copy and headings. This is static HTML with client hydration. | Expo Router `web.output=static`. Twelve routes and 475 internal links passed the existing export checker. |
| Indexing | Crawl blocked, sampled pages `noindex,follow`, empty sitemap. | Five eligible routes: Home, Mantra, Astrology, Pricing, and Docs. Each has a self-canonical. Preview defaults remain closed. |
| Routes | `/docs.html` and `/docs/` redirect to `/docs`. A fabricated URL returns HTTP 404. Both default Firebase hostnames returned HTML identical to `www` on Home. | Firebase config adds redirects from `/mantra-shloka-api`, `/access`, and `/implementation`. The checker tests exported links and anchors, and doesn't test Firebase redirect behavior. |
| Structured data | No JSON-LD in sampled pages. | Home Organization, other canonical pages BreadcrumbList. |
| API | `GET https://api.mantrilo.com/v1` and `/v1/astrology` are reachable. The API sends `X-Robots-Tag: noindex`. | Keep authenticated JSON and signed media outside the sitemap. Use HTML documentation to describe them. |

## Technical findings and proposed fixes

### P0 · Publish the correct build on a single canonical host

Use **https://www.mantrilo.com** as the primary URL because it already serves HTTPS. Connect the apex as a redirect-only host with DNS and TLS, and permanently redirect requests to the same path on `www`. On an apex-only Nginx virtual host, the directive is `return 308 https://www.mantrilo.com$request_uri;`. On Firebase Hosting, use a custom-domain redirect or equivalent edge rule. Verify both HTTP and HTTPS and preserve useful query parameters. The Firebase default aliases currently serve duplicates. At minimum, serve the same `www` canonical from those hosts. Apply host redirects only at a layer that can match the incoming host without redirecting `www` back to itself.

Build with a verified HTTPS console origin. Until the branded console domain is connected and its auth flow works, the Cloud Run URL is a candidate to validate. The production guard in `src/data/site.ts` currently accepts HTTP and does not reject loopback if an origin is explicitly configured. Tighten this guard for production and test a real signup plus a successful sandbox request before launch. The marketing Dockerfile also needs an `EXPO_PUBLIC_CONSOLE_URL` build arg if it is used. Firebase Hosting serves `dist` and does not execute the Nginx config.

Run this against a release artifact before publishing:

```sh
export EXPO_PUBLIC_SITE_URL=https://www.mantrilo.com
export EXPO_PUBLIC_INDEXING_ENABLED=true
export EXPO_PUBLIC_CONSOLE_URL="$VERIFIED_CONSOLE_ORIGIN"
test -n "$EXPO_PUBLIC_CONSOLE_URL" || exit 1
npm run build
python3 scripts/check-seo.py dist "$EXPO_PUBLIC_SITE_URL"
```

Add a deployed-origin smoke check to the release. Require 200, exactly one expected canonical, and no blocking header or robots meta for every sitemap entry. Verify `/robots.txt` allows public pages and points to the sitemap. Verify the three legacy redirects, one unknown URL, both domain variants, and the signup CTA. Keep previews access-controlled where needed and keep the developer console and API out of the public sitemap. In Search Console, verify the Domain property, submit the sitemap, inspect Home, Docs, Mantra, and Astrology, then monitor canonical selection and exclusions. [Google developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers) · [Canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

### P1 · Keep static rendering and fix cold-load detail URLs

`app.json` uses Expo Router static export. The response already includes real text, navigation, headings and code samples. Existing external JavaScript is deferred, and no blocking third-party JS was observed in the sampled routes. Initial paint still depends on CSS, and the browser downloads and executes the runtime and route bundles to make the UI interactive. Keep the current static architecture for the next release. [Expo static rendering](https://docs.expo.dev/router/web/static-rendering/) · [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

`DocsPage.web.tsx` and `Catalog.web.tsx` branch on URL parameters in the first render. Firebase serves the same static parent HTML for query variants. The first client render can choose a different tree. On the current export, `/docs?guide=book-reader` and `/library?item=collection-upanishads` both produced React #418. Their initial HTML matches the parent, then React regenerates the changed subtree. Short-term patch for shareable state only:

```tsx
const params = useLocalSearchParams<{ guide?: string }>();
const [hydrated, setHydrated] = useState(false);
useEffect(() => setHydrated(true), []);
const guide = findGuide(hydrated ? params.guide : undefined);
```

Apply the same principle to catalog query-dependent rendering, including input values. This makes the initial tree deterministic and still leaves query details dependent on JavaScript. The durable solution is `/docs/guides/[slug]` and a small set of curated `/library/[kind]/[slug]` pages with `generateStaticParams`. Generate metadata and sitemap entries from the same validated slug registry. Return HTTP 404 for unknown slugs, link directly to the new HTML pages, and preserve old query links for visitors while the links migrate. Keep search and facet state on the catalog parent. For crawlable pagination, use sequential anchor links and self-canonical page URLs for substantive pages. Leave arbitrary combinations and API cursor tokens outside the index. [React error 418](https://react.dev/errors/418) · [Expo static route generation](https://docs.expo.dev/router/web/static-rendering/)

**Language and script.** Keep source Sanskrit, IAST and English translation on a single record with appropriate inline language tags, such as `lang="sa-Deva"`, `lang="sa-Latn"` and `lang="en"`. Treat a script selector as a display preference. When a page has a genuine localized editorial interface and content, give each language its own URL and self-canonical, and add reciprocal hreflang between equivalents. Avoid canonicalizing all translations to English. Keep public sitemap entries restricted to canonical HTTP 200 HTML pages. A five-URL sitemap needs no split. If the approved catalog approaches 50,000 URLs or 50 MB uncompressed in a sitemap, create a sitemap index and split by page family. [Google localized versions](https://developers.google.com/search/docs/crawling-indexing/localized-versions) · [Sitemap limits](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

### P1 · Cut transfer and layout shift

Chrome lab measurements use a 390 px mobile viewport, cold cache, 4× CPU throttling, 100 ms simulated latency, and approximately 1.6 Mbps downstream. Numbers are single-run directional measurements. Local is a gzip-served export with no real CDN round trip. Layout shift is the sum observed in these short runs. INP was not measured. The PageSpeed API returned 429, so there is no CrUX or Search Console field conclusion.

| Route | Live LCP / layout shift | Current export LCP / layout shift |
| --- | --- | --- |
| Home | 1.20 s / 0.000 | 0.69 s / <0.001 |
| Docs | 0.42 s / 0.000 | 0.56 s / <0.001 |
| Astrology | 0.48 s / 0.000 | 0.53 s / 0.000 |
| Library | 404 | 0.56 s / 0.225 |
| Book reader guide, cold query URL | Old Docs HTML | 3.52 s / <0.001, hydration mismatch |
| Upanishads detail, cold query URL | Library unavailable | 3.42 s / 0.225, hydration mismatch |

Live sampled routes transferred approximately 249–254 KB of scripts. The current clean routes transferred approximately 344–350 KB of scripts and 220–325 KB of fonts. The framework entry alone is 1.12 MB raw and 295 KB gzip. The current Home had a 153 ms long task and the Library had a 172 ms long task. The site loads Inter, JetBrains Mono and Tiro Devanagari through one external stylesheet. The Library shift involved its lede and the section below it. A repeat with the external font requests blocked measured zero Library shift, which makes fallback font metrics the first fix to test. The book-reader hydration error persisted with fonts blocked.

- Serve a subset of the primary Latin WOFF2 locally, use `font-display: swap` and tune the fallback with `size-adjust` and metric overrides against the actual font files. Preload only the above-the-fold face when a repeat test shows improvement. Use system monospace or load a code face only where needed. Load the Devanagari face on routes that display it. Watch the Library hero on mobile and keep enough room for the wrapped title and lede.
- Keep initial HTML examples readable. Split off the interactive demo language switchers, large detail examples, and noncritical catalog data so lightweight pages avoid loading unrelated data. The current common bundle and entry dominate, so measure with bundle analysis before expecting a dynamic import to solve the framework cost. Set an initial budget of **≤300 KB compressed JavaScript** and **≤120 KB fonts** for Home on mobile, then tune against measured needs. A separate low-JS marketing/docs site is a later option if a measured budget remains out of reach.
- No audio downloads or full-book payloads appeared in the sampled initial page loads. The API signs audio on demand and paginates book content. Keep that model. For public previews that have clearance, use `<audio controls preload="none">`, request the signed playback URL on intent, and keep full media or text out of shared JS. Test a real Range request, expiry, mobile playback and quota behavior separately. Cache content hashes immutably and verify the same policy for emitted hashed `/assets/` paths before broadening cache rules.
- Measure field LCP, INP, and CLS at p75 on mobile after launch. Use the good thresholds of 2.5 s, 200 ms, and 0.1 as release targets, then track local regressions by route. [Core Web Vitals thresholds](https://web.dev/articles/vitals)

## Information architecture, content, and conversion

**Click depth.** In the current export, Docs, Library, Astrology and Pricing are one click from Home in the header. Mantra, Audio and Books are one click through the footer. A goal guide or catalog detail is generally two clicks, but the detail itself currently lacks an independently indexable path. In production, the home links reach older product pages and Docs, and the new Library route is absent. Keep the short existing product URLs. Introduce nested URLs for new guide and sample families rather than renaming working product slugs for keywords.

**Titles and headings.** The build checker confirms unique titles and one H1 per route. Heading level still needs a semantic pass. The Library H1 jumps to footer H3s in the unfiltered HTML, and Docs endpoint H3s follow Usage Limits without a clear endpoint reference H2. Add a visible Library catalog H2 and an API reference H2, and label footer groups with accessible nav names or an appropriate heading level. Align product titles with scope. For example, `Vedic Astrology API for Developers: Panchang & Kundli | Mantrilo` is stronger for the current astrology page than positioning it only around planetary positions. Keep a short, feature-specific description and add a stable OG image per product family if share previews are important.

| Search intent | Target and what to publish |
| --- | --- |
| Hindu content API / Sanskrit mantra API | Home and `/mantra-api`. Show authenticated requests, a real record, IAST and translation fields, coverage, and exact sandbox limitations. |
| Hindu calendar API / daily Panchang API | `/astrology-api` plus `/docs/guides/daily-panchang`. Show date, coordinates and timezone, sunrise-based versus instant results, edge cases and response fields. Use a separate public product page only if it can support a distinct intent and original detail. |
| Vedic astrology API / Kundli API / developer tools | `/astrology-api` plus a birth-chart guide. Include a labeled synthetic example, supported calculations, methods, input constraints, accuracy limits and errors. Give the application workflow more space than generic predictions. |
| Audio mantra API / mantra playback for mobile | `/sacred-audio-api` plus a playback guide. Show signed URLs, expiration, playback, unavailable recordings, and usage. Target “SDK” only after there is an actual maintained SDK. |
| Bhagavad Gita API / Upanishads API / Hindu scripture API | `/shastra-books-api` plus collection guides and cleared sample pages. Show collection, chapter and verse pagination, source edition and translation notes. |
| Spiritual readers and listeners | Curated Sanskrit/IAST/translation sample pages, where rights and provenance are confirmed. Add a relevant “Use this text in your app” link. Expand only when these pages attract useful traffic or support the developer funnel. |

These are intent hypotheses, not search-volume or ranking estimates. Use Search Console query data after indexing and group branded, developer, and reader queries separately. Early distribution can include runnable GitHub examples and technically useful integration posts with links to the relevant guides. Avoid publishing one thin page per API field or operation.

**Trust and depth.** The current Docs has a stronger foundation than the live version, with auth, rate limits, pagination, errors, and representative responses. Add a clear methods/limitations page for astrology and an editorial/source policy for mantras and books. Show the text edition, translator or recording credit where permitted, rights status, and verified examples with a last-checked date. Link the claims to actual policy pages. The current Terms, Privacy and License pages contain launch-status copy. Resolve that copy and confirm availability and rights before opening Books, Audio, and Library to indexing. Prefer reviewed coverage and reliable examples over mass generated pages.

**Acquisition.** Put a runnable cURL and expected output near each product/guide introduction. Put a “Get a sandbox key” CTA beside it and show a return path from signup to that guide. Carry a validated plan intent from Pricing into the console instead of dropping every paid button into the same generic destination. Verify the whole flow with a test account and Stripe test mode. Track `guide_view`, `copy_request`, `signup_started`, `signup_completed`, and `first_api_success` with route and intent, without logging API keys or sensitive birth inputs. Track organic landings to first successful API call and paid conversion, as well as clicks and impressions.

## Ready-to-use JSON-LD

Merge these into the corresponding graphs in `src/components/Seo.web.tsx` after the pages and matching on-page copy ship. Retain one stable `@id` per entity, keep the existing breadcrumbs where they match the user-facing hierarchy, and use the existing script-safe serialization. Validate with the Schema Markup Validator and Google Rich Results Test. Schema.org vocabulary and Google rich-result eligibility are separate. Google requires a legitimate review or aggregate rating for software app rich-result eligibility. No such data was verified. Google discontinued FAQ rich results in 2026, so keep visible FAQs for readers and skip FAQ markup as a search enhancement. Product markup should be considered on a specific purchasable plan page with visible, accurate offers, not on generic API docs. Use `Service` / `WebAPI` for the capability pages. [Software app eligibility](https://developers.google.com/search/docs/appearance/structured-data/software-app) · [FAQ removal](https://developers.google.com/search/updates) · [Structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

**Homepage · Organization, website and software**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.mantrilo.com/#organization",
      "name": "Mantrilo",
      "url": "https://www.mantrilo.com/"
    },
    {
      "@type": "WebSite",
      "@id": "https://www.mantrilo.com/#website",
      "name": "Mantrilo",
      "url": "https://www.mantrilo.com/",
      "publisher": { "@id": "https://www.mantrilo.com/#organization" },
      "inLanguage": "en"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.mantrilo.com/#platform",
      "name": "Mantrilo Hindu Content API",
      "url": "https://www.mantrilo.com/",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Any",
      "description": "A REST API for Sanskrit mantras, linked recordings, scripture books and astrology calculations.",
      "publisher": { "@id": "https://www.mantrilo.com/#organization" },
      "offers": {
        "@type": "Offer",
        "name": "Free sandbox",
        "price": "0",
        "priceCurrency": "USD",
        "url": "https://www.mantrilo.com/pricing"
      }
    }
  ]
}
```

**API documentation · TechArticle and WebAPI**

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": "https://www.mantrilo.com/docs#article",
      "headline": "Mantrilo API documentation",
      "url": "https://www.mantrilo.com/docs",
      "mainEntityOfPage": "https://www.mantrilo.com/docs",
      "inLanguage": "en",
      "publisher": { "@id": "https://www.mantrilo.com/#organization" },
      "about": { "@id": "https://www.mantrilo.com/docs#api" }
    },
    {
      "@type": "WebAPI",
      "@id": "https://www.mantrilo.com/docs#api",
      "name": "Mantrilo REST API",
      "url": "https://api.mantrilo.com/v1",
      "documentation": "https://www.mantrilo.com/docs",
      "provider": { "@id": "https://www.mantrilo.com/#organization" }
    }
  ]
}
```

**Astrology product page · Service**

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://www.mantrilo.com/astrology-api#service",
  "name": "Mantrilo Astrology API",
  "serviceType": "Vedic astrology calculations via REST API",
  "url": "https://www.mantrilo.com/astrology-api",
  "description": "Calculate planetary positions, Panchang elements, and supported chart and matching results.",
  "provider": { "@id": "https://www.mantrilo.com/#organization" }
}
```

Use the same Service pattern for Mantra, Audio and Books once their visible scope and rights are verified. For Pricing, build an `OfferCatalog` from `shared/content-plans.json` and only include offers currently available to the audience. Avoid hardcoding payment claims or duplicating plan prices in metadata.

## Prioritized action plan

| Priority | Change | Acceptance criterion |
| --- | --- | --- |
| P0 · Before launch | Connect apex redirect, choose `www`, verify console and auth destination, publish current opt-in export | DNS/TLS and redirects work. Live sitemap lists eligible pages. Raw HTML is indexable and canonical. Signup and first authenticated call pass end to end. |
| P0 · Launch week | Add deployment SEO smoke tests and Search Console verification | Live release checks cover status, robots headers/meta, canonicals, sitemap, old routes, CTA destination and 404. Inspect priority URLs in Search Console. |
| P1 · Next sprint | Fix query hydration and statically publish daily Panchang, Kundli, book reader and audio playback guides | Raw HTML shows the guide title and code. Unique canonical and metadata. Zero hydration errors on cold mobile loads. Two-click discovery from Home. |
| P1 · Next sprint | Optimize fonts and shared code. Repair Library layout shift | Repeat mobile tests with the same profile. Library layout shift below 0.1. Report transfer by type and compare before/after; add field monitoring when available. |
| P1 · After review | Publish current rights and service policies, then make substantive Books, Audio and Library pages eligible | Every indexable page has reviewed claims, content provenance where applicable, internal links and tested examples. |
| P2 · Following month | Release curated catalog records, add schema and conversion instrumentation, evaluate broader search architecture | Search Console shows eligible canonical pages. Compare guide cohorts by signup and first call. Expand the catalog only after measuring index quality and developer intent. |
