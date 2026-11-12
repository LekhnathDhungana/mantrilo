import { Link } from 'expo-router';
import { Arrow, CtaBand, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CatalogBrowser } from './site/Catalog.web';
import { astrologyCategories, astrologyItems } from '../data/library';

const available = astrologyItems.filter((item) => !item.limited).length;

export default function AstrologyPage() {
  return (
    <SiteFrame path="/astrology-api">
      <PageHero
        crumb="Astrology"
        eyebrow="Astrology API"
        title="Charts, Panchang and matching from one endpoint."
        lede="Browse every capability. Each one lists its inputs, a copyable request with synthetic birth data, a representative response and the guide that builds on it."
        actions={
          <>
            <KeyButton />
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
              <dt>Available now</dt>
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
          <CatalogBrowser
            pathname="/astrology-api"
            items={astrologyItems}
            fixedArea="astrology"
            placeholder={`Search ${astrologyItems.length} capabilities: chart, panchang, transit…`}
          />
          <p className="mh-muted mh-catalog-note">
            Availability comes from the published operation catalog. Core capabilities run on
            Mantrilo’s own engine; limited ones depend on an upstream provider. Every successful
            calculation is one request on any plan, and failed calculations are not charged.
          </p>
        </div>
      </section>
      <CtaBand
        title="Run a calculation in the sandbox."
        copy="Every account starts with a sandbox key that runs every available capability."
      />
    </SiteFrame>
  );
}
