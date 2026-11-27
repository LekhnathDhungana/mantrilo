// Opt-in vendor smoke test. Uses synthetic dates only and spends up to three requests.
import { setTimeout as delay } from 'node:timers/promises';

const key = process.env.FREEASTRO_API_KEY?.trim();
if (!key) {
  console.error(
    'Set FREEASTRO_API_KEY in the environment to run the synthetic FreeAstroAPI probe.',
  );
  process.exit(1);
}

const birth = {
  year: 1995,
  month: 6,
  day: 20,
  hour: 12,
  minute: 30,
  lat: 28.6139,
  lng: 77.209,
  tz_str: 'Asia/Kolkata',
  ayanamsha: 'lahiri',
};

const chart = { ...birth, house_system: 'whole_sign', node_type: 'mean' };
const probes = [
  ['chart', chart, ['ascendant', 'planets', 'houses', 'metadata']],
  [
    'calculate',
    {
      ...chart,
      vargas: [1, 9],
      dasha_levels: 1,
      reference_date: '2026-11-11',
      include_yogas: false,
      include_panchang: false,
      include_shadbala: false,
      include_ashtakavarga: false,
    },
    ['chart', 'vargas', 'vimshottari_dasha', 'metadata'],
  ],
  [
    'panchang',
    { ...birth, year: 2026, month: 11, day: 11 },
    ['sunrise', 'sunset', 'tithi', 'nakshatra', 'yoga', 'karanas', 'rahu_kalam', 'metadata'],
  ],
];

for (const [endpoint, body, fields] of probes) {
  const start = performance.now();
  try {
    const response = await fetch('https://api.freeastroapi.com/api/v2/vedic/' + endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
      redirect: 'error',
    });
    const bytes = await response.arrayBuffer();
    const ms = Math.round(performance.now() - start);
    const summary = { endpoint, status: response.status, ms, decodedBytes: bytes.byteLength };
    if (!response.ok) {
      console.error(
        JSON.stringify({ ...summary, retryAfter: response.headers.get('retry-after') }),
      );
      process.exitCode = 1;
      break;
    }
    const result = JSON.parse(new TextDecoder().decode(bytes));
    const missing = fields.filter((field) => result?.[field] == null);
    console.log(JSON.stringify({ ...summary, missing }));
    if (missing.length) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ endpoint, error: error.name }));
    process.exitCode = 1;
    break;
  }
  if (endpoint !== 'panchang') await delay(1_100);
}
