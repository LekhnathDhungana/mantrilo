import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { Link } from '../../i18n/Link.web';
import Seo from '../Seo.web';
import type { PageMeta } from '../../data/metadata';
import Brand, { Rosette } from '../Brand.web';
import { signInUrl, signUpUrl } from '../../data/site';
import { rememberConsoleChannel, tagConsoleEntry } from './consoleSource.web';
import { installPageTransitions, pageShown } from './pageTransition.web';
import {
  applyDocumentLocale,
  detectLocale,
  hasLocalizedUrl,
  intlLocale,
  loadLocale,
  localizePath,
  locales,
  saveLocale,
  setPreferredLocale,
  splitLocale,
  useI18n,
  type Locale,
} from '../../i18n';
import './site.css';

// Shared frame for every public page: fonts, theme, header, footer and scroll reveals.

const THEME_KEY = 'mantrilo-theme';
type Theme = 'light' | 'dark';

const nav: [string, string][] = [
  ['/docs', 'nav.docs'],
  ['/library/mantras', 'nav.mantras'],
  ['/library/books', 'nav.books'],
  ['/astrology-api', 'nav.astrology'],
  ['/calculators', 'nav.calculators'],
  ['/blog', 'nav.blog'],
  ['/pricing', 'nav.pricing'],
];
const serverRoutes = new Set(['/blog']);

export function Arrow() {
  return (
    <svg className="mh-arrow" viewBox="0 0 10 10" aria-hidden="true">
      <path className="mh-arrow-line" d="M0 5h7" />
      <path d="M1 1l4 4-4 4" />
    </svg>
  );
}

export function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="mh-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Divider() {
  return (
    <div className="mh-wrap mh-divider" aria-hidden="true">
      <span />
      <svg viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" />
        <circle cx="16" cy="16" r="2" />
        <path d="M16 4.5l10 17.3H6zM16 27.5L6 10.2h20z" />
      </svg>
      <span />
    </div>
  );
}

// "Get API key" opens sign-up in the developer console.
export function KeyButton({
  className = 'mh-btn mh-btn-primary',
  children,
  href = signUpUrl,
}: {
  className?: string;
  children?: ReactNode;
  href?: string;
}) {
  const { t } = useI18n();
  return (
    <a href={href} className={className}>
      {children ?? t('common.getApiKey')} <Arrow />
    </a>
  );
}

