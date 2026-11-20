import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { seoPages, signUpUrl } from '../data/site';
import DocsPage from './DocsPage.web';
import { Arrow, PageHero, SiteFrame } from './site/Chrome.web';

const titles: Record<string, string> = {
  docs: 'Mantrilo API documentation.',
  about: 'About Mantrilo.',
  contact: 'Talk to us.',
  privacy: 'Privacy & data.',
  terms: 'Website terms status.',
  license: 'Content license status.',
};
const ledes: Record<string, string> = {
  about: 'One developer API for Sanskrit content and astrology calculations.',
  privacy: 'What this website does with the details you enter.',
  terms: 'The status of Mantrilo’s website terms.',
  license: 'Reuse guidance for Sanskrit texts, modern editions, and English retellings.',
};

export default function InfoPage({ page }: { page: string }) {
  if (page === 'docs') return <DocsPage />;
  return <StaticPage page={page} />;
}

function StaticPage({ page }: { page: string }) {
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
    const request = `${isAstrologyInquiry ? 'Mantrilo astrology inquiry' : 'Mantrilo inquiry'}\n\nName: ${data.get('name')}\nWork email: ${data.get('email')}\nProduct: ${data.get('product')}\n\nMessage:\n${data.get('message')}\n`;
    setDraft(request);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(URL.createObjectURL(new Blob([request], { type: 'text/plain' })));
  }
  return (
    <SiteFrame path={`/${page}`}>
      <PageHero
        crumb={seoPages[`/${page}`]?.label}
        eyebrow={page === 'contact' ? 'Contact' : page === 'about' ? 'About' : 'Legal'}
        title={astrologyInquiry ? 'Plan an astrology inquiry.' : titles[page] || 'Page not found.'}
        lede={page === 'contact' ? undefined : ledes[page]}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          {page === 'about' ? (
            <>
              <h2>Who it serves</h2>
              <p>
                Mantrilo helps developers build Hindu devotional, learning and calendar apps. The
                API organizes mantra verses, scripture collections and available recordings, and
                calculates astrology data from inputs your app supplies.
              </p>
              <h2>How to read the catalog</h2>
              <p>
                Original text, transliteration, translation and audio are separate fields. Coverage
                varies by record. Preserve source references where supplied, and verify the edition,
                translator or performer with Mantrilo before using a title commercially.
              </p>
              <p>
                The sandbox uses a limited sample. Check the <Link href="/library">Library</Link>{' '}
                and <Link href="/docs">API docs</Link> to see data formats, then{' '}
                <Link href="/contact">contact Mantrilo</Link> for title-specific rights and
                coverage.
              </p>
            </>
          ) : page === 'contact' ? (
            <>
              <p>
                {astrologyInquiry
                  ? 'Tell us what you want to calculate and how your product will use it. Astrology is included in every plan.'
                  : 'Questions about the catalog, licensing, recordings or a larger plan? Tell us what you’re building.'}
              </p>
              <p>
                Looking for an API key? <a href={signUpUrl}>Create a free account</a> in the
                developer console and you’ll have a sandbox key straight away.
              </p>
              <div className="mh-callout mh-callout-warn">
                {contactEmail
                  ? 'Fill in your details, then send the prepared email from your email app.'
                  : 'This form is not connected to a submission service yet. You can prepare and download your message below. Nothing is sent or stored on a server.'}
              </div>
              <form className="mh-form" onSubmit={prepare}>
                <label>
                  Your name
                  <input
                    className="mh-input"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Work email
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
                  App or website
                  <input
                    className="mh-input"
                    name="product"
                    placeholder="Product name or URL"
                    required
                    maxLength={250}
                  />
                </label>
                <label>
                  How can we help?
                  <textarea
                    className="mh-input"
                    name="message"
                    placeholder="Tell us about your product and what you need from the API."
                    required
                    maxLength={4000}
                  />
                </label>
                <button className="mh-btn mh-btn-primary" type="submit">
                  {astrologyInquiry ? 'Prepare astrology inquiry' : 'Prepare message'} <Arrow />
                </button>
                <p className="mh-muted">
                  Your details stay in your browser until you send the email.
                </p>
              </form>
              {draft && (
                <section className="mh-card mh-card-pad mh-draft" aria-live="polite">
                  <h2>Your message</h2>
                  <pre className="mh-draft-text">{draft}</pre>
                  {contactEmail && (
                    <a
                      className="mh-btn mh-btn-primary"
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(astrologyInquiry ? 'Mantrilo astrology inquiry' : 'Mantrilo inquiry')}&body=${encodeURIComponent(draft)}`}
                    >
                      Open email draft ↗
                    </a>
                  )}
                  <p>
                    <a href={downloadUrl} download="mantrilo-message.txt">
                      Download as a text file ↓
                    </a>
                  </p>
                  <p className="mh-muted">
                    {contactEmail
                      ? 'Send the email from your email app to reach us.'
                      : 'Your draft has not been submitted. A verified contact address must be configured before you can send it from this website.'}
                  </p>
                </section>
              )}
            </>
          ) : page === 'license' ? (
            <>
              <h2>Public-domain Sanskrit</h2>
              <p>
                You can reuse original Sanskrit text in a commercial app where the text is in the
                public domain. Check the specific edition and the countries where you plan to
                distribute it. Keep the source reference with the text where available.
              </p>
              <h2>Modern editions and retellings</h2>
              <p>
                Modern translations, commentary, editorial additions, and prose retellings can
                have separate rights. This includes the English retellings of the Ramayana and
                Mahabharata in the Books API. Check the terms for the version you plan to use and
                follow its attribution requirements.
              </p>
              <h2>Licensing questions</h2>
              <p>
                For reuse questions or rights concerns, <Link href="/contact">contact Mantrilo</Link>{' '}
                with the title or source reference and a brief description of how you plan to use
                the material.
              </p>
            </>
          ) : page === 'privacy' ? (
            <>
              <div className="mh-callout mh-callout-warn">
                A final operator privacy policy has not been supplied. Review and provide it before
                launch.
              </div>
              <h2>What this preview does</h2>
              <p>
                The contact form prepares a draft locally in your browser. It does not submit form
                entries to a server or save them in browser storage. If you download a draft, the
                file contains the details you entered. If configured, the email link passes the
                draft to your chosen email app.
              </p>
              <p>
                The public site keeps a broad referral category for the current tab. When you choose
                to try the API or open signup, the link includes that category and the public page
                path so Mantrilo can count Console visits and signup starts. It does not include the
                referring URL, account details, or request inputs. The developer console handles
                account registration and billing separately.
              </p>
              <p>
                <Link href="/contact">Contact us →</Link>
              </p>
            </>
          ) : page === 'terms' ? (
            <>
              <div className="mh-callout mh-callout-warn">
                Final website terms have not been supplied. This status page is not a service
                agreement.
              </div>
              <p>
                This website presents Mantrilo’s content API and monthly plans. Catalog examples use
                placeholder values unless marked otherwise.
              </p>
              <p>
                API keys are issued in the developer console. Preparing a message on the contact
                page does not create an account or start a subscription.
              </p>
              <h2>Commercial content use</h2>
              <p>
                Commercial integration is subject to the documented content license. The final
                service terms and content license must be provided and reviewed before onboarding
                customers.
              </p>
              <p>
                <Link href="/license">View content license status →</Link>
              </p>
            </>
          ) : (
            <p>
              <Link href="/">Return home →</Link>
            </p>
          )}
        </div>
      </section>
    </SiteFrame>
  );
}
