import { useState } from 'react';
import { Link } from 'expo-router';
import { coreInputs } from '../data/integrations';
import { mutate, ConsoleError } from '../lib/api';
import { useConsole } from './Session.web';
import { Badge, CopyButton, ErrorNotice, Loading, Meter, useLoad } from './ui.web';
type Budget = {
  status: string;
  engineVersion: string;
  allowance: number;
  used: number;
  balance: number;
  requestCost: number;
  availableOperations: {
    id: string;
    name: string;
    description: string;
    category?: string;
    requestFormat?: string;
    example?: object;
    availability?: 'available' | 'limited';
  }[];
};
type Planet = {
  body: string;
  tropicalLongitudeDegrees: number;
  siderealLongitudeDegrees: number;
  latitudeDegrees: number;
  distanceAU: number;
  rashi: { number: number; name: string; degreesWithin: number };
  nakshatra: { number: number; name: string; pada: number };
  motion: { degreesPerDay: number; retrograde: boolean };
};
type Calculation = {
  data: {
    operation: string;
    datetimeUtc?: string;
    imageBase64?: string;
    engineVersion: string;
    ayanamsa?: string | { model: string; degrees: number; approximate: boolean; note: string };
    planets?: Planet[];
    panchang?: {
      tithi: { number: number; numberWithinPaksha: number; paksha: string };
      nakshatra: { number: number; name: string; pada: number };
      yoga: { number: number };
      karana: { halfTithiNumber: number; name: string };
      sunRashi: { name: string };
      moonRashi: { name: string };
    };
  };
  usage: { contentRequests: number; remaining: number };
  requestId: string;
  responseTimeMs: number;
};
export default function AstrologyCalculator({ initialOperation }: { initialOperation?: string }) {
  const budget = useLoad<Budget>('/api/astrology'),
    { refresh, config } = useConsole();
  const [operation, setOperation] = useState(initialOperation ?? 'positions'),
    [datetime, setDatetime] = useState(() =>
      initialOperation ? '2026-11-12T12:00:00' : new Date().toISOString().slice(0, 19),
    ),
    [model, setModel] = useState('approximate'),
    [custom, setCustom] = useState('24.2'),
    [advancedInput, setAdvancedInput] = useState<string | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<Calculation | null>(null),
    [example, setExample] = useState('curl');
  const operations = budget.data?.availableOperations ?? [];
  const selectedOperation = operations.find((item) => item.id === operation);
  const advanced =
    (operation !== 'positions' &&
      operation !== 'panchang' &&
      Object.hasOwn(coreInputs, operation)) ||
    selectedOperation?.requestFormat === 'parameters';
  const advancedText =
    advancedInput ??
    JSON.stringify(
      selectedOperation?.example ?? coreInputs[operation] ?? { parameters: {} },
      null,
      2,
    );
  const groups = [...new Set(operations.map((item) => item.category ?? 'Core astrology'))];
  function chooseOperation(id: string) {
    setOperation(id);
    setAdvancedInput(null);
    setResult(null);
    setError('');
  }
  const basicInput = {
    datetime: `${datetime.length === 16 ? datetime + ':00' : datetime}Z`,
    ...(model === 'custom' ? { ayanamsaDegrees: Number(custom) } : {}),
  };
  let payload: object | null = { operation, ...basicInput };
  if (advanced) {
    try {
      const input = JSON.parse(advancedText);
      payload =
        input && typeof input === 'object' && !Array.isArray(input)
          ? { ...input, operation }
          : null;
    } catch {
      payload = null;
    }
  }
  const base = config?.apiUrl ?? 'https://api.mantrilo.com';
  const body = payload ? JSON.stringify(payload, null, 2) : '';
  const curl = `curl --request POST '${base}/v1/astrology/calculate' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  --data '${body.replaceAll("'", "'\\''")}'`;
  const javascript = `// Run this on your server.\nconst response = await fetch('${base}/v1/astrology/calculate', {\n  method: 'POST',\n  headers: {\n    Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\`,\n    'Content-Type': 'application/json'\n  },\n  body: ${JSON.stringify(body)}\n});\nconst result = await response.json();`;
  async function run(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOperation || selectedOperation.availability === 'limited') return;
    if (!payload) {
      setError('Enter a valid JSON object for the calculation inputs.');
      return;
    }
    setPending(true);
    setError('');
    setResult(null);
    try {
      const response = await mutate<Calculation>('/api/astrology/calculate', 'POST', payload);
      setResult(response);
      await Promise.all([budget.reload(), refresh()]);
    } catch (e) {
      setError(
        e instanceof ConsoleError
          ? `HTTP ${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : 'Calculation could not be completed.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <ErrorNotice message={budget.error || error} />
      {budget.loading && !budget.data ? (
        <Loading />
      ) : (
        <>
          <div className="metrics two">
            <Meter
              label="Content requests used"
              value={budget.data?.used || 0}
              limit={budget.data?.allowance || 0}
              note={`${(budget.data?.balance || 0).toLocaleString()} remaining this month`}
            />
            <section className="metric-card">
              <span className="metric-label">ENGINE STATUS</span>
              <h2 className="status-heading">
                Available <Badge tone="green">SERVER-SIDE</Badge>
              </h2>
              <p>{budget.data?.availableOperations.length ?? 0} operations available</p>
            </section>
          </div>
          <details className="panel prose">
            <summary>Browse all {operations.length} astrology operations</summary>
            {groups.map((group) => (
              <section key={group}>
                <h3>{group}</h3>
                <ul>
                  {operations
                    .filter((item) => (item.category ?? 'Core astrology') === group)
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="text-button"
                          disabled={pending}
                          onClick={() => chooseOperation(item.id)}
                        >
                          {item.name}
                        </button>{' '}
                        <code>{item.id}</code>
                        {item.availability === 'limited' ? ' · Currently unavailable' : ''}
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </details>
          <div className="playground-grid">
            <section className="panel form-panel">
              {initialOperation && !selectedOperation && (
                <p className="notice">
                  This operation is not enabled in the workspace sandbox. Choose another operation
                  below.
                </p>
              )}
              <h2>Run a calculation</h2>
              <form onSubmit={run}>
                <label>
                  Operation
                  <select
                    value={operation}
                    disabled={pending}
                    onChange={(e) => chooseOperation(e.target.value)}
                  >
                    {groups.map((group) => (
                      <optgroup key={group} label={group}>
                        {operations
                          .filter((op) => (op.category ?? 'Core astrology') === group)
                          .map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name}
                              {op.availability === 'limited' ? ' · Currently unavailable' : ''}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <p className="small muted">
                  {selectedOperation?.availability === 'limited'
                    ? 'This operation is currently unavailable. You can still view and copy its request example.'
                    : selectedOperation?.description}
                </p>
                {advanced ? (
                  <label>
                    Request inputs (JSON)
                    <textarea
                      value={advancedText}
                      onChange={(e) => setAdvancedInput(e.target.value)}
                      rows={12}
                      spellCheck={false}
                      required
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Date & time · UTC
                      <input
                        type="datetime-local"
                        step="1"
                        value={datetime}
                        onChange={(e) => setDatetime(e.target.value)}
                        min="1900-01-01T00:00:00"
                        max="2100-12-31T23:59:59"
                        required
                      />
                    </label>
                    <label>
                      Sidereal offset model
                      <select value={model} onChange={(e) => setModel(e.target.value)}>
                        <option value="approximate">Approximate Lahiri · starter model</option>
                        <option value="custom">Custom ayanamsa for this instant</option>
                      </select>
                    </label>
                    {model === 'custom' && (
                      <label>
                        Custom ayanamsa · degrees
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="any"
                          value={custom}
                          onChange={(e) => setCustom(e.target.value)}
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                <div className="cost-box">
                  <span>COST BEFORE EXECUTION</span>
                  <strong>{budget.data?.requestCost || 1} content request</strong>
                  <small>Failed calculations cost nothing</small>
                </div>
                <button
                  className="button"
                  disabled={
                    pending ||
                    !budget.data ||
                    budget.data.balance <= 0 ||
                    !selectedOperation ||
                    selectedOperation.availability === 'limited'
                  }
                >
                  {pending ? 'Calculating…' : 'Calculate now'} <span>↗</span>
                </button>
                <p className="small muted">
                  Inputs are used for this calculation and are not stored in general request logs.
                  The result remains in this page’s memory.
                </p>
              </form>
            </section>
            <section className="panel prose">
              <h2>Calculation inputs</h2>
              <p>
                Birth charts, chart images, and matching use an ISO birth time with an explicit UTC
                offset and the birth place’s latitude, longitude, and IANA time zone.
              </p>
              <p>
                Daily Panchang uses a local calendar date and the same location fields. Use Find a
                place to look up coordinates and a time zone.
              </p>
              <p>
                Planetary positions and instant Panchang use an instant in UTC and accept a custom
                sidereal offset in degrees.
              </p>
            </section>
          </div>
          {result && (
            <section className="panel response-panel" aria-live="polite">
              <div className="panel-heading">
                <h2>
                  {budget.data?.availableOperations.find((op) => op.id === result.data.operation)
                    ?.name ?? 'Calculation result'}
                </h2>
                <div className="action-row">
                  <Badge tone="green">HTTP 200</Badge>
                  <Badge>{result.responseTimeMs} ms server time</Badge>
                  <Badge>1 content request</Badge>
                </div>
              </div>
              <p className="response-id">
                Request ID <code>{result.requestId}</code>
                {result.data.datetimeUtc && (
                  <>
                    <br />
                    UTC instant {result.data.datetimeUtc}
                  </>
                )}
              </p>
              {typeof result.data.ayanamsa === 'object' && (
                <div className="notice calculation-notice">
                  {result.data.ayanamsa.degrees}° · {result.data.ayanamsa.note}
                </div>
              )}
              {result.data.imageBase64 && (
                <img
                  style={{ maxWidth: '100%', height: 'auto' }}
                  src={`data:image/png;base64,${result.data.imageBase64}`}
                  alt="Vedic chart"
                />
              )}
              {result.data.planets && (
                <div className="table-scroll" tabIndex={0}>
                  <table>
                    <thead>
                      <tr>
                        <th>Body</th>
                        <th>Tropical longitude</th>
                        <th>Sidereal longitude</th>
                        <th>Rashi</th>
                        <th>Nakshatra / pada</th>
                        <th>Motion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.planets.map((p) => (
                        <tr key={p.body}>
                          <td>
                            <strong>{p.body}</strong>
                          </td>
                          <td>{p.tropicalLongitudeDegrees.toFixed(4)}°</td>
                          <td>{p.siderealLongitudeDegrees.toFixed(4)}°</td>
                          <td>
                            {p.rashi.name} · {p.rashi.degreesWithin.toFixed(3)}°
                          </td>
                          <td>
                            {p.nakshatra.name} / {p.nakshatra.pada}
                          </td>
                          <td>{p.motion.retrograde ? 'Retrograde' : 'Direct'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {result.data.panchang && (
                <dl className="field-grid panchang-summary">
                  <div>
                    <dt>Tithi</dt>
                    <dd>
                      {result.data.panchang.tithi.paksha}{' '}
                      {result.data.panchang.tithi.numberWithinPaksha} · #
                      {result.data.panchang.tithi.number}
                    </dd>
                  </div>
                  <div>
                    <dt>Nakshatra</dt>
                    <dd>
                      {result.data.panchang.nakshatra.name} · Pada{' '}
                      {result.data.panchang.nakshatra.pada}
                    </dd>
                  </div>
                  <div>
                    <dt>Yoga</dt>
                    <dd>#{result.data.panchang.yoga.number}</dd>
                  </div>
                  <div>
                    <dt>Karana</dt>
                    <dd>{result.data.panchang.karana.name}</dd>
                  </div>
                  <div>
                    <dt>Sun rashi</dt>
                    <dd>{result.data.panchang.sunRashi.name}</dd>
                  </div>
                  <div>
                    <dt>Moon rashi</dt>
                    <dd>{result.data.panchang.moonRashi.name}</dd>
                  </div>
                </dl>
              )}
              <div className="code-heading">
                <h3>Full response</h3>
                <CopyButton text={JSON.stringify(result, null, 2)} />
              </div>
              <pre>
                <code>
                  {JSON.stringify(
                    result.data.imageBase64
                      ? {
                          ...result,
                          data: { ...result.data, imageBase64: '(included in copied response)' },
                        }
                      : result,
                    null,
                    2,
                  )}
                </code>
              </pre>
            </section>
          )}
          <section className="panel request-example astrology-api-example">
            <div className="panel-heading">
              <h2>Use your API key</h2>
              <div className="segmented compact">
                <button aria-pressed={example === 'curl'} onClick={() => setExample('curl')}>
                  cURL
                </button>
                <button
                  aria-pressed={example === 'javascript'}
                  onClick={() => setExample('javascript')}
                >
                  JavaScript
                </button>
              </div>
            </div>
            <pre>
              <code>
                {payload
                  ? example === 'curl'
                    ? curl
                    : javascript
                  : 'Enter valid request inputs to see the example.'}
              </code>
            </pre>
            {payload && <CopyButton text={example === 'curl' ? curl : javascript} />}
            <p className="small muted example-note">
              The API uses the same engine and allowance as this console.{' '}
              <Link href="/keys">Create an API key →</Link>
            </p>
          </section>
        </>
      )}
    </>
  );
}
