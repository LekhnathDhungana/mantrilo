# Mantrilo SEO and code audit

12 November 2026. Covers the public site at the repository root (Expo Router, static web output). The developer console in `developer/` is private and correctly `noindex`, so it is out of scope.

## How this was checked

- **Production-like build.** The site was exported with production SEO settings and then run through `scripts/finalize-web.mjs` and `scripts/check-seo.py`:
  - `EXPO_PUBLIC_SITE_URL=https://mantrilo.com`
  - `EXPO_PUBLIC_INDEXING_ENABLED=true`
  - `EXPO_PUBLIC_CONSOLE_URL=https://console.mantrilo.com`
- **What was measured on that build:** the HTML of every page, along with word counts, heading order, metadata, JSON-LD, robots.txt, the sitemap and bundle sizes.
- **What was not checked:** the live site at https://mantrilo.com. A request to it returned `200` with `cache-control: max-age=3600`, but the page itself could not be fetched (the browser pane hasn't been allowed to open it). This report does not know whether that deployment was built with indexing on.
- **What wasn't available:** real-user Core Web Vitals, Search Console and search-volume data. Keyword priorities below are judgement, not measured volume.

---

## 1. Executive summary

**Estimated SEO health: 58 / 100.** The technical base is strong. Each page is pre-rendered HTML, with:
- a unique title and description;
- a self-referencing canonical;
- environment-gated robots handling;
- a generated sitemap;
- an automated check that runs on every build.

What holds the score down is how little of the site search engines can index, and how thin the indexable pages are.

### The three biggest bottlenecks

1. **Only 5 URLs can be indexed.** Those are `/`, `/mantra-api`, `/astrology-api`, `/pricing` and `/docs`. The site has 147 distinct, useful views, but they all sit behind query parameters on 3 canonical URLs:
   - 66 astrology capabilities at `/astrology-api?item=…`;
   - 7 guides at `/docs?guide=…`;
   - 74 Library items at `/library?…`.

   The canonical tag folds every one of these into its parent page. So searches like "Panchang API", "Kundli API", "Ashtakoota / Guna Milan API", "synastry API" or "Upanishads API" have no page that can rank.

2. **The live indexing setup is unverified, and the safe default is fully hidden.** Unless a build sets both `EXPO_PUBLIC_SITE_URL` and `EXPO_PUBLIC_INDEXING_ENABLED=true`, it produces:
   - `robots.txt` with `Disallow: /`;
   - an empty sitemap;
   - `noindex` on every page;
   - no canonical tags and no JSON-LD.

   `.env.production` currently sets only `EXPO_PUBLIC_CONTACT_EMAIL`. If mantrilo.com was deployed from it, **the whole site is invisible to search**. That makes this the most urgent thing to check.

3. **Product pages are thin and trust signals are weak.**
   - **Thin pages:** `/mantra-api`, `/sacred-audio-api` and `/shastra-books-api` have about 370 words each.
   - **Unfinished legal pages:** privacy, terms and license still say final documents are missing.
   - **No About page:** there's no page saying who runs Mantrilo or where the texts and recordings come from.
   - **Stale noindex reason:** `/shastra-books-api` is `noindex` because "a books endpoint" didn't exist yet. It does now (`/v1/books`, with collections, chapters and pagination), so that reason is out of date.

---

## 2. Technical SEO and Core Web Vitals

### 2.1 Rendering

| Area | Finding | Impact |
| --- | --- | --- |
| Rendering mode | Static site generation (`web.output: "static"`) followed by React hydration. Every route ships complete HTML, so crawlers see all the content without running JavaScript. | Good |
| Hydration | Page JavaScript is all `defer`, so nothing blocks the HTML parser. Scroll reveals hide content only after JavaScript adds `.mh-js`, so the server HTML is always visible. | Good |
| Framework JS | The `entry` bundle is **1,117,604 bytes raw, about 294 KB gzipped**, plus `__common` at 159 KB raw. It is mostly React, react-native-web and expo-router, and every page downloads it to render plain HTML. | Medium: costs INP and Total Blocking Time on mid-range phones; doesn't affect LCP, which is text |
| CSS | One stylesheet (49 KB), preloaded. | Fine |
| Fonts | One render-blocking Google Fonts stylesheet loads three families on every page: Inter (4 weights), JetBrains Mono (2) and Tiro Devanagari Sanskrit (2 styles). `display=swap` and a `fonts.gstatic.com` preconnect are both present. | Medium: one blocking request on another domain, and font-swap layout shift on the hero heading |
| Images, audio and book payloads | The public pages have no `<img>` tags and no audio. Book and mantra text appears only as short JSON examples. | No issue today |
| Scroll lock (fixed) | Expo's web reset sets `body { overflow: hidden }`. It made every public page unscrollable until a rule in `site.css` undid it. That rule is in the working tree, not yet committed. | Was critical; fixed |

