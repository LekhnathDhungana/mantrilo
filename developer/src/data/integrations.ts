import published from './published-astrology.json';
import samples from './integration-responses.json';
import { astrologyExcerpts } from './astrology-excerpts';

export const productionApi = 'https://api.mantrilo.com';
export const calculationPath = '/v1/astrology/calculate';
const birth = {
  datetime: '1995-06-20T12:30:00+05:30',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
};
const instant = { datetime: '2026-11-12T12:00:00Z' };
export const coreInputs: Record<string, object> = {
  positions: instant,
  panchang: instant,
  chart: { birth, divisions: [1, 9], dashaLevels: 1, referenceDate: '2026-11-12' },
  'daily-panchang': {
    date: '2026-11-12',
    latitude: birth.latitude,
    longitude: birth.longitude,
    timezone: birth.timezone,
  },
  match: { person1: birth, person2: { ...birth, datetime: '1996-04-25T09:00:00+05:30' } },
  'chart-image': { birth, divisions: [1, 9], layout: 'north' },
  places: { query: 'New Delhi', country: 'IN', limit: 2 },
};

export type Operation = {
  id: string;
  name: string;
  description: string;
  category?: string;
  availability?: string;
  requestFormat?: string;
  example?: object;
};
export type Guide = {
  id: string;
  name: string;
  area: 'Mantras' | 'Audio' | 'Books' | 'Astrology';
  summary: string;
  method: 'GET' | 'POST';
  path: string;
  inputs: string;
  render: string;
  sample: unknown;
  sampleLabel?: string;
  followupPaths?: [string, string][];
  demoPath?: string;
  demoItem?: string;
  demoFollowupPaths?: [string, string][];
  usage: string;
  body?: object;
  limited?: boolean;
  category?: string;
  serverFlow?: string;
  viewCode?: string;
  library: { type: 'mantras' | 'books' | 'astrology'; item?: string };
};

const oneRequest =
  'A successful call uses one content request. Sandbox and live requests have separate usage totals. Failed calculations are refunded.';
const mantraId = samples.mantra.data.id;
const bookId = samples.books.data[0].id;
const listMantras = '/v1/mantras?limit=5';
const mantraPath = '/v1/mantras/' + mantraId;
const chapterPath = '/v1/books/' + bookId + '/chapters/1';
const audioPath = samples.mantra.data.audio.href + '?format=json';

// Shape of GET /v1/books?collection=upanishads&limit=3. Titles and descriptions are elided.
export const collectionSample = {
  data: [
    {
      id: 'ishaUpanishad',
      title: '…',
      author: '…',
      category: 'Shruti (The Revealed Texts)',
      subcategory: 'Upanishads',
      collection: { id: 'upanishads', name: 'Upanishads' },
      description: '…',
      verseCount: 18,
    },
    { id: 'kathaUpanishad', collection: { id: 'upanishads', name: 'Upanishads' }, '…': '…' },
    { id: 'kenaUpanishad', collection: { id: 'upanishads', name: 'Upanishads' }, '…': '…' },
  ],
  nextCursor: 'a2VuYVVwYW5pc2hhZA',
  requestId: 'request-id',
};

