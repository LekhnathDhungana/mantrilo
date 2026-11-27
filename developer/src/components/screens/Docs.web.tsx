import { Link, router, useLocalSearchParams } from 'expo-router';
import AstrologyCalculator from '../AstrologyCalculator.web';
import Playground from './Playground.web';
import { GuideIndex, GuidePage } from './Guides.web';
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

// Docs is one place for everything about calling the API: guides by goal, a request runner,
// and the reference. Older links used tab=guide for the reference and /implementation for guides.
const TABS = [
  ['guides', 'Guides'],
  ['try', 'Try it'],
  ['reference', 'Reference'],
] as const;
const ALIASES: Record<string, string> = { guide: 'reference', astrology: 'try' };

export default function Docs() {
  const {
    tab: requested = 'guides',
    operation,
    guide,
    preset,
  } = useLocalSearchParams<{ tab?: string; operation?: string; guide?: string; preset?: string }>();
  const tab = ALIASES[requested] ?? (TABS.some(([id]) => id === requested) ? requested : 'guides');
  const astrology = requested === 'astrology';
  const go = (next: string) =>
    router.setParams({ tab: next, operation: undefined, guide: undefined, preset: undefined });
  if (guide) return <GuidePage id={guide} />;
  return (
    <>
      <PageTitle
        eyebrow="DOCS"
        title="Docs"
        copy="Pick what you’re building, run the request with your key, and look up any endpoint."
      />
      <div className="segmented tab-row" role="group" aria-label="Docs section">
        {TABS.map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => go(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'guides' && <GuideIndex onTry={() => go('try')} />}
      {tab === 'try' && (
        <>
          <div className="segmented compact try-switch" role="group" aria-label="What to run">
            <button aria-pressed={!astrology} onClick={() => go('try')}>
              Content API
            </button>
            <button aria-pressed={astrology} onClick={() => go('astrology')}>
              Astrology calculator
            </button>
          </div>
          {astrology ? (
            <AstrologyCalculator key={operation} initialOperation={operation} />
          ) : (
            <Playground key={preset} preset={preset} />
          )}
        </>
      )}
      {tab === 'reference' && <Guide onTry={go} />}
    </>
  );
}

function Guide({ onTry }: { onTry: (tab: string) => void }) {
  const { config } = useConsole();
  const { data, error } = useLoad<DocsConfig>('/api/config');
  const base = config?.apiUrl ?? 'https://api.mantrilo.com';
  const astrology = `curl --request POST '${base}/v1/astrology/calculate' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  --data '{"operation":"chart","birth":{"datetime":"1995-06-20T12:30:00+05:30","latitude":28.6139,"longitude":77.209,"timezone":"Asia/Kolkata"},"divisions":[1,9]}'`;
  return (
    <>
      <section className="panel prose">
        <h2>Authentication</h2>
        <p>
          Call Mantrilo from your own backend and pass only the content to your app. Never put a key
          in a mobile app, website or Git repository; browser calls to the API are blocked. Audio
          links are safe to pass along, because they expire after 15 minutes.
        </p>
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
          <code>rate_limited</code> response also includes <code>Retry-After</code>. Workspaces with
          the unlimited requests promo receive <code>unlimited</code> in{' '}
          <code>X-Quota-Requests-Remaining</code>.
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