### 2.2 Crawlability and indexing

| Area | Finding |
| --- | --- |
| robots.txt | Production writes `Allow: /` plus a `Sitemap:` line, which is correct. The preview writes `Disallow: /`. |
| Sitemap | 5 URLs, no `<lastmod>`. There's no need to split it until there are thousands of URLs. |
| Canonicals | Absolute, query-free, self-referencing. That's correct, but it is also why the 147 query-parameter views can't rank (see 2.4). |
| `noindex` pages | `/sacred-audio-api`, `/shastra-books-api`, `/library`, `/contact`, `/privacy`, `/terms`, `/license`. Legal and contact are fine to leave out. Books, audio and the Library are product pages and are being held back for rights reasons; revisit them one by one. |
| Clean URLs | `cleanUrls: true` and `trailingSlash: false` in `firebase.json`. 301 redirects cover `/mantra-shloka-api`, `/access` and `/implementation`. |
| Heading order | The heading level jumps from h1 straight to h3 on `/mantra-api`, `/sacred-audio-api`, `/shastra-books-api`, `/pricing`, `/library`, `/contact` and the 404 page. The footer uses `<h3>` for its column titles ("Products", "Developers"), and the pricing cards use `<h3>` before the first `<h2>`. |
| Metadata mismatch | `theme-color` is `#FFFBF5` in `src/data/metadata.ts`, but `#faf8f2` in `src/components/Seo.web.tsx` after client-side navigation. |
| Social previews | There's no `og:image` and the Twitter card is `summary`. Shared links show no image. |
| Devanagari vs romanized text | There's no duplicate-content risk today, because no page exists per mantra or verse. When text pages are added, put both scripts on **one** URL rather than separate pages, keep `lang="sa"` on Devanagari, and don't create script-variant pages with `hreflang`. |

### 2.3 Structured data today

- **The homepage** has one `Organization` (name, URL and description).
- **Every other indexable page** has only a two-level `BreadcrumbList`.
- **Product, pricing and docs pages** have nothing that describes the API, its plans or its documentation.

### 2.4 Why the query-parameter pages don't rank

`/astrology-api?item=western-synastry` renders a full capability page in the browser. But:
- the static HTML is always the parent page;
- the canonical points at `/astrology-api`;
- the sitemap doesn't list it.

Google treats all 66 capabilities as one page. Expo Router can pre-render each one at a real path, and the fix is in section 3.1.

---

## 3. Code and technical fixes

### 3.1 Give capabilities, guides and collections their own static URLs (highest impact)

Expo SDK 58 static output creates one HTML file for each entry `generateStaticParams` returns. `generateMetadata` receives the route's params as its second argument.

```tsx
// src/app/astrology-api/[capability].tsx
import type { Metadata } from 'expo-router/server';
import { useLocalSearchParams } from 'expo-router';
import { astrologyItems } from '../../data/library';
import CapabilityPage from '../../components/CapabilityPage';
import { capabilityMetadata } from '../../data/metadata';

export async function generateStaticParams() {
  return astrologyItems.filter((item) => !item.limited).map((item) => ({ capability: item.id }));
}

export function generateMetadata(_: undefined, params: { capability: string }): Metadata {
  return capabilityMetadata(params.capability);
}

export default function Page() {
  const { capability } = useLocalSearchParams<{ capability: string }>();
  return <CapabilityPage id={capability} />;
}
```

Do the same for:
- **Guides:** `src/app/docs/guides/[guide].tsx`, giving `/docs/guides/load-the-upanishads`.
- **Book collections:** `src/app/shastra-books-api/[collection].tsx`, giving `/shastra-books-api/upanishads`, `/shastra-books-api/bhagavad-gita`, and so on.

Then:
- turn the existing `?item=` and `?guide=` views into `<Link>`s to these paths, so the old query URLs never compete with them;
- generate the sitemap from the same lists, so `finalize-web.mjs` isn't working from the 12 fixed routes in `seo-pages.json`;
- extend `check-seo.py` to walk the generated folders.

`capabilityMetadata` should build a unique title and description from the guide data, for example:
- **Title:** "Synastry API: compare two birth charts | Mantrilo"
- **Description:** what the capability returns, the inputs it takes, and that it's included in every plan.

### 3.2 Check, then lock down, the production indexing setup

