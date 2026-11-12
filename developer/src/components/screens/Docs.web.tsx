import { Link, router, useLocalSearchParams } from 'expo-router';
import AstrologyCalculator from '../AstrologyCalculator.web';
import Playground from './Playground.web';
import { useConsole } from '../Session.web';
import { CopyButton, ErrorNotice, PageTitle, useLoad } from '../ui.web';
import type { Plan } from '../../lib/types';

type DocsConfig = { plans: Plan[]; rateLimits: Record<string, { rate: number; burst: number }> };

const ENDPOINTS = [
  ['GET /v1', 'API information. No key needed.'],
  ['GET /v1/mantras', 'Mantras. Accepts limit, cursor and deity.'],
  [
    'GET /v1/mantras/{id}',
    'One mantra with its verses: Sanskrit, transliteration, translation and word meanings.',
  ],
  [
    'GET /v1/mantras/{id}/audio',
    'A short-lived link to the recording. Add ?format=json for the link as JSON.',
  ],
  ['GET /v1/books', 'Book catalog. Accepts collection, limit (1–100) and cursor.'],
  ['GET /v1/books/{id}', 'Book summary and chapter index.'],
  ['GET /v1/books/{id}/chapters/{chapter}', 'One page of verses. Accepts offset.'],
  ['GET /v1/astrology', 'Operation IDs, categories and sample inputs. No key needed.'],
  ['POST /v1/astrology/calculate', 'Run a Western, Vedic, numerology or astronomy operation.'],
];

const ERRORS = [
  [
    '400',
    'invalid_limit, invalid_cursor, invalid_deity, invalid_collection, invalid_offset',
    'Fix the query parameter.',
  ],
  ['401', 'invalid_api_key', 'The key is missing or wrong.'],
  ['401', 'revoked_api_key', 'Copy your current key from the console.'],
  ['403', 'plan_inactive', 'Live keys need an active paid plan.'],
  ['403', 'sandbox_sample_only', 'That item is outside the sandbox sample. Use your live key.'],
  ['404', 'not_found, audio_unavailable', 'No such item, or it has no recording.'],
  ['405', 'method_not_allowed', 'Use the method shown under Endpoints.'],
  ['429', 'rate_limited', 'Wait for the Retry-After header, then retry.'],
  ['429', 'quota_exceeded, audio_quota_exceeded', 'The monthly allowance has run out.'],
  ['429', 'too_many_failed_attempts', 'Too many bad keys from this address. Retry later.'],
  ['500', 'internal_error', 'Retry, and quote the requestId if it continues.'],
  ['503', 'astrology_operation_unavailable', 'See the operation catalog for availability.'],
];

const LIST_RESPONSE = `{
  "data": [
    {
      "id": "example-mantra",
      "title": "Example mantra",
      "deity": { "id": "shiva", "name": "Lord Shiva" },
      "category": "Shiva Stotras",
      "source": null,
      "description": "A short summary of the mantra, or null.",
      "verseCount": 1,
      "audio": { "href": "/v1/mantras/example-mantra/audio" }
    }
  ],
  "nextCursor": "…",
  "requestId": "…"
}`;

