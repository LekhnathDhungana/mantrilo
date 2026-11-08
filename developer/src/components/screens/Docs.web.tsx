import { Link } from 'expo-router';
import { PageTitle } from '../ui.web';

export default function Docs() {
  return (
    <>
      <PageTitle
        eyebrow="INTEGRATION GUIDE"
        title="Start with a clear contract."
        copy="What works in this console, and what needs a production connection."
      />
      <div className="overview-grid">
        <section className="panel prose">
          <h2>1. Keep your API key on your server</h2>
          <p>
            Create a named sandbox key, save the one-time secret, and keep it in your server
            environment or Secret Manager. Only the secure hash is retained by this console.
          </p>
          <h2>2. Try the local fixture endpoint</h2>
          <p>
            In local demo mode, the playground calls the implemented GET /api/demo/catalog endpoint
            using a sandbox key. It returns clearly labeled text, audio-metadata, or book fixtures.
            Successful requests consume one nonbillable demo content request.
          </p>
          <Link href="/playground" className="text-link">
            Open playground →
          </Link>
          <h2>3. Confirm the production API</h2>
          <p>
            Production catalog endpoints, licensing, audio delivery, and real API metering are not
            connected. Confirm the actual schema, source rights, authentication contract, and
            accounting policy before integrating a customer product.
          </p>
        </section>
        <section className="panel prose">
          <h2>Distinct usage meters</h2>
          <p>
            Content requests, audio data delivery, and astrology credits are recorded separately.
            Usage reservations and API key status checks are atomic on the backend. Failed demo
            requests consume no allowance.
          </p>
          <h2>Astrology integration</h2>
          <p>
            The server implements POST /api/v1/astrology/calculate with sandbox API-key
            authentication, and the console uses POST /api/astrology/calculate with its protected
            session. Choose positions or panchang, supply an ISO date-time with an explicit offset,
            and optionally supply ayanamsaDegrees. A successful calculation consumes one nonbillable
            sandbox astrology credit. Inputs and results are not stored in general logs. Paid add-on
            purchases remain disabled.
          </p>
          <h2>Account access</h2>
          <p>
            Public registration is disabled. In Firebase mode, administrators assign existing users
            to workspaces. Login exchanges a recently authenticated Firebase ID token for an
            HTTP-only server session. Logout invalidates the stored session.
          </p>
          <Link href="/settings" className="text-link">
            Account settings →
          </Link>
        </section>
      </div>
    </>
  );
}
