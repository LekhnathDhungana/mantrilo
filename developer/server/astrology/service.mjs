import { moonTimeline } from './moon-timeline.mjs';
import { ApiError, insist } from '../domain.mjs';
import {
  catalogOperation,
  catalogOperations,
  catalogRequest,
  publicAstrologyResult,
} from './catalog.mjs';
import {
  ascendantLongitude,
  calculate,
  ENGINE_VERSION,
  OPERATIONS,
  RASHIS,
  tropicalLongitude,
  validateInput,
  ZODIAC_SIGNS,
} from './engine.mjs';

export const VEDIC_VERSION = 'mantrilo-vedic-1';
const VEDIC_OPERATIONS = [
  {
    id: 'chart',
    name: 'Vedic birth chart',
    description: 'Lahiri D1, D9 and optional Vimshottari Dasha.',
  },
  {
    id: 'daily-panchang',
    name: 'Daily Panchang',
    description: 'Sunrise, sunset, transitions and Rahu Kalam for a location and local date.',
  },
  {
    id: 'match',
    name: 'Guna Milan',
    description: 'Ashtakoota compatibility scores for two birth profiles.',
  },
  {
    id: 'chart-image',
    name: 'Vedic chart image',
    description: 'A PNG in a North, South or East Indian layout.',
  },
  {
    id: 'signs',
    name: 'Zodiac and Vedic signs',
    description: 'Sun, Moon and Rising signs, plus Rashi, Lagna, Vedic Sun sign and Nakshatra.',
  },
  {
    id: 'places',
    name: 'Find a place',
    description: 'Coordinates and time zones for cities and districts.',
  },
];

const settings = { ayanamsha: 'lahiri', house_system: 'whole_sign', node_type: 'mean' };
const origin = 'https://api.freeastroapi.com';
const datePattern = /^(?:19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/;

function calendarDate(value) {
  insist(
    typeof value === 'string' && datePattern.test(value),
    400,
    'invalid_date',
    'Use a date from 1900 through 2100 in YYYY-MM-DD format.',
  );
  const date = new Date(value + 'T00:00:00Z');
  insist(
    !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value,
    400,
    'invalid_date',
    'Use a valid calendar date.',
  );
  return value.split('-').map(Number);
}

function fields(value, allowed) {
  insist(
    value && typeof value === 'object' && !Array.isArray(value),
    400,
    'invalid_input',
    'Provide a JSON object.',
  );
  insist(
    Object.keys(value).every((key) => allowed.includes(key)),
    400,
    'unsupported_field',
    'The request contains a field this operation does not accept.',
  );
}

const locationFields = ['latitude', 'longitude', 'timezone'];
function location({ latitude, longitude, timezone }) {
  insist(
    Number.isFinite(latitude) &&
      Math.abs(latitude) <= 90 &&
      Number.isFinite(longitude) &&
      Math.abs(longitude) <= 180,
    400,
    'invalid_coordinates',
    'Provide numeric latitude and longitude in degrees.',
  );
  let clock;
  try {
    if (
      typeof timezone === 'string' &&
      /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+)$/.test(timezone)
    )
      clock = new Intl.DateTimeFormat('sv-SE', {
        timeZone: timezone,
        dateStyle: 'short',
        timeStyle: 'medium',
        hourCycle: 'h23',
      });
  } catch {
    // Intl rejects unknown time zone IDs.
  }
  insist(clock, 400, 'invalid_timezone', 'Provide an IANA time zone such as Asia/Kolkata.');
  return { lat: latitude, lng: longitude, tz_str: timezone, clock };
}

function birth(input) {
  fields(input, ['datetime', ...locationFields]);
  const { datetime } = input;
  insist(
    typeof datetime === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:Z|[+-]\d{2}:\d{2})$/.test(datetime),
    400,
    'invalid_datetime',
    'Use an ISO birth date and time with seconds set to 00 and an explicit UTC offset.',
  );
  const { date } = validateInput({ operation: 'positions', datetime });
  const [year, month, day] = calendarDate(datetime.slice(0, 10));
  const { clock, ...geo } = location(input);
  const wallTime = datetime.slice(0, 19).replace('T', ' ');
  insist(
    clock.format(date) === wallTime,
    400,
    'invalid_local_time',
    'The birth time and UTC offset must agree with the time zone.',
  );
  const wallUtc = Date.parse(wallTime.replace(' ', 'T') + 'Z');
  for (const direction of [-1, 1]) {
    const nearby = +date + direction * 86_400_000;
    const nearbyWall = Date.parse(clock.format(nearby).replace(' ', 'T') + 'Z');
    const alternate = wallUtc - (nearbyWall - nearby);
    insist(
      alternate === +date || clock.format(alternate) !== wallTime,
      400,
      'ambiguous_local_time',
      'This birth time occurs twice in the specified time zone.',
    );
  }
  const hour = Number(datetime.slice(11, 13)),
    minute = Number(datetime.slice(14, 16));
  return { year, month, day, hour, minute, ...geo, ...settings };
}