```bash
curl -s https://mantrilo.com/robots.txt
```

```bash
curl -s https://mantrilo.com/ | grep -oE '<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'
```

If robots.txt says `Disallow: /`, rebuild with the production settings in `.env.production`:

```bash
EXPO_PUBLIC_SITE_URL=https://mantrilo.com
EXPO_PUBLIC_INDEXING_ENABLED=true
EXPO_PUBLIC_CONSOLE_URL=https://<console origin>
```

Add one line to the deploy step so a hidden production build can't ship by accident:

```bash
grep -q 'Allow: /' dist/robots.txt || { echo "Production build is not indexable"; exit 1; }
```

### 3.3 Fix the heading order

- **Footer** in `src/components/site/Chrome.web.tsx`: change the column titles (`<h3>Products</h3>` and the others) to `<p className="mh-footer-title">`. They're navigation labels, not document sections.
- **Pricing:** make the plan names `<h2>` (or add a visually hidden `<h2>Plans</h2>` above the cards).
- **Product pages** (`ProductPage.web.tsx`): add an `<h2>` above the first group of `<h3>` cards.

### 3.4 Load fonts with less blocking

- Load Tiro Devanagari only for the Devanagari characters actually used. The Google Fonts `text=` parameter limits the file to those characters:

  ```html
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Sanskrit&text=ॐसर्वेभवन्तुसुखिनः&display=swap">
  ```

  Alternatively, load it only on pages that show Sanskrit.

- Drop the unused Inter weights. Check whether 500 and 600 are both needed.
- **Longer term:** self-host Inter as one variable `woff2`, preload it, and add a size-adjusted fallback so the hero heading doesn't shift when the font arrives:

  ```css
  @font-face {
    font-family: 'Inter Fallback';
    src: local('Arial');
    size-adjust: 107%;
    ascent-override: 90%;
  }
  .mh {
    font-family: 'Inter', 'Inter Fallback', system-ui, sans-serif;
  }
  ```

### 3.5 Smaller fixes

- **Theme colour:** make `Seo.web.tsx` use `#FFFBF5`, matching `metadata.ts`.
- **Social image:** add a 1200×630 `og:image` and switch Twitter to `summary_large_image`, in `pageMetadata` and in the client-side sync inside `Seo.web.tsx`.
- **Sitemap dates:** add `<lastmod>` to sitemap entries, taken from the git commit date of each page's source or from content update times.
- **Books page:** reconsider `noindex` on `/shastra-books-api`, since the endpoint exists. Review the audio landing page and its playable sample before indexing.

### 3.6 JavaScript weight (longer term)

About 294 KB of gzipped framework code renders pages that are essentially static HTML. Options, from least to most work:
1. Keep large page-only code out of shared chunks. The astrology catalog JSON is already split out; check that `DocsPage` and `Catalog` load only on their own routes.
2. Measure real INP with Search Console or CrUX before doing more.
3. If INP is poor, build the public site with a static-first tool (Astro, or a plain Vite build of the same components) and keep Expo for the console and native apps.

---

## 4. Structured data to add

