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
          Calculate planetary positions, rashis, nakshatras, and instant Panchang elements with Mantrilo’s server-side engine. Included in every plan: each calculation counts as one normal content request.
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
          The calculation engine works in the Developer Console and authenticated API. Sandbox calculations are nonbillable. Paid astrology purchases still require billing configuration.
        </div>
      </section>
      <section className="wrap product-detail">
        <div className="product-copy">
          <section>
            <h2>Planetary positions you can inspect</h2>
            <p>
              Calculate geocentric positions for the Sun, Moon, Mercury, Venus, Mars, Jupiter, and Saturn at a specified instant. Responses include tropical and sidereal longitudes, latitude, distance, rashi, nakshatra/pada, and apparent direct or retrograde motion.
            </p>
          </section>
          <section>
            <h2>Instant Panchang elements</h2>
            <p>
              Calculate tithi and paksha, Moon nakshatra and pada, yoga number, karana, and Sun/Moon rashis at the requested instant. This version does not calculate sunrise-based day assignment, location-based almanacs, or transition times.
            </p>
          </section>
          <section>
            <h2>Make the calculation method explicit</h2>
            <p>
              The starter sidereal model uses a clearly labeled linear Lahiri approximation. A custom ayanamsa can be supplied for the instant being calculated. Exact tradition matching needs a verified offset or a later model extension.
            </p>
          </section>
          <section>
            <h2>Use the authenticated calculation API</h2>
            <p>
              Send your API key to POST /v1/astrology/calculate. Choose positions or panchang, provide an ISO date-time with an explicit UTC offset, and optionally supply ayanamsaDegrees. A successful calculation uses one content request from your plan. Inputs and results are not stored in general logs. Houses, ascendant, nodes, dashas, and predictive interpretations are outside this initial version.
            </p>
            <Link className="text-link" href="/pricing">
              Review content plans →
            </Link>
          </section>
        </div>
        <aside className="product-example astrology-status">
          <div className="eyebrow">INTEGRATION SETUP</div>
          <h2>Run the calculation engine.</h2>
          <dl>
            <dt>Engine</dt>
            <dd>Server-side · Available</dd>
            <dt>Supported operations</dt>
            <dd>Planetary positions · Instant Panchang</dd>
            <dt>Cost</dt>
            <dd>1 content request per successful calculation</dd>
            <dt>Plans</dt>
            <dd>Included in every plan</dd>
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