function divisions(value = [1, 9]) {
  insist(
    Array.isArray(value) &&
      value.length >= 1 &&
      value.length <= 2 &&
      new Set(value).size === value.length &&
      value.every((item) => item === 1 || item === 9),
    400,
    'invalid_divisions',
    'Choose D1 (1), D9 (9), or both.',
  );
  return value;
}

const layouts = { north: 'north_indian', south: 'south_indian', east: 'east_indian' };
const invalidResponse = () =>
  new ApiError(
    502,
    'astrology_invalid_response',
    'Mantrilo could not read the calculation result.',
  );
function requireResult(condition) {
  if (!condition) throw invalidResponse();
}

const sign = (row) => ({ number: row.sign_id, name: row.sign });
function placement(row) {
  return {
    ...(row.name ? { body: row.name } : {}),
    rashi: sign(row),
    house: row.house ?? null,
    siderealLongitudeDegrees: row.absolute_degree ?? row.degree ?? null,
    degreesWithinRashi: row.degree_in_sign ?? null,
    retrograde: row.is_retrograde ?? null,
    nakshatra:
      typeof row.nakshatra === 'string'
        ? {
            number: row.nakshatra_id,
            name: row.nakshatra,
            pada: row.pada,
            lord: row.nakshatra_lord,
          }
        : row.nakshatra
          ? lunarLabel(row.nakshatra)
          : null,
  };
}

function chart(raw, division) {
  requireResult(
    Number.isInteger(raw?.ascendant?.sign_id) &&
      Array.isArray(raw.planets) &&
      raw.planets.length > 0 &&
      Array.isArray(raw.houses) &&
      raw.houses.length === 12,
  );
  return {
    division,
    ascendant: { ...placement(raw.ascendant), house: 1 },
    planets: raw.planets.map(placement),
    houses: raw.houses.map((row) => ({
      number: row.house,
      rashi: {
        number: row.sign_id ?? ((raw.ascendant.sign_id + row.house - 2) % 12) + 1,
        name: row.sign,
      },
    })),
  };
}
const lunarLabel = (row) => ({
  number: row.number ?? row.id,
  name: row.name,
  ...(row.pada !== undefined ? { pada: row.pada } : {}),
  ...(row.lord !== undefined ? { lord: row.lord } : {}),
  ...(row.paksha !== undefined ? { paksha: row.paksha } : {}),
});
const transition = (row) => ({ ...lunarLabel(row), endsAt: row.ends_at_iso ?? null });
function period(row) {
  return {
    level: row.level,
    lord: row.lord,
    start: row.start,
    end: row.end,
    durationYears: row.duration_years,
    ...(Array.isArray(row.sub_periods) ? { subPeriods: row.sub_periods.map(period) } : {}),
  };
}

function vedicChart(raw, requested, dashaLevels, referenceDate, timezone) {
  const charts = requested.map((division) =>
    chart(division === 1 ? raw?.chart : raw?.vargas?.vargas?.D9, division),
  );
  const dasha = raw.vimshottari_dasha;
  requireResult(
    !dashaLevels ||
      (dasha?.birth_balance &&
        Array.isArray(dasha.timeline) &&
        Array.isArray(dasha.active_periods)),
  );
  return {
    timezone,
    ayanamsa: 'lahiri',
    houseSystem: 'whole_sign',
    nodeType: 'mean',
    charts,
    ...(dashaLevels
      ? {
          vimshottariDasha: {
            referenceDate,
            birthBalance: {
              lord: dasha.birth_balance.lord,
              end: dasha.birth_balance.end,
              remainingYears: dasha.birth_balance.remaining_years,
            },
            activePeriods: dasha.active_periods.map(period),
            timeline: dasha.timeline.map(period),
          },
        }
      : {}),
  };
}