Add these to the `graph` in `src/components/Seo.web.tsx`. Only mark up what the page visibly shows (Google's structured-data policy). The values below come from `shared/content-plans.json` and the current page copy.

**Rich results:**
- `SoftwareApplication` rich results need ratings or reviews, so this markup helps search engines understand the page but won't add stars.
- FAQ rich results are shown only for authoritative government and health sites, so add `FAQPage` only alongside a FAQ that's visible on the page.

### 4.1 Homepage: Organization and WebSite

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://mantrilo.com/#organization",
      "name": "Mantrilo",
      "url": "https://mantrilo.com/",
      "logo": "https://mantrilo.com/favicon.svg",
      "description": "A content API for developers building Hindu apps and websites: mantras, sacred audio, scripture books and Vedic and Western astrology."
    },
    {
      "@type": "WebSite",
      "@id": "https://mantrilo.com/#website",
      "url": "https://mantrilo.com/",
      "name": "Mantrilo",
      "publisher": { "@id": "https://mantrilo.com/#organization" },
      "inLanguage": "en"
    }
  ]
}
```

Add `sameAs` with your GitHub, LinkedIn or X profiles once they exist.

### 4.2 Product pages: the API as a SoftwareApplication with plan offers

Use this on `/`, `/mantra-api`, `/astrology-api`, `/shastra-books-api` and `/pricing`, changing `name` and `description` for each page.

```json
{
  "@type": "SoftwareApplication",
  "@id": "https://mantrilo.com/#api",
  "name": "Mantrilo API",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any (REST over HTTPS)",
  "url": "https://mantrilo.com/docs",
  "publisher": { "@id": "https://mantrilo.com/#organization" },
  "offers": [
    { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
    {
      "@type": "Offer",
      "name": "Starter",
      "price": "49.99",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "49.99",
        "priceCurrency": "USD",
        "unitText": "MONTH"
      }
    },
    {
      "@type": "Offer",
      "name": "Growth",
      "price": "149",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "149",
        "priceCurrency": "USD",
        "unitText": "MONTH"
      }
    },
    {
      "@type": "Offer",
      "name": "Business",
      "price": "399",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "399",
        "priceCurrency": "USD",
        "unitText": "MONTH"
      }
    }
  ]
}
```

Generate `offers` from `plans`, so the markup can't drift from billing:

```ts
offers: plans.map((p) => ({
  '@type': 'Offer',
  name: p.name,
  price: String(p.price),
  priceCurrency: 'USD',
  ...(p.price && {
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(p.price),
      priceCurrency: 'USD',
      unitText: 'MONTH',
    },
  }),
})),
```

### 4.3 Docs and each guide: TechArticle

```json
{
  "@type": "TechArticle",
  "headline": "Load the Upanishads",
  "description": "Call one collection directly, page through it, then open a book, chapter or verse.",
  "url": "https://mantrilo.com/docs/guides/load-the-upanishads",
  "about": { "@id": "https://mantrilo.com/#api" },
  "proficiencyLevel": "Beginner",
  "dependencies": "A Mantrilo API key",
  "inLanguage": "en",
  "dateModified": "2026-11-12",
  "publisher": { "@id": "https://mantrilo.com/#organization" }
}
```

Keep `BreadcrumbList` and add a third level for guide and capability pages: Home › Docs › Load the Upanishads.

### 4.4 FAQPage (only alongside a visible FAQ)

Add a short FAQ to `/pricing` and to each product page, then mirror it here:

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is there a free plan?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Every account starts with a sandbox key on the Free plan, with no card required."
      }
    },
    {
      "@type": "Question",
      "name": "Is astrology included in every plan?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Each successful astrology calculation counts as one request against your plan."
      }
    }
  ]
}
```

---

## 5. Information architecture and on-page

### 5.1 Structure

Everything is within two clicks of the homepage: header → page, or header → page → item. The URLs are short and descriptive. The gaps are:

- **Query-parameter detail pages** (see 2.4).
- **No real paths for depth.** There are no `/astrology-api/<capability>`, `/shastra-books-api/<collection>` or `/docs/guides/<guide>` URLs.
- **Pages with no top-level route.** Books and audio are linked only from the footer, the homepage and the Library. The header shows Docs, Library, Astrology and Pricing. Consider a "Products" menu holding Mantras, Audio, Books and Astrology.

### 5.2 Titles and descriptions

All 12 are unique. Most titles are 36 to 60 characters, but a few short ones could carry more: Contact is 16, Terms 31, License 33. Descriptions run 128 to 180 characters; the `/docs` one (180) will be cut off in results. Suggested changes:

| Page | Current title | Suggested title |
| --- | --- | --- |
| `/astrology-api` | Planetary Positions & Nakshatra API | Vedic & Western Astrology API: Kundli, Panchang, Synastry |
| `/shastra-books-api` | Hindu Scripture & Shastra Books API | Hindu Scripture API: Bhagavad Gita, Upanishads & More |
| `/mantra-api` | Mantra API for Developers | Mantra & Shloka API: Sanskrit, Transliteration, Meaning |
| `/docs` | Mantrilo API Documentation: Endpoints & Examples | Mantrilo API Docs: Guides, Endpoints & Examples |

### 5.3 Content depth and trust (E-E-A-T)

| Page | Words | Verdict |
| --- | --- | --- |
| `/docs` | 1,259 | Good |
| `/library` | 1,153 | Good, but `noindex` |
| `/astrology-api` | 1,062 | Good, but it covers 66 capabilities, so each gets only a few words |
| `/` | 873 | Fine |
| `/pricing` | 461 | Fine |
| `/mantra-api`, `/sacred-audio-api`, `/shastra-books-api` | ~370 each | Thin. Aim for 800 to 1,200 words of specifics: data model, sample records, coverage, source editions, use cases and a FAQ. |

Trust gaps, in order:
1. **Legal pages** say the final documents are missing. Publish real ones.
2. **No About page.** Add one saying who runs Mantrilo and how texts are sourced and checked (edition, transliteration scheme, translation sources).
3. **No source attribution on sample records.**
4. **No changelog or API versioning page.**

---

