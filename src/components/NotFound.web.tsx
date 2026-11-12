import { Link } from 'expo-router';
import { Arrow, SiteFrame } from './site/Chrome.web';

export default function NotFound() {
  return (
    <SiteFrame path="/404" notFound>
      <section className="mh-section">
        <div className="mh-wrap mh-notfound">
          <p className="mh-eyebrow">404</p>
          <h1>That page isn’t here.</h1>
          <p className="mh-page-lede">Try the docs, the Library or the homepage.</p>
          <div className="mh-actions">
            <Link className="mh-btn mh-btn-primary" href="/">
              Mantrilo home <Arrow />
            </Link>
            <Link className="mh-btn mh-btn-ghost" href="/docs">
              API documentation <Arrow />
            </Link>
            <Link className="mh-btn mh-btn-ghost" href="/library">
              Library <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