function dailyPanchang(raw, date, timezone) {
  requireResult(
    raw?.date === date &&
      typeof raw.sunrise === 'string' &&
      typeof raw.sunset === 'string' &&
      raw.tithi &&
      raw.nakshatra &&
      raw.yoga &&
      Array.isArray(raw.karanas) &&
      raw.rahu_kalam,
  );
  return {
    date,
    timezone,
    basis: 'local_sunrise',
    sunrise: raw.sunrise,
    sunset: raw.sunset,
    tithi: transition(raw.tithi),
    nakshatra: transition(raw.nakshatra),
    yoga: transition(raw.yoga),
    karanas: raw.karanas.map(transition),
    rahuKalam: { start: raw.rahu_kalam.start, end: raw.rahu_kalam.end },
  };
}

function compatibility(raw) {
  const scores = raw?.ashtakoota;
  requireResult(
    Number.isFinite(scores?.score) &&
      scores.max_score === 36 &&
      Array.isArray(scores.kootas) &&
      scores.kootas.length === 8,
  );
  return {
    score: scores.score,
    maxScore: scores.max_score,
    factors: scores.kootas.map((row) => ({
      id: row.id,
      name: row.name,
      score: row.score,
      maxScore: row.max_score,
    })),
  };
}

/** Converts a local date ("1995-06-20") and time ("12:30") in an IANA zone to an ISO date-time
 * with that zone's UTC offset, or refuses a time the clocks skipped. */
