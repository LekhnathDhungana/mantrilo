import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import AstrologyCalculator from '../AstrologyCalculator.web';
import Playground from './Playground.web';
import { useConsole } from '../Session.web';
import { CopyButton, ErrorNotice, PageTitle, useLoad } from '../ui.web';
import type { Plan } from '../../lib/types';

type DocsConfig = { plans: Plan[]; rateLimits: Record<string, { rate: number; burst: number }> };

const ENDPOINTS = [
  ['GET /v1', 'API information. No key needed.'],
  ['GET /v1/shlokas', 'Shloka collections. Accepts limit, cursor and deity.'],
  ['GET /v1/shlokas/{id}', 'One collection with verses, transliteration and word meanings.'],
  ['GET /v1/shlokas/{id}/audio', 'Redirects (302) to a signed audio link valid for 15 minutes.'],
  ['GET /v1/mantras', 'Mantras. Accepts limit, cursor and deity.'],
  ['GET /v1/mantras/{id}', 'One mantra with its text, transliterations and translations.'],
  ['POST /v1/astrology/calculate', 'Planetary positions or instant Panchang for a date and time.'],
];

const ERRORS = [
  ['400', 'invalid_limit, invalid_cursor, invalid_deity', 'Fix the query parameter.'],
  ['401', 'invalid_api_key', 'The key is missing or wrong.'],
  ['401', 'revoked_api_key', 'Create a new key in the console.'],
  ['403', 'plan_inactive', 'Production keys need an active paid plan.'],
  ['403', 'sandbox_sample_only', 'That item is outside the sandbox sample.'],
  ['404', 'not_found, audio_unavailable', 'No such item, or it has no recording.'],
  ['405', 'method_not_allowed', 'Use the method shown under Endpoints.'],
  ['429', 'rate_limited', 'Wait for the Retry-After header, then retry.'],
  ['429', 'quota_exceeded, audio_quota_exceeded', 'The monthly allowance has run out.'],
  ['429', 'too_many_failed_attempts', 'Too many bad keys from this address. Retry later.'],
  ['500', 'internal_error', 'Retry, and quote the requestId if it continues.'],
];

const LIST_RESPONSE = `{
  "data": [
    {
      "id": "annapurna-aham-vaishvanaro-bhuthva",
      "title": "Aham Vaishvanaro Bhuthva",
      "deity": { "id": "annapurna", "name": "Lord Annapurna" },
      "category": "Annapurna Stotras",
      "source": "Sanatana Shastras",
      "description": "…",
      "verseCount": 1,
      "audio": { "href": "/v1/shlokas/annapurna-aham-vaishvanaro-bhuthva/audio" }
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
  ['guide', 'Guide'],
  ['try', 'Try the API'],
  ['astrology', 'Astrology'],
];

export default function Docs() {
  const { tab: requested } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(TABS.some(([id]) => id === requested) ? requested! : 'guide');
  return (
    <>
      <PageTitle
        eyebrow="DOCS"
        title="Build with the Mantrilo API."
        copy="Read shlokas, mantras and audio, and run astrology calculations, with one API key."
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
      {tab === 'astrology' && <AstrologyCalculator />}
    </>
  );
}

function Guide({ onTry }: { onTry: (tab: string) => void }) {
  const { config } = useConsole();
  const { data, error } = useLoad<DocsConfig>('/api/config');
  const base = config?.apiUrl ?? 'https://api.mantrilo.com';
  const quickstart = `curl '${base}/v1/shlokas?limit=5' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"`;
  const astrology = `curl --request POST '${base}/v1/astrology/calculate' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  --data '{"operation":"positions","datetime":"2026-11-07T12:00:00Z"}'`;
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
            <Link href="/keys">Create a sandbox key</Link> and save it. It is shown only once.
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
            ['mtr_sbx_…', 'The first 5 items of each resource, with up to 50 MB of audio a month.'],
            ['mtr_live_…', 'The full catalog. Needs a paid plan.'],
          ]}
        />
        <p>
          Create one key for each app or environment. To rotate a key, create the new one, deploy
          it, then revoke the old one. A revoked key stops working within a minute.
        </p>
      </section>
      <section className="panel prose">
        <h2>Endpoints</h2>
        <Table head={['Endpoint', 'Returns']} rows={ENDPOINTS} />
        <h2>List parameters</h2>
        <Table
          head={['Parameter', 'Meaning']}
          rows={[
            ['limit', 'Items per page, 1 to 100. The default is 20.'],
            ['cursor', 'The nextCursor value from the previous page. It is null on the last page.'],
            [
              'deity',
              'An exact, case-sensitive match. Use a shloka’s deity.id or a value from a mantra’s deities.',
            ],
          ]}
        />
        <h2>Audio</h2>
        <p>
          The audio endpoint redirects to the file. Add <code>?format=json</code> to receive the{' '}
          <code>url</code>, <code>expiresAt</code>, <code>bytes</code> and <code>contentType</code>{' '}
          instead. Request a new link once one expires.
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
          counts the file’s size. Sandbox keys always use the Sandbox rate.
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
          Astrology is included in every plan, and each successful calculation counts as one content
          request. Send <code>operation</code> (<code>positions</code> or <code>panchang</code>),{' '}
          <code>datetime</code> (ISO with an explicit offset) and optionally{' '}
          <code>ayanamsaDegrees</code>.{' '}
          <button className="text-button" onClick={() => onTry('astrology')}>
            Try it →
          </button>
        </p>
        <pre>
          <code>{astrology}</code>
        </pre>
        <CopyButton text={astrology} />
        <h2>Account access</h2>
        <p>
          Verify your email before creating keys. Creating a production key also needs a sign-in
          from the last 10 minutes. <Link href="/settings">Account settings →</Link>
        </p>
      </section>
    </>
  );
}
