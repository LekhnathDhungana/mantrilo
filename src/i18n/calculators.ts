import type { TFunction } from 'i18next';
import type { CalculatorPage } from '../data/calculator-pages';

// A calculator page's text in the current language. src/data/calculator-pages.ts is the English
// source; its strings are mirrored under calculators.pages.<slug> (shared FAQs under
// calculators.faq) and meta./calculators/<slug>.
export function calculatorText(t: TFunction, page: CalculatorPage) {
  const key = `calculators.pages.${page.slug}`;
  const shared = (question: string) =>
    question.startsWith('Do you store')
      ? 'privacy'
      : question.startsWith('How accurate')
        ? 'accuracy'
        : null;
  return {
    label: t(`meta.${page.path}.label`) || page.label,
    heading: t(`${key}.heading`) || page.heading,
    lede: t(`${key}.lede`) || page.lede,
    about: {
      heading: t(`${key}.about.heading`) || page.about.heading,
      paragraphs: page.about.paragraphs.map((text, i) => t(`${key}.about.p${i}`) || text),
    },
    faqs: page.faqs.map(([question, answer], i): [string, string] => {
      const common = shared(question);
      return common
        ? [t(`calculators.faq.${common}.q`) || question, t(`calculators.faq.${common}.a`) || answer]
        : [t(`${key}.faqs.q${i}`) || question, t(`${key}.faqs.a${i}`) || answer];
    }),
  };
}
