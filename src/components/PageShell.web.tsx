import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import Brand from './Brand.web';
import Seo from './Seo.web';
import { seoPages } from '../data/site';
import './marketing.css';
export default function PageShell({ path, children }: { path: string; children: ReactNode }) {
  return (
    <>
      <Seo path={path} />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="wrap product-header">
        <Link href="/" aria-label="Mantrilo home">
          <Brand />
        </Link>
        <nav aria-label="Product navigation">
          <Link href="/mantra-shloka-api">Mantras & shlokas</Link>
          <Link href="/sacred-audio-api">Audio</Link>
          <Link href="/shastra-books-api">Books</Link>
          <Link href="/astrology-api">Astrology</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Developers</Link>
        </nav>
      </header>
      <main id="main">
        {' '}
        <div className="wrap breadcrumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{seoPages[path]?.label}</span>
        </div>
        {children}
      </main>
      <footer className="footer">
        <div className="wrap footer-top">
          <Link href="/" aria-label="Mantrilo home">
            <Brand />
          </Link>
          <nav className="footer-links" aria-label="Footer">
            <Link href="/docs">Integration guide</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/access">Contact & access</Link>
            <Link href="/license">Content license</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