export const contentGuides: Guide[] = [
  {
    id: 'search-mantras',
    name: 'Build a searchable mantra library',
    area: 'Mantras',
    summary: 'List mantras and shlokas, filter by deity, and search the titles you have loaded.',
    method: 'GET',
    path: listMantras,
    sample: samples.mantras,
    library: { type: 'mantras' },
    inputs:
      'Use limit (1–100, default 20), cursor (the previous nextCursor), and optional deity (a deity ID such as annapurna). The Mantras route also serves shlokas. The API has no full-text search parameter. The example filters one loaded page by title and optionally by audio availability. For catalog-wide search, index permitted content in your backend.',
    render:
      'Display data[].title, deity.name and verseCount. Use nextCursor for the next page. Open a row by passing its id to GET /v1/mantras/{id}.',
    usage:
      'Each successful page, deity-filter request, and detail fetch uses one request. Searching or filtering audio on already loaded results, or serving an entire response from your own cache without calling Mantrilo, uses zero Mantrilo requests.',
    serverFlow: `const params = new URLSearchParams({ limit: '5' });
for (const field of ['cursor', 'deity']) {
  const value = incoming.searchParams.get(field);
  if (value) params.set(field, value);
}
const page = await mantrilo('/v1/mantras?' + params);
const query = (incoming.searchParams.get('q') ?? '').trim().toLowerCase();
const audio = incoming.searchParams.get('audio'); // 'with' or 'without'
return {
  ...page,
  data: page.data.filter(item =>
    (item.title ?? '').toLowerCase().includes(query) &&
    (audio === 'with' ? !!item.audio : audio === 'without' ? !item.audio : true)
  ),
};`,
    viewCode: 'const titles = data.map(item => item.title);',
  },
  {
    id: 'featured-mantra',
    name: 'Add a daily mantra or featured shloka',
    area: 'Mantras',
    summary: 'Fetch a selected mantra and present its Sanskrit, transliteration and meaning.',
    method: 'GET',
    path: mantraPath,
    demoPath: '/v1/mantras/demo-mantra-1',
    demoItem: 'demo-mantra-1',
    sample: samples.mantra,
    library: { type: 'mantras', item: mantraId },
    inputs:
      'Use the stable id from the catalog. Choose or schedule the featured ID in your app. The API supplies the selected entry.',
    render:
      'Render data.title and the verses array. Display sanskrit, transliteration and translation when present.',
    usage:
      'Each successful detail fetch uses one request. Reusing an entry already in your backend cache uses no additional request.',
    viewCode: 'const featured = { title: data.title, verse: data.verses?.[0] };',
  },
  {
    id: 'sacred-audio',
    name: 'Play a sacred recording',
    area: 'Audio',
    summary: 'Request a temporary playback URL for an entry with a recording.',
    method: 'GET',
    path: audioPath,
    demoPath: '/v1/mantras/demo-mantra-1/audio?format=json',
    demoItem: 'demo-mantra-1',
    sample: samples.audio,
    library: { type: 'mantras', item: mantraId },
    inputs:
      'Use audio.href from the mantra record and append ?format=json. If audio is null, hide the player. The plain endpoint redirects to the recording. JSON mode gives your backend the signed URL.',
    render:
      'Pass data.url to your player, and request a fresh link after data.expiresAt. The example response substitutes a placeholder for the expired signed URL.',
    usage:
      'Each successful link issuance uses one request and charges the full file size in bytes against audio allowance. Reading the already issued URL in the player makes no new Mantrilo API request.',
    viewCode:
      'document.querySelector("audio").src = data.url; // Web player; on mobile use data.url as the audio source.',
  },
  {
    id: 'upanishads',
    name: 'Load the Upanishads',
    area: 'Books',
    summary: 'Call one collection directly, page through it, then open a book, chapter or verse.',
    method: 'GET',
    path: '/v1/books?collection=upanishads&limit=3',
    sample: collectionSample,
    sampleLabel: 'Collection page excerpt',
    followupPaths: [
      [
        'Next page',
        '/v1/books?collection=upanishads&limit=3&cursor=' + collectionSample.nextCursor,
      ],
      ['Book and chapter index', '/v1/books/ishaUpanishad'],
      ['First chapter', '/v1/books/ishaUpanishad/chapters/1'],
    ],
    demoItem: 'demo-pustak',
    demoFollowupPaths: [
      ['Book and chapter index', '/v1/books/demo-pustak'],
      ['First chapter', '/v1/books/demo-pustak/chapters/1'],
    ],
    library: { type: 'books', item: 'ishaUpanishad' },
    inputs:
      'collection is a collection id: upanishads, bhagavad-gita, advaita-vedanta-prakarana-granthas, vedanta or yoga. limit is 1–100 (default 24). Pass nextCursor as cursor for the next page; it is null on the last page. Every book in the response carries collection.id, so the same id works for links back to the collection. Sandbox keys list only the sample book in each collection.',
    render:
      'List data[].title and description, then open a book with GET /v1/books/{id}. Its chapters[] gives the chapter numbers for GET /v1/books/{id}/chapters/{chapter}, whose verses[] carry each verse number.',
    usage:
      'Each collection page, book index and chapter page uses one request. Paging three books at a time through a collection of twelve uses four requests.',
    serverFlow: `const params = new URLSearchParams({ collection: 'upanishads', limit: '3' });
const cursor = incoming.searchParams.get('cursor');
if (cursor) params.set('cursor', cursor);
return mantrilo('/v1/books?' + params);`,
    viewCode:
      'const books = data.map(book => ({ id: book.id, title: book.title, next: nextCursor }));',
  },
  {
    id: 'book-reader',
    name: 'Build a shastra or book reader',
    area: 'Books',
    summary: 'Browse books, select a chapter, and load paginated verses.',
    method: 'GET',
    path: '/v1/books',
    sample: samples.chapter,
    sampleLabel: 'Chapter response excerpt',
    followupPaths: [
      ['Book and chapter index', '/v1/books/' + bookId],
      ['First chapter', chapterPath],
    ],
    demoItem: 'demo-pustak',
    demoFollowupPaths: [
      ['Book and chapter index', '/v1/books/demo-pustak'],
      ['First chapter', '/v1/books/demo-pustak/chapters/1'],
    ],
    library: { type: 'books', item: bookId },
    inputs:
      'GET /v1/books returns up to 24 books. Follow nextCursor as cursor. Fetch /v1/books/{id} for the chapters index, then /v1/books/{id}/chapters/{chapter} using its numeric chapter number. Follow data.nextOffset as offset for more verses. Paid chapter pages contain up to 30 verses. Sandbox shows the opening chapter and first three verses of its sample books.',
    render:
      'Use the book title, chapter titles and verse numbers for navigation. Render available Sanskrit, transliteration and translation per verse. The chapter is the public reading unit, with verses embedded in its pages.',
    usage:
      'A successful book list, book detail, or chapter page each uses one request. The complete example below makes three calls. Reuse cached indexes and pages when appropriate.',
    serverFlow: `const listing = await mantrilo('/v1/books');
const first = listing.data[0];
if (!first) return { data: null };
const path = '/v1/books/' + encodeURIComponent(first.id);
const book = await mantrilo(path);
const chapter = book.data.chapters[0];
if (!chapter) return { data: null, book: book.data };
const offset = incoming.searchParams.get('offset');
const page = await mantrilo(path + '/chapters/' + chapter.number +
  (offset ? '?' + new URLSearchParams({ offset }) : ''));
return { ...page, book: book.data };`,
    viewCode: 'const verses = data?.verses ?? [];',
  },
];

