import { Link, useLoaderData } from 'expo-router';
import type { loader } from '../app/calculators/[calculator]';
import { calculatorPages } from '../data/calculator-pages';
import NotFound from './NotFound';
import SignCalculator from './SignCalculator.web';
import { Arrow, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';

export default function CalculatorPage() {
  const page = useLoaderData<typeof loader>();
  if (!page) return <NotFound />;
  const others = calculatorPages.filter((entry) => entry.slug !== page.slug);
  return (
    <SiteFrame path={page.path}>
      <PageHero
        eyebrow="Free calculator"
        crumb={page.label}
        title={page.heading}
        lede={page.lede}
      />
      <section className="mh-section-sm mh-calc-section">
        <div className="mh-wrap">
          <SignCalculator focus={page.focus} needsTime={page.needsTime} />
        </div>
      </section>
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <h2>{page.about.heading}</h2>
            {page.about.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <h2>Questions</h2>
            <div className="mh-faq-list">
              {page.faqs.map(([question, answer]) => (
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
            <p className="mh-footer-label">More calculators</p>
            {others.map((entry) => (
              <Link key={entry.slug} href={entry.path}>
                {entry.label} <Arrow />
              </Link>
            ))}
            <Link href="/astrology-api">
              Astrology API for developers <Arrow />
            </Link>
          </aside>
        </div>
      </section>
      <CtaBand
        title="Put this calculator in your app."
        copy="The same Western and Vedic signs, plus Kundli charts, Panchang and matching, through one astrology API."
      />
    </SiteFrame>
  );
}
