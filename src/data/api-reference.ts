// Public description of the /v1 contract in developer/api. Keep it in step with that code.
// Catalog examples use placeholder values until each record's publication rights are confirmed.
export const endpoints = [
  ['GET /v1', 'API information. No key needed.'],
  ['GET /v1/mantras', 'Mantras. Accepts limit (1–100), cursor and deity.'],
  [
    'GET /v1/mantras/{id}',
    'One mantra with its verses: Sanskrit, transliteration, translation, word meanings.',
  ],
  [
    'GET /v1/mantras/{id}/audio',
    'A 15-minute signed link to the recording. Add ?format=json for JSON.',
  ],
  ['GET /v1/books', 'Book catalog. Accepts collection, limit (1–100) and cursor.'],
  ['GET /v1/books/{id}', 'Book summary and chapter index.'],
  ['GET /v1/books/{id}/chapters/{chapter}', 'One page of verses. Accepts offset.'],
  ['GET /v1/astrology', 'Operation ids, categories and sample inputs. No key needed.'],
  ['POST /v1/astrology/calculate', 'Run a Vedic, Western, numerology or sky operation.'],
];

export const errors = [
  [
    '400',
    'invalid_limit, invalid_cursor, invalid_deity, invalid_collection, invalid_offset',
    'Fix the query parameter named in the message.',
  ],
  [
    '400',
    'invalid_operation, invalid_input, invalid_datetime, invalid_timezone, …',
    'Fix the astrology input named in the message.',
  ],
  ['401', 'invalid_api_key, revoked_api_key', 'The key is missing, wrong, or revoked.'],
  ['403', 'plan_inactive', 'Live keys need an active paid plan.'],
  ['403', 'sandbox_sample_only', 'That item is outside the sandbox sample. Use your live key.'],
  ['404', 'not_found, audio_unavailable', 'No such item, or it has no recording.'],
  ['405', 'method_not_allowed', 'Use the method listed for the endpoint.'],
  ['429', 'rate_limited', 'Wait for the Retry-After header, then retry.'],
  ['429', 'quota_exceeded, audio_quota_exceeded', 'The monthly allowance has run out.'],
  ['429', 'too_many_failed_attempts', 'Too many bad keys from one address. Retry later.'],
  ['500', 'internal_error', 'Retry, and quote the requestId if it continues.'],
  [
    '503',
    'books_unavailable, astrology_unavailable, astrology_operation_unavailable',
    'The service or operation is temporarily unavailable. Retry later.',
  ],
  ['504', 'astrology_timeout', 'The calculation took too long. Retry. Nothing is charged.'],
];

// RATE_LIMITS in developer/api/usage.mjs.
export const rateLimits = [
  ['Free', '2 per second', '10'],
  ['Starter', '10 per second', '20'],
  ['Growth', '25 per second', '50'],
  ['Business', '50 per second', '100'],
];

export const exampleRequest =
  'curl "$MANTRILO_API_URL/v1/mantras?limit=1" \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"';

export const astrologyRequest = `curl "$MANTRILO_API_URL/v1/astrology/calculate" \\
  -H "Authorization: Bearer $MANTRILO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"operation":"positions","datetime":"2026-11-10T12:00:00+05:30"}'`;

export const mantraVerseExample = {
  number: 1,
  title: 'Verse title, or null',
  sanskrit: 'Devanagari text, or null',
  transliteration: 'Transliteration, or null',
  translation: 'Translation, or null',
  wordMeanings: [{ word: 'Word', meaning: 'Meaning' }],
};

export const mantraDetailExample = {
  data: {
    id: 'example-mantra',
    title: 'Example title',
    deity: { id: 'example-deity', name: 'Deity name' },
    category: 'Category, or null',
    source: 'Source name, or null',
    description: 'Short description, or null',
    verseCount: 1,
    audio: { href: '/v1/mantras/example-mantra/audio' },
    verses: [
      {
        number: 1,
        title: 'Verse title, or null',
        sanskrit: 'Devanagari text, or null',
        transliteration: 'Transliteration, or null',
        translation: 'Translation, or null',
        wordMeanings: [{ word: 'Word', meaning: 'Meaning' }],
      },
    ],
  },
  requestId: 'request-id',
};

const astrologyBase = {
  engineVersion: 'mantrilo-astro-1',
  datetimeUtc: '2026-11-10T06:30:00.000Z',
  referenceFrame: 'geocentric_true_ecliptic_of_date',
  ayanamsa: { model: 'lahiri_linear_approximation', degrees: 24.232277, approximate: true },
};

// Output of developer/server/astrology/engine.mjs for 2026-11-10T12:00:00+05:30.
export const astrologyPositionsExample = {
  data: {
    ...astrologyBase,
    operation: 'positions',
    planets: [
      {
        body: 'Moon',
        tropicalLongitudeDegrees: 238.933105,
        siderealLongitudeDegrees: 214.700828,
        latitudeDegrees: -4.987681,
        distanceAU: 0.00267702,
        motion: { degreesPerDay: 12.232549, retrograde: false },
        rashi: { number: 8, name: 'Vrishchika', degreesWithin: 4.700828 },
        nakshatra: { number: 17, name: 'Anuradha', pada: 1 },
      },
    ],
  },
  calculated: true,
  requestId: 'request-id',
};

export const astrologyPanchangExample = {
  data: {
    ...astrologyBase,
    operation: 'panchang',
    basis: 'at_requested_instant_not_local_sunrise',
    panchang: {
      elongationDegrees: 11.0611,
      tithi: { number: 1, numberWithinPaksha: 1, paksha: 'Shukla' },
      nakshatra: { number: 17, name: 'Anuradha', pada: 1 },
      yoga: { number: 5 },
      karana: { halfTithiNumber: 2, name: 'Bava' },
      sunRashi: { number: 7, name: 'Tula', degreesWithin: 23.639729 },
      moonRashi: { number: 8, name: 'Vrishchika', degreesWithin: 4.700828 },
    },
  },
  calculated: true,
  requestId: 'request-id',
};
