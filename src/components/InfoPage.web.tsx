import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Link } from '../i18n/Link.web';
import { signUpUrl } from '../data/site';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';
import DocsPage from './DocsPage.web';
import { Arrow, PageHero, SiteFrame } from './site/Chrome.web';

const pages = new Set(['about', 'contact', 'privacy', 'terms', 'license']);

export default function InfoPage({ page }: { page: string }) {
  if (page === 'docs') return <DocsPage />;
  return <StaticPage page={page} />;
}

function StaticPage({ page }: { page: string }) {
  const { t } = useI18n();
  const known = pages.has(page);
  const { interest } = useLocalSearchParams<{ interest?: string }>();
  const astrologyInquiry = interest === 'astrology';
  const [draft, setDraft] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const contactEmail = process.env.EXPO_PUBLIC_CONTACT_EMAIL;
  function prepare(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const isAstrologyInquiry =
      new URLSearchParams(window.location.search).get('interest') === 'astrology';
    const request = `${isAstrologyInquiry ? 'Mantrilo astrology inquiry' : 'Mantrilo inquiry'}\n\n${t('info.contact.draftName')}: ${data.get('name')}\n${t('info.contact.draftEmail')}: ${data.get('email')}\n${t('info.contact.draftProduct')}: ${data.get('product')}\n\n${t('info.contact.draftMessage')}:\n${data.get('message')}\n`;
    setDraft(request);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(URL.createObjectURL(new Blob([request], { type: 'text/plain' })));
  }
  return (
    <SiteFrame path={`/${page}`}>
      <PageHero
        crumb={known ? t(`meta./${page}.label`) : undefined}
        eyebrow={t(
          page === 'contact'
            ? 'info.eyebrow.contact'
            : page === 'about'
              ? 'info.eyebrow.about'
              : 'info.eyebrow.legal',
        )}
        title={
          astrologyInquiry
            ? t('info.contact.astrologyTitle')
            : known
              ? t(`info.${page}.title`)
              : t('info.notFound')
        }
        lede={page === 'contact' || !known ? undefined : t(`info.${page}.lede`)}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          {page === 'about' ? (
            <>
              <h2>{t('info.about.servesTitle')}</h2>
              <p>{t('info.about.serves')}</p>
              <h2>{t('info.about.catalogTitle')}</h2>
              <p>{t('info.about.catalog')}</p>
              <p>
                <Rich
                  text={t('info.about.sandbox')}
                  tags={{
                    library: <Link href="/library" />,
                    docs: <Link href="/docs" />,
                    contact: <Link href="/contact" />,
                  }}
                />
              </p>
            </>
          ) : page === 'contact' ? (
            <>
              <p>{astrologyInquiry ? t('info.contact.astrologyIntro') : t('info.contact.intro')}</p>
              <p>
                <Rich text={t('info.contact.apiKey')} tags={{ link: <a href={signUpUrl} /> }} />
              </p>
              <div className="mh-callout mh-callout-warn">
                {contactEmail ? t('info.contact.emailReady') : t('info.contact.notConnected')}
              </div>
              <form className="mh-form" onSubmit={prepare}>
                <label>
                  {t('info.contact.name')}
                  <input
                    className="mh-input"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  {t('info.contact.email')}
                  <input
                    className="mh-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  {t('info.contact.product')}
                  <input
                    className="mh-input"
                    name="product"
                    placeholder={t('info.contact.productPlaceholder')}
                    required
                    maxLength={250}
                  />
                </label>
                <label>
                  {t('info.contact.message')}
                  <textarea
                    className="mh-input"
                    name="message"
                    placeholder={t('info.contact.messagePlaceholder')}
                    required
                    maxLength={4000}
                  />
                </label>
                <button className="mh-btn mh-btn-primary" type="submit">
                  {astrologyInquiry
                    ? t('info.contact.prepareAstrology')
                    : t('info.contact.prepare')}{' '}
                  <Arrow />
                </button>
                <p className="mh-muted">{t('info.contact.local')}</p>
              </form>
              {draft && (
                <section className="mh-card mh-card-pad mh-draft" aria-live="polite">
                  <h2>{t('info.contact.yourMessage')}</h2>
                  <pre className="mh-draft-text" dir="auto">
                    {draft}
                  </pre>
                  {contactEmail && (
                    <a
                      className="mh-btn mh-btn-primary"
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(astrologyInquiry ? 'Mantrilo astrology inquiry' : 'Mantrilo inquiry')}&body=${encodeURIComponent(draft)}`}
                    >
                      {t('info.contact.openDraft')} ↗
                    </a>
                  )}
                  <p>
                    <a href={downloadUrl} download="mantrilo-message.txt">
                      {t('info.contact.download')} ↓
                    </a>
                  </p>
                  <p className="mh-muted">
                    {contactEmail ? t('info.contact.sendFromApp') : t('info.contact.notSubmitted')}
                  </p>
                </section>
              )}
            </>
          ) : page === 'license' ? (
            <>
              <h2>{t('info.license.publicTitle')}</h2>
              <p>{t('info.license.public')}</p>
              <h2>{t('info.license.modernTitle')}</h2>
              <p>{t('info.license.modern')}</p>
              <h2>{t('info.license.questionsTitle')}</h2>
              <p>
                <Rich
                  text={t('info.license.questions')}
                  tags={{ link: <Link href="/contact" /> }}
                />
              </p>
            </>
          ) : page === 'privacy' ? (
            <>
              <div className="mh-callout mh-callout-warn">{t('info.privacy.warning')}</div>
              <h2>{t('info.privacy.previewTitle')}</h2>
              <p>{t('info.privacy.preview')}</p>
              <p>{t('info.privacy.referral')}</p>
              <p>
                <Link href="/contact">{t('info.privacy.contact')} →</Link>
              </p>
            </>
          ) : page === 'terms' ? (
            <>
              <div className="mh-callout mh-callout-warn">{t('info.terms.warning')}</div>
              <p>{t('info.terms.site')}</p>
              <p>{t('info.terms.keys')}</p>
              <h2>{t('info.terms.commercialTitle')}</h2>
              <p>{t('info.terms.commercial')}</p>
              <p>
                <Link href="/license">{t('info.terms.license')} →</Link>
              </p>
            </>
          ) : (
            <p>
              <Link href="/">{t('info.returnHome')} →</Link>
            </p>
          )}
        </div>
      </section>
    </SiteFrame>
  );
}
