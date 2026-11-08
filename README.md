# Mantrilo marketing website

Expo SDK 58, React 19, and Expo Router. The responsive website uses semantic HTML in platform-specific `.web.tsx` components; native builds retain a lightweight React Native overview. All routes live in `src/app`; fixtures and plan data are outside that directory.

## Run and verify

```sh
npm ci
npm run web
npm run lint
npm run typecheck
npm run build
```

`npm run build` statically exports routes to `dist/`. Serve that directory with a static server that supports clean URLs (`/docs` → `/docs.html`). Do not use Expo's development server in production.

## Configuration

Copy `.env.example` to `.env.local` and optionally set a verified `EXPO_PUBLIC_CONTACT_EMAIL`. This is a public build-time value. Rebuild when it changes. Without it, the access form prepares a downloadable text draft and clearly states that it sends nothing. With it, visitors can open the prepared request in their email app. There is no submission backend.

Keep private API keys server-side, preferably in GCP Secret Manager. No secret is needed to build this site. Never use `EXPO_PUBLIC_*` for credentials.

- Pricing: `shared/content-plans.json` is the single source of truth; `src/data/plans.ts` re-exports it for marketing cards and the comparison table.
- Samples: `src/data/samples.ts` contains illustrative schema fixtures only. No catalog title, translation, audio, or content license has been supplied.
- Pages: `/mantra-shloka-api`, `/sacred-audio-api`, `/shastra-books-api`, `/astrology-api`, `/pricing`, `/docs`, `/access`, `/privacy`, `/terms`, `/license` are working routes; legal pages disclose missing final documents and grant no rights.
- The ornamental rosette is a local SVG, not a product or authenticity claim. Devanagari uses system fonts with no third-party font request.

## GCP preparation (not deployed)

No existing GCP project or resources were found. `deployment/Dockerfile` builds the static export and serves it on port 8080 using unprivileged Nginx for Cloud Run. `deployment/nginx.conf` resolves clean URLs. Build with the repository as context:

```sh
docker build -f deployment/Dockerfile -t mantrilo-web .
# Optional: --build-arg EXPO_PUBLIC_CONTACT_EMAIL=<verified-address>
docker run --rm -p 8080:8080 mantrilo-web
```

After selecting a GCP project, region, and Artifact Registry repository, push the image there and deploy to Cloud Run using the project's existing access policy. Keep authentication required for a private preview; do not grant `allUsers` invoker access without explicit authorization. The container listens on Cloud Run's default port 8080. No cloud resource has been created or changed.

## Connections required before launch

Production catalog and verified titles; API endpoints and documentation; account/API-key provisioning; usage reporting; billing/checkout; verified contact or request service; final privacy policy, service terms, and content license. No fake checkout, audio playback, or submission success is implemented. Audio preview shows metadata only because no recording was supplied. Astrology is presented as a product capability; its live service connection and billing require configuration.

## Verification performed

- `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- Checked all 42 internal links against exported routes and anchors; none broken.
- Browser checks covered desktop and 390px mobile layouts, content tabs and keyboard switching, mobile menu, pricing, FAQ expansion, documentation navigation, and access-request drafts with both linked and manually changed plans. Mobile document width equals the viewport width.
- GCP container configuration is prepared but was not built locally because Docker is unavailable. No GCP deployment was attempted.

After building, `npm run preview` serves the export on `http://localhost:4187`, bound to localhost only.

## SEO and astrology

See [the implementation audit, search-theme map, verification, decisions, and launch checklist](docs/SEO-IMPLEMENTATION.md). Search metadata lives in `src/data/seo-pages.json`; Expo 58 route `generateMetadata` exports render it into initial HTML. `src/components/Seo.web.tsx` keeps it synchronized on client navigation and renders truthful JSON-LD when a confirmed origin is configured.

Private/local builds default to noindex. Set `EXPO_PUBLIC_SITE_URL` to the verified HTTPS production origin and explicitly set `EXPO_PUBLIC_INDEXING_ENABLED=true` only for an authorized production build. Without a configured origin, canonical/structured-data URLs are omitted and the preview sitemap is empty. `npm run check:seo` verifies the default preview export. Keep Cloud Run previews authenticated; robots directives do not control access.

Astrology is linked from the homepage and navigation without a planned badge. This preview still requires a connected service, documented operations, credit costs, and billing; the inquiry path only prepares a local draft. Existing content plans are unchanged.

## Separate Developer Console

The customer console lives in [`developer/`](developer/README.md), with its own package, Expo routes, Node backend, environment template, GCP preparation, bootstrap command, and security tests. Its loopback preview uses port 4190. Content pricing is shared through `shared/content-plans.json` without changing the existing plan values.