const display: Record<string, [string, string]> = {
  positions: [
    'Show the planets at a specific instant.',
    'Render data.planets with each body, its longitude in degrees and its rashi or nakshatra.',
  ],
  panchang: [
    'Show Panchang elements at a specific instant.',
    'Render data.panchang.tithi, nakshatra, yoga and karana.',
  ],
  chart: [
    'Build a Lahiri birth chart with optional Dasha periods.',
    'Use data.charts for divisions, ascendant, planets and houses. Show data.vimshottariDasha when requested.',
  ],
  'daily-panchang': [
    'Build a local daily Panchang calendar.',
    'Show data.date, sunrise, sunset, tithi, nakshatra, yoga, karanas and rahuKalam.',
  ],
  match: [
    'Compare two birth profiles in a compatibility view.',
    'Show data.score out of data.maxScore, followed by data.factors.',
  ],
  'chart-image': [
    'Show a North, South or East Indian chart in an app.',
    'Use data.contentType and data.imageBase64 to render the image.',
  ],
  places: [
    'Let a user select a birthplace and time zone.',
    'Render data.places as suggestions and keep the selected coordinates and time zone.',
  ],
  'western-chat': [
    'Add a Western astrology question form.',
    'Display data.result.reply and prompt for birth details when needs_birth_data is true.',
  ],
  'western-natal': [
    'Show a Western birth chart.',
    'Show chart placements, houses and angles from data.result.',
  ],
  'western-natal-insights': [
    'Explain the main patterns in a Western birth chart.',
    'Use the natal interpretation returned by the operation.',
  ],
  'western-chart-similarity': [
    'Compare a birth chart with a ranked set of similar charts.',
    'Display the ranked matches and their scores from data.result.',
  ],
  'western-ephemeris': [
    'Show planetary motion for selected dates.',
    'Display the dates and planetary positions from data.result.',
  ],
  'western-astrocartography': [
    'Draw planetary lines on a world map.',
    'Draw the returned GeoJSON in WGS84 longitude, latitude order.',
  ],
  'western-astrocartography-parans': [
    'Show planetary crossing zones on a map.',
    'Draw returned GeoJSON bands in longitude, latitude order and label the planetary pairs.',
  ],
  'western-astrocartography-relocation': [
    'Compare a birth chart at a destination city.',
    'Display the relocated chart and relocation summary from data.result.',
  ],
  'western-astrocartography-recommendations': [
    'Rank destinations for a selected focus.',
    'Display destination names, ranking and scores from data.result.',
  ],
  'western-astrocartography-city': [
    'Review a single destination in a relocation view.',
    'Display the city and focus scores from data.result.',
  ],
  'western-wedding-electional': [
    'Compare candidate wedding times.',
    'Display each candidate time and its rationale when the operation is available.',
  ],
  'western-sun-sign': ['Add a Sun sign profile card.', 'Show the Sun sign from data.result.'],
  'western-moon-sign': ['Add a Moon sign profile card.', 'Show the Moon sign from data.result.'],
  'western-rising-sign': [
    'Add a rising sign to a profile.',
    'Show the ascendant sign from data.result.',
  ],
  'western-midheaven-sign': [
    'Show the Midheaven sign on a chart profile.',
    'Show the Midheaven sign from data.result.',
  ],
  'western-transits': [
    'Compare current sky positions with a natal chart.',
    'Show the transiting bodies and natal aspects from data.result.',
  ],
  'western-transit-timeline': [
    'Show transits across a date range.',
    'Plot dated transit windows when the operation is available.',
  ],
  'western-transit-insights': [
    'Explain upcoming transit themes.',
    'Display dated interpretation windows when the operation is available.',
  ],
  'western-profections': [
    'Show the annual profection for a birth chart.',
    'Display the activated house and time lord from data.result.',
  ],
  'western-primary-directions': [
    'Show primary direction events across a period.',
    'List the direction events and dates returned in data.result.',
  ],
  'western-secondary-progressions': [
    'Show a progressed chart on a target date.',
    'Use the progressed chart from data.result.',
  ],
  'western-progressions-calendar': [
    'Build a calendar of progression events.',
    'Display dated progression events from data.result.',
  ],
  'western-solar-return': [
    'Show a yearly Solar return chart.',
    'Display the return moment and chart from data.result.',
  ],
  'western-planetary-return': [
    'Find the next or selected return of a planet.',
    'Display the returned body, event moment and chart from data.result.',
  ],
  'western-synastry': ['Compare two natal charts.', 'Show cross-chart aspects from data.result.'],
  'western-synastry-cards': [
    'Build a card view for relationship chart insights.',
    'Render the returned cards from data.result.',
  ],
  'western-daily-sign': [
    'Show a daily horoscope for a zodiac sign.',
    'Render the sign and forecast returned in data.result.',
  ],
  'western-daily-personal': [
    'Build a daily forecast from a birth profile.',
    'Render the date and interpretation returned in data.result.',
  ],
  'western-weekly-personal': [
    'Build a week view of a personal forecast.',
    'Display the period and forecast entries from data.result.',
  ],
  'western-couples-horoscope': [
    'Show a daily forecast for two people.',
    'Display the date and relationship forecast from data.result.',
  ],
  'western-natal-image': ['Embed a Western natal chart image.', ''],
  'western-transit-image': ['Embed a chart overlay of natal and transit positions.', ''],
  'western-solar-return-image': ['Embed a Solar return chart.', ''],
  'western-progressions-image': ['Embed a secondary progressions chart.', ''],
  'western-synastry-image': ['Embed a two-person synastry chart.', ''],
  'western-composite-image': ['Embed a composite relationship chart.', ''],
  'numerology-profile': [
    'Generate a numerology profile from a birth date and chosen method.',
    'Render the calculated numerology profile from data.result.',
  ],
  'vedic-chat': [
    'Add a Vedic astrology question form.',
    'Display data.result.reply and prompt for birth details when needs_birth_data is true.',
  ],
  'vedic-natal': [
    'Build a sidereal natal chart.',
    'Display ascendant, planetary placements and houses from data.result.',
  ],
  'vedic-full-chart': [
    'Combine Vedic chart calculations in one request.',
    'Render the returned chart and any requested modules from data.result.',
  ],
  'vedic-kp': [
    'Show a Krishnamurti Paddhati chart.',
    'Show KP planetary and cusp placements from data.result.',
  ],
  'vedic-kp-image': ['Embed a KP chart image.', ''],
  'vedic-dasha': [
    'Display Vimshottari periods for a birth chart.',
    'Render the periods and dates from data.result.',
  ],
  'vedic-dasha-insights': [
    'Explain a person’s Dasha periods.',
    'Show period dates and interpretation from data.result.',
  ],
  'vedic-gochar': [
    'Build a dated Vedic transit calendar.',
    'Display Gochar intervals from data.result.',
  ],
  'vedic-gochar-insights': [
    'Explain Vedic transit windows.',
    'Display the transit dates and interpretation in data.result.',
  ],
  'vedic-daily-personal': [
    'Display a Vedic forecast using birth details.',
    'Render the personalized forecast from data.result.',
  ],
  'vedic-daily-sign': [
    'Show the daily Rashifal for one sign.',
    'Display the requested sign and its forecast from data.result.',
  ],
  'vedic-daily-bulk': [
    'Build a daily Rashifal view for all signs.',
    'List the forecasts by sign from data.result.',
  ],
  'vedic-yogas': [
    'Show the yogas detected in a birth chart.',
    'Render yoga names and descriptions from data.result.',
  ],
  'vedic-strength': [
    'Compare strengths across planets.',
    'Render the planetary strength measures from data.result.',
  ],
  'vedic-vargas': [
    'Let a reader switch between divisional charts.',
    'Render the requested chart divisions from data.result.',
  ],
  'vedic-muhurat': [
    'Look up auspicious timing for a date and location.',
    'Display the returned timing details from data.result.',
  ],
  'vedic-muhurat-search': [
    'Search for Muhurat windows across a date range.',
    'List candidate times and the returned context from data.result.',
  ],
  'vedic-personalized-muhurat': [
    'Find Muhurat windows for a specific birth profile.',
    'Display the candidate windows from data.result.',
  ],
  'vedic-compatibility': [
    'Compare two profiles using Moon placements.',
    'Display compatibility scores and factors from data.result.',
  ],
  'moon-phase': [
    'Add a Moon phase card for a day.',
    'Display phase and illumination from data.result.',
  ],
  'moon-timeline': [
    'Build a monthly calendar of lunar phases.',
    'Render data.result.days with calendar_date, phase.name, illumination (0–1) and next_phases.',
  ],
  'sky-events': [
    'Build a calendar of upcoming sky events.',
    'List the events and their times from data.result.',
  ],
};