const ERROR_RESPONSE = `{
  "error": { "code": "invalid_api_key", "message": "…" },
  "requestId": "…"
}`;

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {head.map((title) => (
              <th key={title}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) => (
                <td key={i}>{i === 0 ? <code>{cell}</code> : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  ['try', 'API Explorer'],
  ['astrology', 'Astrology explorer'],
  ['guide', 'Reference'],
];

export default function Docs() {
  const { tab: requested, operation } = useLocalSearchParams<{
    tab?: string;
    operation?: string;
  }>();
  const tab = TABS.some(([id]) => id === requested) ? requested! : 'try';
  const setTab = (tab: string) => router.setParams({ tab, operation: undefined });
  return (
    <>
      <PageTitle
        eyebrow="DOCS"
        title="API Explorer and docs"
        copy="Run requests with your sandbox or live key, then read the contract behind them."
      />
      <div className="segmented tab-row" role="group" aria-label="Docs section">
        {TABS.map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'guide' && <Guide onTry={setTab} />}
      {tab === 'try' && <Playground />}
      {tab === 'astrology' && (
        <>
          <p className="library-guide-link">
            <Link href={{ pathname: '/library', params: { type: 'astrology', item: operation } }}>
              ← Astrology Library
            </Link>
          </p>
          <AstrologyCalculator key={operation} initialOperation={operation} />
        </>
      )}
    </>
  );
}

function Guide({ onTry }: { onTry: (tab: string) => void }) {
  const { config } = useConsole();
  const { data, error } = useLoad<DocsConfig>('/api/config');
  const base = config?.apiUrl ?? 'https://api.mantrilo.com';
  const quickstart = `curl '${base}/v1/mantras?limit=5' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  const astrology = `curl --request POST '${base}/v1/astrology/calculate' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  --data '{"operation":"chart","birth":{"datetime":"1995-06-20T12:30:00+05:30","latitude":28.6139,"longitude":77.209,"timezone":"Asia/Kolkata"},"divisions":[1,9]}'`;
  return (
    <>
      {!config?.apiUrl && (
        <div className="notice">
          The API isn’t connected to this console yet, so these requests may not work here.
        </div>
      )}
      <section className="panel prose">
        <h2>Quick start</h2>
        <ol>
          <li>
            Copy your sandbox key from <Link href="/">Home</Link>. Every account has one from the
            start.
          </li>
          <li>Store it in your server’s environment or a secret manager.</li>
          <li>Run this request:</li>
        </ol>
        <pre>
          <code>{quickstart}</code>
        </pre>
        <CopyButton text={quickstart} />
        <p>
          Prefer to try it here?{' '}
          <button className="text-button" onClick={() => onTry('try')}>
            Try the API →
          </button>
        </p>
        <h2>Keep keys on your server</h2>
        <p>
          Never put a key in a mobile app, website or Git repository. Call Mantrilo from your own
          backend and pass only the content to your app. Audio links are safe to pass along, because
          they expire after 15 minutes. Browser calls to the API are blocked.
        </p>
      </section>
      <section className="panel prose">
        <h2>Authentication</h2>
        <p>
          Send your key on every request as <code>Authorization: Bearer YOUR_KEY</code>.
        </p>
        <Table
          head={['Key', 'What it can read']}
          rows={[
            ['Sandbox · mtr_sbx_…', 'Five sample mantras and opening verses from sample books.'],
            ['Live · mtr_live_…', 'The full catalog. Comes with a paid plan.'],
          ]}
        />
        <p>
          Every account has a sandbox key. Subscribing adds a live key with its own monthly
          allowance. If a key leaks, <Link href="/keys">regenerate it</Link>. The old key stops
          working within a minute.
        </p>
      </section>
      <section className="panel prose">
        <h2 id="endpoints">Endpoints</h2>
        <Table head={['Endpoint', 'Returns']} rows={ENDPOINTS} />
        <h2>Mantra list parameters</h2>
        <Table
          head={['Parameter', 'Meaning']}
          rows={[
            ['limit', 'Items per page, 1 to 100. The default is 20.'],
            ['cursor', 'The nextCursor value from the previous page. It is null on the last page.'],
            ['deity', 'A deity id, such as shiva or devi. Exact match.'],
          ]}
        />
        <h2 id="reading-books">Reading books</h2>
        <p>
          Filter the catalog with <code>collection</code>, such as <code>upanishads</code> or{' '}
          <code>bhagavad-gita</code>, and set the page size with <code>limit</code> (1–100, default
          24). Get a book’s chapter numbers from its chapter index. Use <code>nextCursor</code> as{' '}
          <code>cursor</code> to page the catalog and <code>nextOffset</code> as <code>offset</code>
          to read more verses. A null value means the last page. Sandbox keys can read the first
          three verses of the opening chapter of each sample book.
        </p>
      </section>
      <section className="panel prose">
        <h2>Responses</h2>
        <p>A successful list looks like this:</p>
        <pre>
          <code>{LIST_RESPONSE}</code>
        </pre>
        <p>Every error has the same shape:</p>
        <pre>
          <code>{ERROR_RESPONSE}</code>
        </pre>
        <Table head={['Status', 'Code', 'What to do']} rows={ERRORS} />
      </section>
      <section className="panel prose">
        <h2>Limits</h2>
        <p>
          Limits apply to your whole workspace, not to each key. Only successful responses count.
          Each content response or astrology calculation is one request, and each audio link also
          counts the file’s size. Sandbox keys always use the Free rate.
        </p>
        <ErrorNotice message={error} />
        {data && (
          <Table
            head={['Plan', 'Requests a month', 'Audio', 'Requests a second', 'Burst']}
            rows={data.plans.map((plan) => [
              plan.name,
              plan.requests,
              plan.audio,
              data.rateLimits[plan.name]?.rate ?? '—',
              data.rateLimits[plan.name]?.burst ?? '—',
            ])}
          />
        )}
        <p>
          Responses include <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,{' '}
          <code>X-Quota-Requests-Remaining</code> and <code>X-Request-Id</code>. A{' '}
          <code>rate_limited</code> response also includes <code>Retry-After</code>.
        </p>
      </section>
      <section className="panel prose">
        <h2>Astrology</h2>
        <p>
          Use <code>GET /v1/astrology</code> for the Western, numerology, and Vedic operation
          catalog. In the calculator, select a category and operation to edit its inputs and copy a
          request to the Mantrilo API. Use the operation ID and its sample JSON to build a request.
        </p>
        <p>
          Each successful astrology request counts as one content request. Send the operation and
          its inputs to <code>POST /v1/astrology/calculate</code>.{' '}
          <button className="text-button" onClick={() => onTry('astrology')}>
            Open the astrology calculator →
          </button>
        </p>
        <Table
          head={['Operation', 'Inputs', 'Returns']}
          rows={[
            [
              'chart',
              'birth; optional divisions, dashaLevels and referenceDate',
              'Lahiri D1 and D9 charts with ascendant, grahas, houses and optional Vimshottari Dasha.',
            ],
            [
              'daily-panchang',
              'date, latitude, longitude, timezone',
              'Sunrise, sunset, Tithi, Nakshatra, Yoga, Karana transitions and Rahu Kalam.',
            ],
            [
              'match',
              'person1 and person2, each a birth object',
              'Ashtakoota score out of 36 and all eight factor scores.',
            ],
            [
              'chart-image',
              'birth; optional divisions and layout (north, south or east)',
              'A PNG encoded as imageBase64.',
            ],
            [
              'places',
              'query; optional country (two letters) and limit (1–10)',
              'Matching places with coordinates, time zones and geographic attribution.',
            ],
            [
              'positions',
              'datetime; optional ayanamsaDegrees',
              'Tropical and sidereal longitudes, rashis and nakshatras.',
            ],
            ['panchang', 'datetime; optional ayanamsaDegrees', 'Panchang elements at an instant.'],
          ]}
        />
        <p>
          A birth object contains <code>datetime</code> (ISO 8601 with seconds set to 00 and an
          explicit UTC offset), <code>latitude</code>, <code>longitude</code>, and an IANA{' '}
          <code>timezone</code> such as Asia/Kolkata. Pass <code>[1, 9]</code> for both chart
          divisions. Dasha depth is 0–3 and any nonzero depth requires a <code>referenceDate</code>{' '}
          in YYYY-MM-DD format. Daily Panchang dates use the same date format.
        </p>
        <pre>
          <code>{astrology}</code>
        </pre>
        <CopyButton text={astrology} />
        <h2>Account access</h2>
        <p>
          Verify your email before upgrading to a paid plan.{' '}
          <Link href="/settings">Account settings →</Link>
        </p>
      </section>
    </>
  );
}
