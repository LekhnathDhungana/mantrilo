import { Link } from 'expo-router';
import PageShell from './PageShell.web';
import { productPages, type ProductSlug } from '../data/products';
import { samples } from '../data/samples';
export default function ProductPage({ slug }: { slug: ProductSlug }) {
  const page = productPages[slug];
  return (
    <PageShell path={`/${slug}`}>
      <section className="wrap product-hero">
        <div className="eyebrow">{page.label} / FOR APPS & WEBSITES</div>
        <h1>{page.title}</h1>
        <p className="product-intro">{page.intro}</p>
        <div className="hero-actions">
          <Link className="button" href="/access">
            Prepare an access request ↗
          </Link>
          <Link className="text-link" href="/docs">
            Integration planning guide →
          </Link>
        </div>
        <div className="notice">{page.status}</div>
      </section>
      <section className="wrap product-detail">
        <div className="product-copy">
          {page.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.copy}</p>
            </section>
          ))}
        </div>
        <aside className="product-example">
          <div className="eyebrow">INTEGRATION EXAMPLE</div>
          <h2>{page.exampleTitle}</h2>
          <p>
            Illustrative field names and placeholder values. Confirm production endpoints and
            schemas before building.
          </p>
          <pre>
            <code>{JSON.stringify(samples[page.sample], null, 2)}</code>
          </pre>
          <h3>Example application workflow</h3>
          <ol>
            {page.workflow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Link className="text-link" href="/license">
            Review content license status →
          </Link>
        </aside>
      </section>
      <section className="wrap related-section">
        <h2>Plan the rest of your integration.</h2>
        <div className="related-links">
          {Object.entries(productPages)
            .filter(([key]) => key !== slug)
            .map(([key, value]) => (
              <Link key={key} href={`/${key}`}>
                {value.label} ↗
              </Link>
            ))}
          <Link href="/astrology-api">ASTROLOGY API ↗</Link>
          <Link href="/pricing">COMPARE MONTHLY PLANS ↗</Link>
        </div>
        <p>
          Existing content plans cover available mantras, shlokas, sacred audio, shastra books, and
          discovery, subject to the documented content license. Astrology uses separate add-on
          configuration and credit accounting.
        </p>
      </section>
    </PageShell>
  );
}