const coreNotes: Record<string, string> = {
  positions:
    'datetime must be ISO 8601 with seconds and a UTC offset. Optional ayanamsaDegrees overrides the approximate sidereal offset. The default is a linear Lahiri approximation.',
  panchang:
    'datetime must be ISO 8601 with seconds and a UTC offset. Optional ayanamsaDegrees overrides the approximate sidereal offset. The default is a linear Lahiri approximation.',
  chart:
    'Provide birth with an ISO 8601 datetime including an offset and seconds set to 00, latitude/longitude in decimal degrees, and an IANA timezone matching the offset. Optional divisions are 1 and/or 9. If dashaLevels is greater than zero, include referenceDate as YYYY-MM-DD.',
  'daily-panchang':
    'Provide a local date (YYYY-MM-DD), latitude and longitude in decimal degrees, and an IANA timezone.',
  match:
    'Provide person1 and person2. Each needs an ISO 8601 datetime with seconds set to 00 and an offset matching the IANA timezone, plus latitude and longitude in decimal degrees.',
  'chart-image':
    'Provide birth with an offset-aware ISO datetime (seconds set to 00), decimal latitude/longitude, and an IANA timezone matching the offset. Optionally choose divisions 1 and/or 9 and layout north, south, or east.',
  places:
    'Provide a query of 2–100 characters. Optional country is a two-letter uppercase country code. Optional limit is 1–10. Keep the attribution from data.attribution when displaying place data.',
  'moon-timeline':
    'Provide integer year (1900–2100) and month (1–12). Optional tz_str is an IANA time zone and defaults to UTC.',
};

