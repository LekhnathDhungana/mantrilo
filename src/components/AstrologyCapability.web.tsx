import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/astrology-api/[capability]';
import NotFound from './NotFound';
import { Callout, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { itemText } from './site/Catalog.web';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';

export default function AstrologyCapability() {
  const data = useLoaderData<typeof loader>();
  const { t } = useI18n();
  if (!data) return <NotFound />;
  const { page, item, related } = data;
  const text = itemText(t, item);
  const label = (path: string, name: string) =>
    t(`meta.${path}.label`) || t('meta.astrologyCapability.label', { name });
  const heading = label(page.path, page.name);
  const daily = page.operation === 'daily-panchang';
  const instant = page.operation === 'panchang';
  return (
    <SiteFrame path={page.path}>
      <PageHero
        eyebrow={`${t('meta./astrology-api.label')} · ${text.facet}`}
        title={heading}
        lede={text.summary}
        actions={
          item.sandbox ? <KeyButton href={item.sandbox}>{t('astroCap.try')}</KeyButton> : undefined
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            {item.limited && <Callout tone="warn">{t('astroCap.limited')}</Callout>}
            <h2>{t('astroCap.make')}</h2>
            <p>
              <Rich
                text={t('astroCap.send')}
                tags={{
                  operation: <code>{`"operation": "${page.operation}"`}</code>,
                  endpoint: (
                    <code>
                      {item.method} {item.path}
                    </code>
                  ),
                }}
              />
            </p>
            <p>{text.inputs}</p>
            <h2>{t('astroCap.build')}</h2>
            <p>{text.render}</p>
            <p>{text.usage}</p>
            {instant && (
              <p>
                <Rich
                  text={t('astroCap.instant')}
                  tags={{ link: <Link href="/astrology-api/daily-panchang" /> }}
                />
              </p>
            )}
            {daily && (
              <>
                <h2>{t('astroCap.dailyTitle')}</h2>
                <p>{t('astroCap.daily1')}</p>
                <p>
                  <Rich
                    text={t('astroCap.daily2')}
                    tags={{ link: <Link href="/astrology-api/instant-panchang" /> }}
                  />
                </p>
              </>
            )}
            <h2>{t('astroCap.reference')}</h2>
            <p>
              <Link href={item.docs}>{t('astroCap.readReference')}</Link> ·{' '}
              <Link href={item.guide}>{t('upanishads.guide')}</Link>
              {item.sandbox && (
                <>
                  {' '}
                  · <a href={item.sandbox}>{t('astroCap.trySandbox')}</a>
                </>
              )}
            </p>
            {related.length > 0 && (
              <>
                <h2>{t('astroCap.related', { category: text.facet })}</h2>
                <ul>
                  {related.map((entry) => (
                    <li key={entry.path}>
                      <Link href={entry.path}>
                        {label(entry.path, entry.label.replace(/ API$/, ''))}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p>
              <Link href="/astrology-api">{t('astroCap.browseAll')}</Link>
            </p>
          </div>
          <div className="mh-stack">
            <CodePanel title={item.path} method={item.method} code={item.request} />
            <CodePanel title={text.responseLabel} status="200 OK" json={item.response} />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
