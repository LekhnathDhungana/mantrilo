import * as Astronomy from 'astronomy-engine';
import { insist } from '../domain.mjs';

const dayMs = 86_400_000;
const phases = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];
const quarters = ['new_moon', 'first_quarter', 'full_moon', 'last_quarter'];

// Find the start of a civil date even when the clock skips midnight.
function startOfDate(format, utcDate, label) {
  let before = utcDate - dayMs * 2;
  let after = utcDate + dayMs * 2;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (format.format(middle) < label) before = middle;
    else after = middle;
  }
  return new Date(after);
}

export function moonTimeline({ year, month, tz_str: timezone = 'Etc/UTC', ...other }) {
  insist(
    Object.keys(other).length === 0,
    400,
    'invalid_parameters',
    'Use year, month and an optional IANA time zone.',
  );
  insist(
    Number.isInteger(year) &&
      year >= 1900 &&
      year <= 2100 &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12,
    400,
    'invalid_parameters',
    'Provide a year from 1900 to 2100 and a month from 1 to 12.',
  );
  let format;
  try {
    format = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    insist(false, 400, 'invalid_parameters', 'Provide a valid IANA time zone.');
  }

  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 1);
  const events = [];
  let event = Astronomy.SearchMoonQuarter(new Date(start - 36 * dayMs));
  while (event.time.date.getTime() <= end + 36 * dayMs) {
    events.push(event);
    event = Astronomy.NextMoonQuarter(event);
  }
  const days = [];
  for (let day = start; day < end; day += dayMs) {
    const label = new Date(day).toISOString().slice(0, 10);
    const date = startOfDate(format, day, label);
    if (format.format(date) !== label) continue;
    const angle = Astronomy.MoonPhase(date);
    const lastNew = events.findLast((q) => q.quarter === 0 && q.time.date <= date);
    days.push({
      calendar_date: label,
      timestamp: date.toISOString(),
      phase: {
        name: phases[Math.round(angle / 45) % phases.length],
        phase_angle_deg: angle,
        illumination: Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction,
        age_days: (date - lastNew.time.date) / dayMs,
        distance_km: Astronomy.EclipticGeoMoon(date).dist * Astronomy.KM_PER_AU,
        is_waxing: angle < 180,
      },
      next_phases: Object.fromEntries(
        quarters.map((name, index) => [
          name,
          events.find((q) => q.quarter === index && q.time.date > date).time.date.toISOString(),
        ]),
      ),
    });
  }
  return {
    year,
    month,
    month_name: new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'long' }).format(start),
    days_in_month: (end - start) / dayMs,
    calendar_basis: format.resolvedOptions().timeZone === 'UTC' ? 'utc' : 'local',
    calendar_timezone: timezone,
    days,
  };
}
