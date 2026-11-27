import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/calculators/[calculator]';
import { calculatorPages } from '../data/calculator-pages';
import NotFound from './NotFound';
import SignCalculator from './SignCalculator.web';
import { Arrow, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';
import { useI18n } from '../i18n';
import { calculatorText } from '../i18n/calculators';

export default function CalculatorPage() {
  const page = useLoaderData<typeof loader>();
  const { t } = useI18n();
  if (!page) return <NotFound />;
  const text = calculatorText(t, page);
  const others = calculatorPages.filter((entry) => entry.slug !== page.slug);
  return (
    <SiteFrame path={page.path}>
      <PageHero
        eyebrow={t('calculators.page.eyebrow')}
        crumb={text.label}
        title={text.heading}
        lede={text.lede}
      />
      <section className="mh-section-sm mh-calc-section">
        <div className="mh-wrap">
          <SignCalculator focus={page.focus} needsTime={page.needsTime} />
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <h2>{text.about.heading}</h2>
            {text.about.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <h2>{t('calculators.page.questions')}</h2>
            <div className="mh-faq-list">
              {text.faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <aside className="mh-calc-more">
            <p className="mh-footer-label">{t('calculators.page.more')}</p>
            {others.map((entry) => (
              <Link key={entry.slug} href={entry.path}>
                {t(`meta.${entry.path}.label`) || entry.label} <Arrow />
              </Link>
            ))}
            <Link href="/astrology-api">
              {t('astroPage.title')} <Arrow />
            </Link>
          </aside>
        </div>
      </section>
      <CtaBand title={t('calculators.page.ctaTitle')} copy={t('calculators.page.ctaCopy')} />
    </SiteFrame>
  );
}
