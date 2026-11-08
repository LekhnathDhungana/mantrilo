import { Link } from 'expo-router';
import PageShell from './PageShell.web';
export default function AstrologyPage() {
  return (
    <PageShell path="/astrology-api">
      <section className="wrap product-hero">
        <div className="eyebrow">ASTROLOGY API / FOR APPS & WEBSITES</div>
        <h1>
          Astrology for
          <br />
          <em>what you build.</em>
        </h1>
        <p className="product-intro">
          Bring astrology into your app or website through a server-side integration. Keep its
          service configuration and credit accounting separate from your content catalog.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/access?interest=astrology">
            Request astrology access ↗
          </Link>
          <Link className="text-link" href="/docs">
            Read the integration guide →
          </Link>
        </div>
        <div className="notice">
          This local preview is not connected to an astrology service. Live requests require a
          configured provider and documented endpoint contract.
        </div>
      </section>
      <section className="wrap product-detail">
        <div className="product-copy">
          <section>
            <h2>Start with your product’s requirements</h2>
            <p>
              Describe the user experience you want to support, the inputs your application can
              provide, and the outputs it needs. Match those requirements to the connected service’s
              documented capabilities before implementation.
            </p>
          </section>
          <section>
            <h2>Keep data and interpretation distinct</h2>
            <p>
              Calculated astronomical data and interpretive astrology content require different
              documentation and validation. Confirm the output type and methodology with the service
              you connect; this preview supplies neither.
            </p>
          </section>
          <section>
            <h2>Integrate through your server</h2>
            <p>
              Keep provider credentials server-side. Validate required inputs, show the documented
              credit cost before execution, and record usage without exposing exact birth details in
              general request logs.
            </p>
          </section>
          <section>
            <h2>Manage astrology as a separate allowance</h2>
            <p>
              Content requests, audio delivery, and astrology credits have distinct usage meters.
              Astrology add-ons require their own billing configuration and endpoint credit costs;
              content plan access does not activate them automatically.
            </p>
            <Link className="text-link" href="/pricing">
              Review content plans →
            </Link>
          </section>
        </div>
        <aside className="product-example astrology-status">
          <div className="eyebrow">INTEGRATION SETUP</div>
          <h2>Connect your astrology service.</h2>
          <dl>
            <dt>Provider connection</dt>
            <dd>Not configured in this preview</dd>
            <dt>Inputs, outputs & methodology</dt>
            <dd>Confirm against service documentation</dd>
            <dt>Credit costs</dt>
            <dd>Configuration required</dd>
            <dt>Billing</dt>
            <dd>Separate add-on setup</dd>
          </dl>
          <h3>Request access with context</h3>
          <ul>
            <li>Your app or website and intended audience.</li>
            <li>The user task you want to support.</li>
            <li>The output and documentation your team needs.</li>
          </ul>
          <p>
            The request tool prepares a local draft. It does not send or register your request
            without a configured contact destination.
          </p>
          <Link className="text-link" href="/access?interest=astrology">
            Prepare your request →
          </Link>
        </aside>
      </section>
      <section className="wrap related-section">
        <h2>Connect the rest of your experience.</h2>
        <div className="related-links">
          <Link href="/mantra-shloka-api">MANTRAS & SHLOKAS ↗</Link>
          <Link href="/sacred-audio-api">SACRED AUDIO ↗</Link>
          <Link href="/shastra-books-api">SHASTRAS & BOOKS ↗</Link>
        </div>
      </section>
    </PageShell>
  );
}
