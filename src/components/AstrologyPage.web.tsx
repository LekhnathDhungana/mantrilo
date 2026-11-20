import { Link } from 'expo-router';
import { Arrow, CtaBand, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CatalogBrowser } from './site/Catalog.web';
import { consoleSandboxUrl } from '../data/site';
import { astrologyCategories, astrologyItems } from '../data/library';

const available = astrologyItems.filter((item) => !item.limited).length;

export default function AstrologyPage() {
  return (
    <SiteFrame path="/astrology-api">
      <PageHero
        crumb="Astrology"
        eyebrow="Astrology API"
        title="Astrology API for developers"
        lede="Browse every capability. Each one lists its inputs, a copyable request with synthetic birth data, a representative response and the guide that builds on it."
        actions={
          <>
            <KeyButton href={consoleSandboxUrl({ operation: 'positions' })}>
              Try planetary positions
            </KeyButton>
            <Link href="/docs#astrology-calculate" className="mh-btn mh-btn-ghost">
              Endpoint reference <Arrow />
            </Link>
          </>
        }
        aside={
          <dl className="mh-stat-grid">
            <div>
              <dt>Capabilities</dt>
              <dd>{astrologyItems.length}</dd>
            </div>
            <div>
              <dt>Marked available</dt>
              <dd>{available}</dd>
            </div>
            <div>
              <dt>Categories</dt>
              <dd>{astrologyCategories.length}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>
                <code>POST /v1/astrology/calculate</code>
              </dd>
            </div>
          </dl>
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap">
          <nav className="mh-chips" aria-label="Featured astrology API references">
            <Link href="/astrology-api/planetary-positions" className="mh-chip">
              Planetary Positions API
            </Link>
            <Link href="/astrology-api/instant-panchang" className="mh-chip">
              Instant Panchang API
            </Link>
            <Link href="/astrology-api/daily-panchang" className="mh-chip">
              Daily Panchang API
            </Link>
            <Link href="/docs/guides/vedic-birth-chart" className="mh-chip">
              Vedic birth chart guide
            </Link>
          </nav>
          <CatalogBrowser
            pathname="/astrology-api"
            items={astrologyItems}
            fixedArea="astrology"
            placeholder={`Search ${astrologyItems.length} capabilities: chart, panchang, transit…`}
          />
          <p className="mh-muted mh-catalog-note">
            Availability reflects the catalog at the time this page was published. Core capabilities
            run on Mantrilo’s own engine. Limited operations may be unavailable. Every successful
            calculation is one request on any plan, and failed calculations are not charged.
          </p>
        </div>
      </section>
      <CtaBand
        title="Run a calculation in the sandbox."
        copy="Use a sandbox key to test available calculations. The console shows current availability."
      />
    </SiteFrame>
  );
}
