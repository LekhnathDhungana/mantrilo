import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import Seo from './Seo.web';
import { seoPages } from '../data/site';
import Brand from './Brand.web';
import { plans } from '../data/plans';
import { exampleRequest, samples } from '../data/samples';
import './marketing.css';

const titles: Record<string, string> = {
  docs: 'Your integration starts here.',
  access: 'Let’s build with purpose.',
  privacy: 'Privacy & data.',
  terms: 'Website terms status.',
  license: 'Content license status.',
};
export default function InfoPage({ page }: { page: string }) {
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
        : 'Sandbox';
  const [draft, setDraft] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const contactEmail = process.env.EXPO_PUBLIC_CONTACT_EMAIL;
  function prepare(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const intendedPlan =
      planChoice?.value || new URLSearchParams(window.location.search).get('plan') || 'Sandbox';
    const draftPlan = plans.some((p) => p.name === intendedPlan) ? intendedPlan : 'Sandbox';
    const isAstrologyInquiry =
      new URLSearchParams(window.location.search).get('interest') === 'astrology';
    const request = `${isAstrologyInquiry ? 'Mantrilo astrology inquiry' : 'Mantrilo access request'}\n\nName: ${data.get('name')}\nWork email: ${data.get('email')}\nExisting content plan interest: ${draftPlan}
Astrology availability and plan inclusion: undecided\nProduct: ${data.get('product')}\n\nIntended integration:\n${data.get('message')}\n`;
    setDraft(request);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(URL.createObjectURL(new Blob([request], { type: 'text/plain' })));
  }
  return (
    <div className="info-shell">
      <Seo path={`/${page}`} />
      <header className="wrap info-header">
        <Link href="/" aria-label="Mantrilo home">
          <Brand />
        </Link>
        <Link href="/" className="text-link">
          ← Back to the website
        </Link>
      </header>
      <main id="main" className="wrap info-main">
        <nav className="breadcrumbs info-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{seoPages[`/${page}`]?.label}</span>
        </nav>
        <div className="eyebrow">MANTRILO / {page.toUpperCase()}</div>
        <h1>
          {astrologyInquiry ? 'Plan an astrology inquiry.' : titles[page] || 'Page not found.'}
        </h1>
        {page === 'access' ? (
          <>
            <p>
              {astrologyInquiry
                ? 'Describe your astrology integration to prepare an inquiry draft. The live service connection and billing are not configured in this local preview.'
                : 'Tell us what you’re creating and which existing content plan fits. Prepare an access request to share with the Mantrilo team.'}
            </p>
            <div className="notice">
              {contactEmail
                ? 'Prepare your request below, then open it in your email app to send it. Nothing is sent automatically.'
                : 'Access requests are not connected to a submission service yet. You can prepare and download a request below. Nothing is sent or stored on a server.'}
            </div>
            <form className="access-form" onSubmit={prepare}>
              <label>
                Your name
                <input name="name" autoComplete="name" required maxLength={100} />
              </label>
              <label>
                Work email
                <input name="email" type="email" autoComplete="email" required maxLength={200} />
              </label>
              <label>
                Existing content plan interest (astrology undecided)
                <select
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
                <input name="product" placeholder="Product name or URL" required maxLength={250} />
              </label>
              <label>
                What would you like to build?
                <textarea
                  name="message"
                  placeholder="Tell us about your content needs and intended integration."
                  required
                  maxLength={4000}
                />
              </label>
              <button className="button" type="submit">
                {astrologyInquiry ? 'Prepare astrology inquiry' : 'Prepare access request'}{' '}
                <span>↗</span>
              </button>
              <p className="muted-small">
                This form runs in your browser. Downloading a draft does not create an account,
                reserve a plan, or send an access request.
              </p>
            </form>
            {draft && (
              <section className="form-output" aria-live="polite">
                <h2>Your request draft</h2>
                <p>{draft}</p>
                {contactEmail && (
                  <a
                    className="button"
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
                <p className="muted-small">
                  {contactEmail
                    ? 'Send the email from your email app to complete your request.'
                    : 'Your draft has not been submitted. A verified contact address must be configured before you can send it from this website.'}
                </p>
              </section>
            )}
          </>
        ) : page === 'docs' ? (
          <>
            <div className="notice">
              Integration planning guide · The repository has no production API documentation or
              endpoints. Every request and response below is illustrative.
            </div>
            <h2>1. Request access</h2>
            <p>
              Choose a plan, describe your customer products, and confirm catalog coverage and
              content licensing with the Mantrilo team.{' '}
              <Link href="/access">Prepare an access request →</Link>
            </p>
            <h2>2. Keep credentials on your server</h2>
            <p>
              Store a production API key in your server environment or GCP Secret Manager. Do not
              put private keys in Expo public environment variables, browser bundles, or mobile
              client code.
            </p>
            <pre>
              <code>
                {
                  'MANTRILO_API_BASE_URL=<confirmed server endpoint>\nMANTRILO_API_KEY=<private server credential>'
                }
              </code>
            </pre>
            <h2>3. Explore a content structure</h2>
            <p>
              This example demonstrates a possible catalog request. The path, query, and response
              schema must be replaced with verified production documentation before integration.
            </p>
            <pre>
              <code>{exampleRequest}</code>
            </pre>
            <p>Illustrative book structure:</p>
            <pre>
              <code>{JSON.stringify(samples.book, null, 2)}</code>
            </pre>
            <p>
              Text records can carry original text, transliteration, translation, meaning, and
              source references where available. Recordings link to relevant content. Books may be
              organized by chapters and verses.
            </p>
            <h2>4. Monitor your allowance</h2>
            <p>
              Plan for monthly API requests, audio data delivery, and the number of customer
              products. API key management and usage reporting are product capabilities described in
              the brief; neither has a live dashboard in this website.
            </p>
            <h2>5. Configure astrology separately from content access</h2>
            <p>
              No astrology endpoints, calculation engine, or interpretive feed are implemented.
              Connect the astrology service and confirm its endpoint contract, credit costs, and
              add-on access before integration.{' '}
              <Link href="/astrology-api">Review astrology integration →</Link>
            </p>
            <p>
              <Link href="/pricing">Compare monthly allowances →</Link>
            </p>
          </>
        ) : page === 'license' ? (
          <>
            <div className="notice">
              Content license documentation has not been supplied. This page does not grant content
              rights.
            </div>
            <p>
              Paid plans include the available mantras, shlokas, sacred audio, shastra books, and
              discovery features for commercial integration, subject to the documented content
              license.
            </p>
            <h2>Before using catalog content</h2>
            <p>
              Obtain the applicable content license and confirm that it covers your intended
              products, distribution, and use. No specific titles, recordings, or content rights
              have been verified in this repository.
            </p>
            <p>
              The repository’s software license is separate from any license for texts or
              recordings. Illustrative website fixtures are not a production catalog.
            </p>
            <p>
              <Link href="/access">Contact & access details →</Link>
            </p>
          </>
        ) : page === 'privacy' ? (
          <>
            <div className="notice">
              A final operator privacy policy has not been supplied. Review and provide it before
              launch.
            </div>
            <h2>What this preview does</h2>
            <p>
              The access-request form prepares a draft locally in your browser. It does not submit
              form entries to a server or save them in browser storage. If you download a draft, the
              file contains the details you entered. If configured, the email link passes the draft
              to your chosen email app.
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
            <div className="notice">
              Final website terms have not been supplied. This status page is not a service
              agreement.
            </div>
            <p>
              This website presents Mantrilo’s proposed content API offering and the monthly plans
              specified for launch. Interactive catalog entries and API examples are illustrative.
            </p>
            <p>
              No account provisioning, purchase, payment processing, or production API access is
              connected. Preparing an access-request draft does not complete a subscription.
            </p>
            <h2>Commercial content use</h2>
            <p>
              Commercial integration is subject to the documented content license. The final service
              terms and content license must be provided and reviewed before onboarding customers.
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
      </main>
    </div>
  );
}