## 6. Developer search intent

### 6.1 Topics to target, mapped to pages

Volumes weren't measured; confirm priorities in Search Console or a keyword tool before writing.

| Query cluster | Page today | Gap and fix |
| --- | --- | --- |
| mantra API, shloka API, Sanskrit verse API | `/mantra-api` | Thin. Add examples of the data model and coverage. |
| Bhagavad Gita API, Upanishads API, Hindu scripture API | `/shastra-books-api` (`noindex`) | Index it, and add `/shastra-books-api/<collection>` pages. |
| Vedic astrology API, Kundli API, birth chart API | `/astrology-api` | Add a capability page for `chart`, plus a guide. |
| Panchang API, Hindu calendar API, tithi / nakshatra API | Only inside `/astrology-api` | Add a page for `daily-panchang` / `panchang`, but only for capabilities that run on your live plan. `daily-panchang` currently needs the provider key. |
| Guna Milan API, Ashtakoota matching API, synastry API | Only inside `/astrology-api` | Add capability pages for `match` and `western-synastry`. |
| Mantra audio API, chanting audio SDK | `/sacred-audio-api` (`noindex`) | Verify the playable sample, then index. |
| "Hindu app" build guides, e.g. "build a Bhagavad Gita app" | `/docs?guide=…` (not indexable) | Use the static guide URLs from 3.1, and add one tutorial per platform (React Native, Flutter, Next.js). |

Pages that rank on specific searches will do better than a broader "Hindu spiritual app" homepage. Keep every capability page honest about what actually runs.

### 6.2 Conversions

What's working:
- Every page has "Get API key", which opens console sign-up on Create account.
- Each guide ends with a sandbox-key button.
- Docs start with a quickstart.

To improve:
- **Capability and guide pages** (once they have their own URLs) should repeat the "Get a sandbox key" button beside the first request, not only at the bottom.
- **Pricing:** add an "Is there a free plan?" FAQ answer next to the plan cards, which is also the FAQ markup from 4.4.
- **Docs:** put a small "Run this in the console" link on each endpoint's request, pointing to `console…/docs?tab=try`, which the console already supports.
- **Measurement:** track the path from landing page to sign-up through the console's `?mode=signup`, with UTM-style source parameters, so organic sign-ups can be counted. Today there's no analytics at all.

---

## 7. Prioritised action plan

### Quick wins (days)

1. **Check that mantrilo.com is indexable** (robots.txt, meta robots, canonical). Rebuild with the production settings if not, and add the deploy check (3.2). *Impact: critical.*
2. **Commit the scroll fix** that's in the working tree (2.1). *Impact: critical for users.*
3. **Set up Search Console**, verify the domain, submit `sitemap.xml`, and inspect the 5 indexable URLs. *Impact: high.*
4. **Fix heading order:** the footer, pricing cards and product pages (3.3). *Impact: low to medium.*
5. **Add `og:image`, use `summary_large_image`, and fix the theme-colour mismatch** (3.5). *Impact: medium for click-through.*
6. **Add Organization, WebSite and SoftwareApplication with offers, generated from `plans`** (4.1, 4.2). *Impact: medium.*
7. **Revisit `noindex` on `/shastra-books-api`** (3.5). *Impact: medium.*
8. **Retitle the astrology, books, mantra and docs pages for clearer searches** (5.2). *Impact: medium.*

### Medium term (weeks)

9. **Give capabilities, guides and collections their own static pages,** with metadata, sitemap entries and BreadcrumbList/TechArticle markup (3.1, 4.3). *Impact: highest; turns 5 indexable URLs into roughly 80.*
10. **Expand the three product pages to 800 to 1,200 words,** with a visible FAQ and FAQ markup (5.3, 4.4). *Impact: high.*
11. **Publish real privacy, terms and license pages, and add an About / sourcing page** (5.3). *Impact: high for trust.*
12. **Load only the Devanagari characters used, and trim font weights** (3.4). *Impact: low to medium.*

### Long term (months)

13. **Add one tutorial per platform and use case,** such as "Build a Bhagavad Gita reader in React Native" or "Add a daily Panchang to a Next.js site", each linking to its guide and sign-up. *Impact: high for the long tail.*
14. **Once text rights are cleared, consider public per-verse or per-collection reading pages,** with Devanagari and transliteration on one URL and a sitemap index if they number in the thousands. *Impact: high, but needs rights.*
15. **Measure INP; if it's poor, move the public site to a static-first build** (3.6). *Impact: medium.*
16. **Add analytics for the landing page → sign-up path** (6.2). *Impact: lets you measure everything else.*
