import { Link } from '../i18n/Link.web';
import { Arrow, SiteFrame } from './site/Chrome.web';
import { useI18n } from '../i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <SiteFrame path="/404" notFound>
      <section className="mh-section">
        <div className="mh-wrap mh-notfound">
          <p className="mh-eyebrow">404</p>
          <h1>{t('notFound.title')}</h1>
          <p className="mh-page-lede">{t('notFound.lede')}</p>
          <div className="mh-actions">
            <Link className="mh-btn mh-btn-primary" href="/">
              {t('notFound.home')} <Arrow />
            </Link>
            <Link className="mh-btn mh-btn-ghost" href="/docs">
              {t('notFound.docs')} <Arrow />
            </Link>
            <Link className="mh-btn mh-btn-ghost" href="/library">
              {t('meta./library.label')} <Arrow />
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