export function zonedDateTime(date, time, timezone) {
  calendarDate(date);
  insist(
    typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time),
    400,
    'invalid_time',
    'Use a 24-hour time such as 14:30.',
  );
  const { clock } = location({ latitude: 0, longitude: 0, timezone });
  const wall = Date.parse(`${date}T${time}:00Z`);
  const offsetAt = (instant) => Date.parse(clock.format(instant).replace(' ', 'T') + 'Z') - instant;
  let instant = wall - offsetAt(wall);
  instant = wall - offsetAt(instant);
  insist(
    clock.format(instant) === `${date} ${time}:00`,
    400,
    'invalid_local_time',
    'That time did not exist in this time zone, because the clocks moved forward.',
  );
  const minutes = Math.round(offsetAt(instant) / 60_000),
    absolute = Math.abs(minutes),
    pad = (value) => String(value).padStart(2, '0');
  return `${date}T${time}:00${minutes < 0 ? '-' : '+'}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

const zodiac = (longitude) => {
  const index = Math.floor(longitude / 30);
  return {
    number: index + 1,
    name: ZODIAC_SIGNS[index],
    degreesWithinSign: Math.round((longitude - index * 30) * 100) / 100,
  };
};
const rashi = (number) => ({
  number,
  name: RASHIS[number - 1],
  english: ZODIAC_SIGNS[number - 1],
});
const vedicPlacement = (row) => ({
  rashi: rashi(row.rashi.number),
  degreesWithinRashi:
    typeof row.degreesWithinRashi === 'number'
      ? Math.round(row.degreesWithinRashi * 100) / 100
      : null,
  nakshatra: row.nakshatra
    ? {
        number: row.nakshatra.number,
        name: row.nakshatra.name,
        pada: row.nakshatra.pada ?? null,
        lord: row.nakshatra.lord ?? null,
      }
    : null,
});

/** Builds the signs result from the provider's Lahiri D1 chart and local tropical positions. */
function signsResult(raw, birthDate, place, timeKnown, dayBounds) {
  const d1 = chart(raw?.chart, 1);
  const body = (name) => d1.planets.find((row) => row.body?.toLowerCase() === name);
  const sun = body('sun'),
    moon = body('moon');
  requireResult(
    sun?.rashi?.number >= 1 &&
      sun.rashi.number <= 12 &&
      moon?.rashi?.number >= 1 &&
      moon.rashi.number <= 12,
  );
  const western = {
    zodiac: 'tropical',
    sun: zodiac(tropicalLongitude('Sun', birthDate)),
    moon: zodiac(tropicalLongitude('Moon', birthDate)),
    rising: timeKnown ? zodiac(ascendantLongitude(birthDate, place.lat, place.lng)) : null,
  };
  const vedic = {
    zodiac: 'sidereal',
    ayanamsa: 'lahiri',
    sun: vedicPlacement(sun),
    moon: vedicPlacement(moon),
    lagna: timeKnown ? vedicPlacement(d1.ascendant) : null,
  };
  if (!timeKnown) {
    // Without a birth time the Moon's sign is only certain if it stays in one sign all day.
    const [start, end] = dayBounds.map((instant) => zodiac(tropicalLongitude('Moon', instant)));
    if (start.number !== end.number) western.moon.possible = [start.name, end.name];
  }
  return { datetime: place.datetime, timezone: place.tz_str, timeKnown, western, vedic };
}

async function boundedBody(response, maxBytes) {
  if (Number(response.headers.get('content-length')) > maxBytes || !response.body) {
    await response.body?.cancel();
    throw invalidResponse();
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maxBytes) throw invalidResponse();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

export function createAstrologyService({
  key,
  fetcher = fetch,
  timeoutMs = 8000,
  limited = [],
} = {}) {
  const configured = Boolean(key?.trim());
  const unavailable = new Set(limited);
  const operations = configured
    ? [
        ...OPERATIONS,
        ...VEDIC_OPERATIONS,
        ...catalogOperations.map((item) => ({
          ...item,
          availability: unavailable.has(item.id) ? 'limited' : 'available',
        })),
      ]
    : OPERATIONS;

  async function request(path, payload, format = 'json', requestTimeout = timeoutMs) {
    if (!configured)
      throw new ApiError(
        503,
        'astrology_unavailable',
        'This calculation is temporarily unavailable.',
      );
    try {
      const response = await fetcher(
        origin + (path.startsWith('/api/') ? path : '/api/v2' + path),
        {
          method: payload ? 'POST' : 'GET',
          headers: {
            'x-api-key': key.trim(),
            ...(payload ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(payload ? { body: JSON.stringify(payload) } : {}),
          redirect: 'error',
          signal: AbortSignal.timeout(requestTimeout),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 400 || response.status === 422)
          throw new ApiError(
            422,
            'calculation_failed',
            'The calculation could not be completed for these inputs.',
          );
        throw new ApiError(
          503,
          'astrology_unavailable',
          'This calculation is temporarily unavailable.',
        );
      }
      const body = await boundedBody(response, format === 'png' ? 2_000_000 : 4_000_000);
      if (format === 'png') {
        requireResult(
          response.headers.get('content-type')?.split(';')[0] === 'image/png' &&
            body.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
        );
        return body.toString('base64');
      }
      return JSON.parse(body.toString('utf8'));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError')
        throw new ApiError(504, 'astrology_timeout', 'The calculation took too long. Try again.');
      throw new ApiError(
        502,
        'astrology_invalid_response',
        'Mantrilo could not complete the calculation.',
      );
    }
  }

  function prepare(input) {
    const operation = input?.operation;
    if (OPERATIONS.some(({ id }) => id === operation)) {
      validateInput(input);
      return { operation, run: () => calculate(input) };
    }
    const catalog = catalogOperation(operation);
    insist(
      catalog || VEDIC_OPERATIONS.some(({ id }) => id === operation),
      400,
      'invalid_operation',
      'Choose a supported astrology operation.',
    );
    const wrap = (run) => ({
      operation,
      async run() {
        try {
          return { operation, engineVersion: VEDIC_VERSION, ...(await run()) };
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw invalidResponse();
        }
      },
    });
    if (catalog) {
      fields(input, ['operation', 'parameters']);
      insist(
        !unavailable.has(operation),
        503,
        'astrology_operation_unavailable',
        'This operation is currently unavailable on Mantrilo API.',
      );
      const {
        route,
        payload,
        format,
        timeoutMs: requestTimeout,
      } = catalogRequest(catalog, input.parameters);
      if (operation === 'moon-timeline')
        return wrap(() => ({ result: moonTimeline(input.parameters) }));
      return wrap(async () => {
        const result = await request(route, payload, format, requestTimeout);
        if (catalog.image) return { contentType: 'image/png', imageBase64: result };
        requireResult(result && typeof result === 'object');
        if (catalog.chat) {
          requireResult(typeof result.reply === 'string');
          return {
            result: publicAstrologyResult({
              reply: result.reply,
              needs_birth_data: Boolean(result.needs_birth_data),
              ...(result.required_profile ? { required_profile: result.required_profile } : {}),
            }),
          };
        }
        return { result: publicAstrologyResult(result) };
      });
    }
    if (operation === 'places') {
      fields(input, ['operation', 'query', 'country', 'limit']);
      const query = typeof input.query === 'string' ? input.query.trim() : '';
      const { country, limit = 5 } = input;
      insist(
        query.length >= 2 &&
          query.length <= 100 &&
          (country === undefined || (typeof country === 'string' && /^[A-Z]{2}$/.test(country))) &&
          Number.isInteger(limit) &&
          limit >= 1 &&
          limit <= 10,
        400,
        'invalid_place_query',
        'Use a place name, an optional two-letter uppercase country code and a limit from 1 to 10.',
      );
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        ...(country ? { country } : {}),
      });
      return wrap(async () => {
        const result = await request('/geo/search?' + params);
        requireResult(Array.isArray(result?.results));
        return {
          attribution: { name: 'GeoNames', url: 'https://www.geonames.org/', license: 'CC BY 4.0' },
          places: result.results.map((row) => ({
            name: row.name,
            country: row.country,
            state: row.state ?? null,
            district: row.district ?? null,
            latitude: row.lat,
            longitude: row.lng,
            timezone: row.timezone,
          })),
        };
      });
    }
    if (operation === 'daily-panchang') {
      fields(input, ['operation', 'date', ...locationFields]);
      const [year, month, day] = calendarDate(input.date);
      const { clock, ...geo } = location(input);
      return wrap(async () =>
        dailyPanchang(
          await request('/vedic/panchang', {
            year,
            month,
            day,
            hour: 12,
            minute: 0,
            ...geo,
            ayanamsha: 'lahiri',
          }),
          input.date,
          geo.tz_str,
        ),
      );
    }
    if (operation === 'match') {
      fields(input, ['operation', 'person1', 'person2']);
      const payload = { person1: birth(input.person1), person2: birth(input.person2) };
      return wrap(async () => compatibility(await request('/vedic/match', payload)));
    }
    if (operation === 'signs') {
      fields(input, ['operation', 'birth', 'timeKnown']);
      const { timeKnown = true } = input;
      insist(
        typeof timeKnown === 'boolean',
        400,
        'invalid_time_known',
        'timeKnown must be true or false.',
      );
      const natal = birth(input.birth);
      const birthDate = new Date(input.birth.datetime);
      const day = input.birth.datetime.slice(0, 10);
      const dayBounds = timeKnown
        ? null
        : ['00:00', '23:59'].map((time) => new Date(zonedDateTime(day, time, natal.tz_str)));
      const payload = {
        ...natal,
        vargas: [1],
        dasha_levels: 0,
        include_yogas: false,
        include_panchang: false,
        include_shadbala: false,
        include_ashtakavarga: false,
      };
      return wrap(async () =>
        signsResult(
          await request('/vedic/calculate', payload),
          birthDate,
          { ...natal, datetime: input.birth.datetime },
          timeKnown,
          dayBounds,
        ),
      );
    }
    if (operation === 'chart-image') {
      fields(input, ['operation', 'birth', 'divisions', 'layout']);
      const { layout = 'north' } = input;
      insist(
        typeof layout === 'string' && Object.hasOwn(layouts, layout),
        400,
        'invalid_layout',
        'Choose north, south or east.',
      );
      const requested = divisions(input.divisions);
      const payload = {
        ...birth(input.birth),
        divisions: requested,
        chart_style: layouts[layout],
        format: 'png',
        size: 700,
      };
      return wrap(async () => ({
        layout,
        divisions: requested,
        contentType: 'image/png',
        imageBase64: await request('/vedic/visual/chart', payload, 'png'),
      }));
    }
    fields(input, ['operation', 'birth', 'divisions', 'dashaLevels', 'referenceDate']);
    const requested = divisions(input.divisions);
    const { dashaLevels = 0, referenceDate } = input;
    insist(
      Number.isInteger(dashaLevels) && dashaLevels >= 0 && dashaLevels <= 3,
      400,
      'invalid_dasha_levels',
      'Choose a Dasha depth from 0 to 3.',
    );
    if (dashaLevels || referenceDate !== undefined) calendarDate(referenceDate);
    const natal = birth(input.birth);
    const payload = {
      ...natal,
      vargas: requested,
      dasha_levels: dashaLevels,
      ...(referenceDate ? { reference_date: referenceDate } : {}),
      include_yogas: false,
      include_panchang: false,
      include_shadbala: false,
      include_ashtakavarga: false,
    };
    return wrap(async () =>
      vedicChart(
        await request('/vedic/calculate', payload),
        requested,
        dashaLevels,
        referenceDate,
        natal.tz_str,
      ),
    );
  }
  return { prepare, operations, engineVersion: configured ? VEDIC_VERSION : ENGINE_VERSION };
}