// Lists each language in its own script. Switching keeps the visitor on the same page: a page with
// localized URLs moves to the chosen language's address; a catalog page re-renders in place.
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, lang, path } = useI18n();
  const pathname = usePathname();
  async function choose(code: Locale) {
    saveLocale(code);
    await loadLocale(code);
    applyDocumentLocale(code);
    if (hasLocalizedUrl(path)) {
      const { search, hash } = window.location;
      const target = localizePath(path, code) + search + hash;
      if (target !== pathname + search + hash) router.replace(target as never);
    } else setPreferredLocale(code);
  }
  return (
    <label className={`mh-lang ${className}`}>
      <span className="mh-visually-hidden">{t('common.language')}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </svg>
      <select value={lang} onChange={(e) => choose(e.target.value as Locale)}>
        {locales.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SiteFrame({
  path,
  meta,
  notFound = false,
  children,
}: {
  path: string;
  /** Metadata for a generated page that is not listed in seo-pages.json. */
  meta?: PageMeta;
  notFound?: boolean;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Before the first paint of each page: the saved theme (also on <html>, whose background shows
  // between pages) and the reveal start state, so neither flickers in after a navigation.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if ((saved === 'light' || saved === 'dark') && root.current) {
        root.current.dataset.theme = saved;
        document.documentElement.dataset.theme = saved;
      }
    } catch {}
    if ('IntersectionObserver' in window) root.current?.classList.add('mh-js');
    installPageTransitions();
  }, []);

  useLayoutEffect(() => {
    pageShown(pathname);
  }, [pathname]);

  // <html lang dir> follows the page's language through client-side navigation.
  useLayoutEffect(() => {
    applyDocumentLocale(lang);
  }, [lang]);

  // A catalog page has one English URL: show it in the visitor's saved or browser language. A page
  // under /<lang>/ also makes that the language for catalog pages opened from it.
  useEffect(() => {
    const [urlLang, bare] = splitLocale(pathname);
    if (urlLang) setPreferredLocale(urlLang);
    else if (!hasLocalizedUrl(bare)) setPreferredLocale(detectLocale());
  }, [pathname]);

  useEffect(() => {
    rememberConsoleChannel();
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveals. Content renders visible; the hidden start state only applies once JS runs.
  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('mh-in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    const watch = () =>
      el.querySelectorAll('[data-reveal]:not(.mh-in)').forEach((n) => io.observe(n));
    watch();
    // Pages that render new content later (tabs, filters) still reveal it.
    const mo = new MutationObserver(watch);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  function toggleTheme() {
    const el = root.current;
    if (!el) return;
    const current =
      el.dataset.theme ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    el.dataset.theme = next;
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  // The most specific link wins, so a book page marks Books rather than Library.
  const [, barePath] = splitLocale(pathname);
  const currentNav = nav
    .map(([href]) => href)
    .filter((href) => barePath === href || barePath.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0];
  const active = (href: string) => href === currentNav;

  return (
    <div
      className="mh"
      ref={root}
      onClickCapture={(event) => {
        if (!notFound) tagConsoleEntry(event.target, path);
      }}
    >
      <Seo path={path} meta={meta} notFound={notFound} />
      <a className="mh-skip" href="#main">
        {t('chrome.skip')}
      </a>

      <header className={scrolled ? 'mh-header is-scrolled' : 'mh-header'}>
        <div className="mh-wrap mh-nav">
          <Link href="/" aria-label={t('chrome.home')} className="mh-logo">
            <Brand />
          </Link>
          <nav
            id="mh-navigation"
            className={menu ? 'mh-links is-open' : 'mh-links'}
            aria-label={t('chrome.mainNav')}
          >
            {nav.map(([href, label]) =>
              // The blog is served by the console service, so it needs a full page load:
              // in-app navigation would look for a /blog route here and show the 404.
              serverRoutes.has(href) ? (
                <a key={href} href={href} aria-current={active(href) ? 'page' : undefined}>
                  {t(label)}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  aria-current={active(href) ? 'page' : undefined}
                  onPress={() => setMenu(false)}
                >
                  {t(label)}
                </Link>
              ),
            )}
            <a href={signInUrl} className="mh-links-signin">
              {t('common.signIn')}
            </a>
            <LanguageSwitcher className="mh-links-lang" />
            <span className="mh-links-cta">
              <KeyButton className="mh-btn mh-btn-primary" />
            </span>
          </nav>
          <div className="mh-nav-actions">
            <a href={signInUrl} className="mh-signin">
              {t('common.signIn')}
            </a>
            <LanguageSwitcher className="mh-nav-lang" />
            <button
              type="button"
              className="mh-icon-btn"
              onClick={toggleTheme}
              aria-label={t('chrome.theme')}
            >
              <svg className="mh-sun" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
              <svg className="mh-moon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
              </svg>
            </button>
            <KeyButton className="mh-btn mh-btn-primary mh-btn-sm mh-nav-cta" />
            <button
              type="button"
              className="mh-icon-btn mh-menu-btn"
              aria-expanded={menu}
              aria-controls="mh-navigation"
              aria-label={menu ? t('chrome.closeMenu') : t('chrome.openMenu')}
              onClick={() => setMenu(!menu)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="mh-footer">
        <svg className="mh-footer-pattern" aria-hidden="true">
          <defs>
            <pattern id="mh-yantra" width="56" height="56" patternUnits="userSpaceOnUse">
              <circle cx="28" cy="28" r="20" />
              <circle cx="28" cy="28" r="10" />
              <path d="M28 4l20.8 36H7.2zM28 52L7.2 16h41.6z" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mh-yantra)" />
        </svg>
        <div className="mh-wrap mh-footer-grid">
          <div className="mh-footer-brand">
            <Link href="/" aria-label={t('chrome.home')}>
              <Brand />
            </Link>
            <p>{t('footer.tagline')}</p>
          </div>
          <nav aria-label={t('footer.products')}>
            <p className="mh-footer-label">{t('footer.products')}</p>
            <Link href="/mantra-api">{t('footer.mantras')}</Link>
            <Link href="/sacred-audio-api">{t('footer.sacredAudio')}</Link>
            <Link href="/books-api">{t('footer.books')}</Link>
            <Link href="/astrology-api">{t('footer.astrology')}</Link>
            <Link href="/calculators">{t('footer.signCalculators')}</Link>
          </nav>
          <nav aria-label={t('footer.developers')}>
            <p className="mh-footer-label">{t('footer.developers')}</p>
            <Link href="/docs">{t('footer.apiDocs')}</Link>
            <Link href="/docs#guides">{t('footer.guides')}</Link>
            <Link href="/library">{t('footer.library')}</Link>
            <Link href="/pricing">{t('footer.pricing')}</Link>
            <a href={signUpUrl}>{t('common.getApiKey')}</a>
          </nav>
          <nav aria-label={t('footer.company')}>
            <p className="mh-footer-label">{t('footer.company')}</p>
            <Link href="/about">{t('footer.about')}</Link>
            <Link href="/license">{t('footer.license')}</Link>
            <Link href="/privacy">{t('footer.privacy')}</Link>
            <Link href="/terms">{t('footer.terms')}</Link>
            <Link href="/contact">{t('footer.contact')}</Link>
          </nav>
        </div>
        <div className="mh-wrap mh-footer-base">
          <span>
            ©{' '}
            <span dir="ltr">
              {new Intl.DateTimeFormat(intlLocale(lang), { year: 'numeric' }).format(new Date())}
            </span>{' '}
            Mantrilo
          </span>
          <span lang="sa-Deva" className="mh-footer-sanskrit">
            सर्वे भवन्तु सुखिनः
          </span>
        </div>
      </footer>
    </div>
  );
}

// Page shell for inner pages: breadcrumb + a compact hero with an optional aside.
export function PageHero({
  eyebrow,
  title,
  lede,
  actions,
  aside,
  crumb,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  crumb?: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className={aside ? 'mh-page-hero has-aside' : 'mh-page-hero'}>
      <div className="mh-mesh mh-mesh-soft" aria-hidden="true">
        <span className="mh-blob mh-blob-1" />
        <span className="mh-blob mh-blob-2" />
        <span className="mh-blob mh-blob-4" />
      </div>
      <div className="mh-wrap mh-page-hero-grid">
        <div className="mh-page-hero-copy">
          {crumb && (
            <nav className="mh-crumbs" aria-label={t('chrome.breadcrumb')}>
              <Link href="/">{t('chrome.crumbHome')}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{crumb}</span>
            </nav>
          )}
          <p className="mh-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {lede && <p className="mh-page-lede">{lede}</p>}
          {actions && <div className="mh-actions">{actions}</div>}
          {children}
        </div>
        {aside && <div className="mh-page-hero-aside">{aside}</div>}
      </div>
    </section>
  );
}

export function Callout({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn';
  children: ReactNode;
}) {
  return (
    <div className={`mh-callout mh-callout-${tone}`}>
      <div>{children}</div>
    </div>
  );
}

export function DataTable({
  label,
  head,
  rows,
  codeFirst = true,
}: {
  label: string;
  head: string[];
  rows: ReactNode[][];
  codeFirst?: boolean;
}) {
  return (
    <div className="mh-table" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead>
          <tr>
            {head.map((title) => (
              <th scope="col" key={title}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i}>
                  {i === 0 && codeFirst && typeof cell === 'string' ? <code>{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CtaBand({ title, copy }: { title: string; copy: string }) {
  const { t } = useI18n();
  return (
    <section className="mh-section">
      <div className="mh-wrap">
        <div className="mh-cta" data-reveal>
          <div className="mh-mesh mh-mesh-cta" aria-hidden="true">
            <span className="mh-blob mh-blob-1" />
            <span className="mh-blob mh-blob-2" />
            <span className="mh-blob mh-blob-3" />
            <span className="mh-blob mh-blob-4" />
          </div>
          <Rosette className="mh-cta-ring" />
          <h2>{title}</h2>
          <p>{copy}</p>
          <div className="mh-actions">
            <KeyButton className="mh-btn mh-btn-ink" />
            <Link href="/docs" className="mh-btn mh-btn-glass">
              {t('common.readDocs')} <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
