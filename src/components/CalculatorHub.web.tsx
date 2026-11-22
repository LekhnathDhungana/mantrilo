import { Link } from 'expo-router';
import { calculatorHub, calculatorPages } from '../data/calculator-pages';
import { Arrow, CtaBand, PageHero, SiteFrame } from './site/Chrome.web';

export default function CalculatorHub() {
  return (
    <SiteFrame path={calculatorHub.path}>
      <PageHero
        eyebrow="Free calculators"
        crumb={calculatorHub.label}
        title="Find your signs, Western and Vedic."
        lede="Enter your birth date, time and place once and see your Sun, Moon and Rising signs alongside your Rashi, Lagna and Nakshatra. Free, with no sign-up."
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-calc-cards">
          {calculatorPages.map((page) => (
            <Link key={page.slug} href={page.path} className="mh-card mh-card-pad">
              <h3>{page.label}</h3>
              <p>{page.lede}</p>
              <span className="mh-card-link">
                Open calculator <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand
        title="Building an astrology app?"
        copy="Every calculator here runs on Mantrilo’s astrology API. Get the same results as JSON from your own server."
      />
    </SiteFrame>
  );
}
