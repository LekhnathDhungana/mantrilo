import { Link } from 'expo-router';
import { plans } from '../data/plans';
export default function PricingTables() {
  return (
    <section id="pricing" className="section wrap">
      <div className="pricing-heading">
        <div className="eyebrow">05 / ROOM TO GROW</div>
        <h2>A plan for your next chapter.</h2>
        <p>Start with sample content. Choose more capacity as your product grows.</p>
        <span className="billing-label">
          Monthly billing <span>·</span> All allowances reset monthly
        </span>
      </div>
      <div className="pricing-grid">
        {plans.map((p) => (
          <article className={`plan ${p.name === 'Growth' ? 'featured' : ''}`} key={p.name}>
            {p.name === 'Growth' && <div className="plan-ribbon">FOR GROWING PRODUCTS</div>}
            <h3>{p.name}</h3>
            <div className="price">
              {p.price === 0 ? 'Free' : `$${p.price}`}
              <span>{p.price === 0 ? 'Sandbox access' : '/ month'}</span>
            </div>
            <p className="plan-description">{p.catalog}</p>
            <Link
              className={`button ${p.name === 'Growth' ? '' : 'button-outline'}`}
              href={`/access?plan=${p.name}`}
            >
              Request {p.name} access <span>↗</span>
            </Link>
            <ul className="plan-list">
              <li>
                <strong>{p.requests}</strong> API requests / month
              </li>
              <li>
                {p.audio}
                {p.price > 0 ? ' audio delivery / month' : ''}
              </li>
              <li>
                {p.price === 0 ? 'Sample text, audio & books' : 'Mantras, shlokas, audio & books'}
              </li>
              <li>
                {p.price === 0
                  ? p.products
                  : `${p.products} customer ${p.products === '1' ? 'product' : 'products'}`}
              </li>
              <li>{p.support}</li>
            </ul>
          </article>
        ))}
      </div>
      <div
        className="comparison-scroll"
        tabIndex={0}
        role="region"
        aria-label="Plan comparison, scroll horizontally on small screens"
      >
        <table>
          <caption>Compare what’s included</caption>
          <thead>
            <tr>
              <th scope="col">Plan details</th>
              {plans.map((p) => (
                <th scope="col" key={p.name}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['API requests / month', ...plans.map((p) => p.requests)],
              ['Audio data delivery / month', ...plans.map((p) => p.audio)],
              [
                'Mantras, shlokas & discovery',
                ...plans.map((p) => (p.price ? 'Full available catalog' : 'Sample catalog')),
              ],
              [
                'Shastras & books',
                ...plans.map((p) => (p.price ? 'Full available catalog' : 'Sample catalog')),
              ],
              ['Customer products', ...plans.map((p) => p.products)],
              ['Support', ...plans.map((p) => p.support)],
            ].map(([label, ...values]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {values.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pricing-note">
        A customer product is an app or website covered by your plan. Paid plans include the
        available mantras, shlokas, sacred audio, shastra books, and discovery features for
        commercial integration, subject to the{' '}
        <Link href="/license">documented content license</Link>. Audio allowances measure data
        delivery, not storage. Astrology is managed separately from these content-plan allowances.
        Its billing connection and endpoint credit costs require configuration.
      </p>
    </section>
  );
}
