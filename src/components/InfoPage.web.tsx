import { useEffect, useRef, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { plans } from '../data/plans';
import { seoPages } from '../data/site';
import DocsPage from './DocsPage.web';
import ImplementationPage from './ImplementationPage.web';
import { Arrow, PageHero, SiteFrame } from './site/Chrome.web';

const titles: Record<string, string> = {
  docs: 'Mantrilo API documentation.',
  access: 'Let’s build with purpose.',
  privacy: 'Privacy & data.',
  terms: 'Website terms status.',
  license: 'Content license status.',
};
const ledes: Record<string, string> = {
  privacy: 'What this website does with the details you enter.',
  terms: 'The status of Mantrilo’s website terms.',
  license: 'How catalog content may be used, and what is still being confirmed.',
};

export default function InfoPage({ page }: { page: string }) {
  if (page === 'docs') return <DocsPage />;
  if (page === 'implementation') return <ImplementationPage />;
  return <StaticPage page={page} />;
}

function StaticPage({ page }: { page: string }) {
  const { plan: requestedPlan, interest } = useLocalSearchParams<{
    plan?: string;
    interest?: string;
  }>();
  const astrologyInquiry = interest === 'astrology';
  const [planChoice, setPlanChoice] = useState<{
    request: string | undefined;
    value: string;
  } | null>(null);
  const selectedPlan =
    planChoice && planChoice.request === requestedPlan
      ? planChoice.value
      : plans.some((p) => p.name === requestedPlan)
        ? requestedPlan
        : 'Free';
  const planSelect = useRef<HTMLSelectElement>(null);
  // Hydration keeps the static HTML's selection, so the plan in the URL is applied here.
  useEffect(() => {
    if (planSelect.current) planSelect.current.value = selectedPlan ?? 'Free';
  }, [selectedPlan]);
  const [draft, setDraft] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const contactEmail = process.env.EXPO_PUBLIC_CONTACT_EMAIL;
  function prepare(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const isAstrologyInquiry =
      new URLSearchParams(window.location.search).get('interest') === 'astrology';
    const request = `${isAstrologyInquiry ? 'Mantrilo astrology inquiry' : 'Mantrilo access request'}\n\nName: ${data.get('name')}\nWork email: ${data.get('email')}\nPlan interest: ${data.get('plan')}\nProduct: ${data.get('product')}\n\nIntended integration:\n${data.get('message')}\n`;
    setDraft(request);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(URL.createObjectURL(new Blob([request], { type: 'text/plain' })));
  }
  return (
    <SiteFrame path={`/${page}`}>
      <PageHero
        crumb={seoPages[`/${page}`]?.label}
        eyebrow={page === 'access' ? 'Access' : 'Legal'}
        title={astrologyInquiry ? 'Plan an astrology inquiry.' : titles[page] || 'Page not found.'}
        lede={page === 'access' ? undefined : ledes[page]}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-prose">
          {page === 'access' ? (
            <>
              <p>
                {astrologyInquiry
                  ? 'Tell us what you want to calculate and how your product will use it. Astrology is included in every plan.'
                  : 'Tell us what you’re creating and which plan fits. We’ll follow up with your API key and next steps.'}
              </p>
              <div className="mh-callout mh-callout-warn">
                {contactEmail
                  ? 'Fill in your details, then send the prepared email from your email app.'
                  : 'Access requests are not connected to a submission service yet. You can prepare and download a request below. Nothing is sent or stored on a server.'}
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
                  Plan interest
                  <select
                    className="mh-input"
                    ref={planSelect}
                    name="plan"
                    value={selectedPlan}
                    onChange={(event) =>
                      setPlanChoice({ request: requestedPlan, value: event.target.value })
                    }
                  >
                    {plans.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — {p.price ? `$${p.price}/month` : 'Free'}
                      </option>
                    ))}
                  </select>
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
                  What would you like to build?
                  <textarea
                    className="mh-input"
                    name="message"
                    placeholder="Tell us about your content needs and intended integration."
                    required
                    maxLength={4000}
                  />
                </label>
                <button className="mh-btn mh-btn-primary" type="submit">
                  {astrologyInquiry ? 'Prepare astrology inquiry' : 'Prepare access request'}{' '}
                  <Arrow />
                </button>
                <p className="mh-muted">
                  Your details stay in your browser until you send the email. Preparing a request
                  does not create an account or reserve a plan.
                </p>
              </form>
              {draft && (
                <section className="mh-card mh-card-pad mh-draft" aria-live="polite">
                  <h2>Your request draft</h2>
                  <pre className="mh-draft-text">{draft}</pre>
                  {contactEmail && (
                    <a
                      className="mh-btn mh-btn-primary"
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent('Mantrilo access request')}&body=${encodeURIComponent(draft)}`}
                    >
                      Open email draft ↗
                    </a>
                  )}
                  <p>
                    <a href={downloadUrl} download="mantrilo-access-request.txt">
                      Download request as a text file ↓
                    </a>
                  </p>
                  <p className="mh-muted">
                    {contactEmail
                      ? 'Send the email from your email app to complete your request.'
                      : 'Your draft has not been submitted. A verified contact address must be configured before you can send it from this website.'}
                  </p>
                </section>
              )}
            </>
          ) : page === 'license' ? (
            <>
              <div className="mh-callout mh-callout-warn">
                Content license documentation has not been supplied. This page does not grant
                content rights.
              </div>
              <p>
                Paid plans include the available mantras and sacred audio for commercial
                integration, subject to the documented content license.
              </p>
              <h2>Before using catalog content</h2>
              <p>
                Obtain the applicable content license and confirm that it covers your intended
                products, distribution, and use. No specific titles, recordings, or content rights
                have been verified in this repository.
              </p>
              <p>
                The repository’s software license is separate from any license for texts or
                recordings. Examples on this website do not grant rights to the content they show.
              </p>
              <p>
                <Link href="/access">Contact & access details →</Link>
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
                The access-request form prepares a draft locally in your browser. It does not submit
                form entries to a server or save them in browser storage. If you download a draft,
                the file contains the details you entered. If configured, the email link passes the
                draft to your chosen email app.
              </p>
              <p>
                This implementation does not include analytics, marketing trackers, account
                registration, or payment collection. Your hosting provider may process requests and
                logs according to its configuration; no deployment configuration has been verified
                yet.
              </p>
              <p>
                <Link href="/access">Contact configuration status →</Link>
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
                Access is currently by request. Preparing an access request does not create an
                account or complete a subscription.
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
