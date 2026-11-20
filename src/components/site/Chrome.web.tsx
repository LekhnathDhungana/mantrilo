import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, usePathname } from 'expo-router';
import Seo from '../Seo.web';
import type { PageMeta } from '../../data/metadata';
import Brand, { Rosette } from '../Brand.web';
import { signInUrl, signUpUrl } from '../../data/site';
import { rememberConsoleChannel, tagConsoleEntry } from './consoleSource.web';
import './site.css';

// Shared frame for every public page: fonts, theme, header, footer and scroll reveals.

const THEME_KEY = 'mantrilo-theme';
type Theme = 'light' | 'dark';

const nav: [string, string][] = [
  ['/docs', 'Docs'],
  ['/library', 'Library'],
  ['/astrology-api', 'Astrology'],
  ['/pricing', 'Pricing'],
];

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
  children = 'Get API key',
  href = signUpUrl,
}: {
  className?: string;
  children?: ReactNode;
  href?: string;
}) {
  return (
    <a href={href} className={className}>
      {children} <Arrow />
    </a>
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
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if ((saved === 'light' || saved === 'dark') && root.current)
        root.current.dataset.theme = saved;
    } catch {}
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
    el.classList.add('mh-js');
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
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

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
        Skip to content
      </a>

      <header className={scrolled ? 'mh-header is-scrolled' : 'mh-header'}>
        <div className="mh-wrap mh-nav">
          <Link href="/" aria-label="Mantrilo home" className="mh-logo">
            <Brand />
          </Link>
          <nav
            id="mh-navigation"
            className={menu ? 'mh-links is-open' : 'mh-links'}
            aria-label="Main navigation"
          >
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? 'page' : undefined}
                onPress={() => setMenu(false)}
              >
                {label}
              </Link>
            ))}
            <a href={signInUrl} className="mh-links-signin">
              Sign in
            </a>
            <span className="mh-links-cta">
              <KeyButton className="mh-btn mh-btn-primary" />
            </span>
          </nav>
          <div className="mh-nav-actions">
            <a href={signInUrl} className="mh-signin">
              Sign in
            </a>
            <button
              type="button"
              className="mh-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
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
              aria-label={menu ? 'Close menu' : 'Open menu'}
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
            <Link href="/" aria-label="Mantrilo home">
              <Brand />
            </Link>
            <p>Sacred content, thoughtfully connected.</p>
          </div>
          <nav aria-label="Products">
            <p className="mh-footer-label">Products</p>
            <Link href="/mantra-api">Mantras</Link>
            <Link href="/sacred-audio-api">Sacred audio</Link>
            <Link href="/books-api">Books</Link>
            <Link href="/astrology-api">Astrology</Link>
          </nav>
          <nav aria-label="Developers">
            <p className="mh-footer-label">Developers</p>
            <Link href="/docs">API docs</Link>
            <Link href="/docs#guides">Guides by goal</Link>
            <Link href="/library">Content library</Link>
            <Link href="/pricing">Pricing</Link>
            <a href={signUpUrl}>Get API key</a>
          </nav>
          <nav aria-label="Company">
            <p className="mh-footer-label">Company</p>
            <Link href="/about">About Mantrilo</Link>
            <Link href="/license">Content license</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
        <div className="mh-wrap mh-footer-base">
          <span>© {new Date().getFullYear()} Mantrilo</span>
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
            <nav className="mh-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
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
              Read the docs <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