const coreSamples: Record<string, unknown> = {
  positions: samples.positions,
  panchang: samples.panchang,
  'moon-timeline': samples['moon-timeline'],
  chart: {
    data: {
      operation: 'chart',
      charts: [{ division: 1, ascendant: { house: 1 }, planets: [], houses: [] }],
    },
    calculated: true,
  },
  'daily-panchang': {
    data: {
      operation: 'daily-panchang',
      date: '2026-11-12',
      timezone: 'Asia/Kolkata',
      sunrise: '06:42',
      sunset: '17:28',
    },
    calculated: true,
  },
  match: { data: { operation: 'match', score: 25, maxScore: 36, factors: [] }, calculated: true },
  places: {
    data: {
      operation: 'places',
      places: [
        { name: 'New Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
      ],
    },
    calculated: true,
  },
};
// Last published Mantrilo catalog. The workspace's runtime list overrides it where present.
const publishedCatalog = published as Operation[];

export function astrologyGuides(configured: Operation[] = []): Guide[] {
  const runtime = new Map(configured.map((operation) => [operation.id, operation]));
  const all = [
    ...publishedCatalog,
    ...configured.filter((op) => !publishedCatalog.some((row) => row.id === op.id)),
  ];
  return all.map((publishedOp) => {
    const op = runtime.get(publishedOp.id) ?? publishedOp;
    const { id, name } = op;
    const input = op.example ?? coreInputs[id] ?? {};
    const body = { ...input, operation: id };
    const image = id === 'chart-image' || id.endsWith('-image');
    const [summary, render] = display[id] ?? [op.description, 'Inspect the calculation response.'];
    const exampleParameters =
      'parameters' in input && input.parameters && typeof input.parameters === 'object'
        ? Object.keys(input.parameters)
        : [];
    const hasBirth =
      JSON.stringify(input).includes('"hour"') || JSON.stringify(input).includes('"datetime"');
    const inputText =
      coreNotes[id] ??
      [
        exampleParameters.length
          ? 'Send these sample parameters under parameters: ' + exampleParameters.join(', ') + '.'
          : 'Send an empty parameters object for the default request.',
        hasBirth
          ? 'Use the birth shape shown in the request. For split fields, year/month/day are local calendar integers and hour/minute are local 24-hour time. lat/lng are decimal degrees and tz_str is an IANA time zone or AUTO where shown. Nested datetime and location objects follow the sample.'
          : '',
        'The request uses synthetic inputs where applicable. The sample includes optional settings when relevant.',
      ]
        .filter(Boolean)
        .join(' ');
    const excerpt = astrologyExcerpts[id];
    const verifiedSample = ['positions', 'panchang', 'moon-timeline'].includes(id);
    const sample = image
      ? {
          data: {
            operation: id,
            contentType: 'image/png',
            imageBase64: '<PNG bytes encoded as base64>',
          },
          calculated: true,
        }
      : (coreSamples[id] ?? {
          data: { operation: id, result: excerpt?.result ?? {} },
          calculated: true,
        });
    const sampleLabel = verifiedSample
      ? 'Verified sandbox response excerpt'
      : image || id in coreSamples || excerpt
        ? 'Illustrative response excerpt'
        : 'Response envelope · operation payload omitted';
    return {
      id: 'astrology-' + id,
      name,
      area: 'Astrology',
      category: op.category ?? 'Core astrology',
      summary,
      method: 'POST',
      path: calculationPath,
      body,
      inputs: inputText,
      sample,
      sampleLabel,
      render: image
        ? 'Use data.contentType and data.imageBase64 to render the chart as a data URI.'
        : excerpt
          ? render + ' Example field: data.result.' + excerpt.field + '.'
          : render,
      viewCode: image
        ? 'document.querySelector("img").src = `data:${data.contentType};base64,${data.imageBase64}`;'
        : id === 'positions'
          ? 'const planets = data.planets.map(p => ({ body: p.body, rashi: p.rashi }));'
          : id === 'moon-timeline'
            ? 'const days = data.result.days.map(day => ({ date: day.calendar_date, phase: day.phase.name }));'
            : id === 'chart'
              ? 'const charts = data.charts;'
              : id === 'panchang'
                ? 'const tithi = data.panchang.tithi;'
                : id === 'daily-panchang'
                  ? 'const { sunrise, sunset, tithi } = data;'
                  : id === 'match'
                    ? 'const score = `${data.score}/${data.maxScore}`;'
                    : id === 'places'
                      ? 'const choices = data.places;'
                      : excerpt
                        ? 'const value = data.result?.' + excerpt.field.split('.').join('?.') + ';'
                        : 'const result = data.result; // Bind the returned fields to this feature’s view.',
      usage: oneRequest,
      limited: op.availability === 'limited',
      library: { type: 'astrology', item: id },
    };
  });
}

export function curl(guide: Guide, base: string) {
  const header =
    'curl --fail-with-body ' +
    (guide.body ? '-X POST ' : '') +
    "'" +
    base +
    guide.path +
    '\' \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY"';
  return guide.body
    ? header +
        " \\\n  -H 'Content-Type: application/json' \\\n  --data '" +
        JSON.stringify(guide.body).replaceAll("'", "'\\''") +
        "'"
    : header;
}

export function backendExample(guide: Guide, base: string) {
  const call = guide.body
    ? 'return mantrilo(' +
      JSON.stringify(guide.path) +
      ', { ...input, operation: ' +
      JSON.stringify(guide.library.item) +
      ' });'
    : 'return mantrilo(' + JSON.stringify(guide.path) + ');';
  return `// server.mjs · Node.js 22+
import { createServer } from 'node:http';

const apiKey = process.env.MANTRILO_API_KEY;
if (!apiKey) throw new Error('Set MANTRILO_API_KEY on your server.');
const base = process.env.MANTRILO_API_URL ?? ${JSON.stringify(base)};

async function mantrilo(path, input) {
  const response = await fetch(base + path, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      ...(input ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error('Mantrilo request failed'), {
    status: response.status, requestId: result.requestId,
  });
  return result;
}

async function load(incoming${guide.body ? ', input' : ''}) {
  ${(guide.serverFlow ?? call).replaceAll('\n', '\n  ')}
}

createServer(async (req, res) => {
  const incoming = new URL(req.url, 'http://localhost');
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== '${guide.method}' || incoming.pathname !== '/api/mantrilo-guide') {
    res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  try {
${
  guide.body
    ? `    let text = '';
    for await (const chunk of req) {
      text += chunk;
      if (Buffer.byteLength(text) > 16384) {
        res.writeHead(413).end(JSON.stringify({ error: 'Input is too large' }));
        return;
      }
    }
    let input;
    try { input = JSON.parse(text); } catch { input = null; }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      res.writeHead(400).end(JSON.stringify({ error: 'Send a JSON object' }));
      return;
    }
`
    : ''
}    const result = await load(incoming${guide.body ? ', input' : ''});
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(error.status ?? 502).end(JSON.stringify({
      error: 'Could not load this content',
      requestId: error.requestId,
    }));
  }
}).listen(3000, '127.0.0.1');`;
}
