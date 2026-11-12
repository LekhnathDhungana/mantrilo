// Synthetic excerpts based on documented result shapes. These values are not calculated
// results for the sample request; the three captured sandbox results are kept separately.
const simpleSign = (point: string, sign_id: string, degree: number) => ({ point, sign_id, degree });
const dailyRashi = {
  sign: 'aries',
  rashi_label: 'Mesha',
  interpretation: { summary: 'Make time for a steady routine.' },
};

export const astrologyExcerpts: Record<string, { result: object; field: string }> = {
  'western-ephemeris': {
    result: {
      data: { timestamp: '2026-03-01T00:00:00Z', astrology: { retrograde_bodies: ['Mercury'] } },
    },
    field: 'data.astrology',
  },
  'western-astrocartography-parans': {
    result: {
      parans: [{ body_a: 'sun', body_b: 'jupiter', latitude: 24, strongest_focus: 'home' }],
    },
    field: 'parans',
  },
  'vedic-gochar-insights': {
    result: { facts: [], summary: {} },
    field: 'facts',
  },
  'vedic-personalized-muhurat': {
    result: { best_windows: [], best_moment: { score: 74, quality: 'acceptable' } },
    field: 'best_moment',
  },
  'western-primary-directions': {
    result: { events: [{ date: '2028-05-12', exact_datetime_utc: '2028-05-12T14:30:00Z' }] },
    field: 'events',
  },
  'western-secondary-progressions': { result: { progressed_chart: {} }, field: 'progressed_chart' },
  'western-progressions-calendar': {
    result: { window: { from: '2026-03-30T00:00:00Z', to: '2027-03-30T00:00:00Z' }, events: [] },
    field: 'events',
  },
  'western-astrocartography-recommendations': {
    result: {
      results: [{ city: { name: 'Lisbon' }, score: 63, summary: 'Several supportive indicators.' }],
    },
    field: 'results',
  },
  'western-astrocartography-city': {
    result: { focus_scores: { home: { score: 63 } } },
    field: 'focus_scores',
  },
  'numerology-profile': {
    result: { meta: { method: { system: 'pythagorean' } } },
    field: 'meta.method',
  },
  'vedic-gochar': {
    result: { windows: [{ kind: 'ingress', index_keys: [] }] },
    field: 'windows',
  },
  'vedic-daily-personal': {
    result: { scores: { overall: { score: 74 } } },
    field: 'scores.overall',
  },
  'western-chat': {
    result: {
      reply: 'Share your birth date, time and place to calculate your ascendant.',
      needs_birth_data: true,
    },
    field: 'reply',
  },
  'western-natal': {
    result: {
      planets: [{ id: 'sun', sign: 'Tau', abs_pos: 54, house: 9 }],
      houses: [{ house: 1, sign: 'Can' }],
    },
    field: 'planets',
  },
  'western-chart-similarity': {
    result: {
      matches: [{ score: 71, summary: { why_this_match: 'Several similar placements.' } }],
    },
    field: 'matches',
  },
  'western-astrocartography': {
    result: {
      lines: [
        {
          id: 'sun:mc',
          body: 'sun',
          angle: 'mc',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-72, 41],
              [-72, 42],
            ],
          },
        },
      ],
    },
    field: 'lines',
  },
  'western-sun-sign': { result: simpleSign('Sun', 'taurus', 24), field: 'sign_id' },
  'western-moon-sign': { result: simpleSign('Moon', 'virgo', 12), field: 'sign_id' },
  'western-rising-sign': { result: simpleSign('Ascendant', 'cancer', 9), field: 'sign_id' },
  'western-midheaven-sign': { result: simpleSign('Midheaven', 'aries', 14), field: 'sign_id' },
  'western-transits': {
    result: {
      transit_date: '2026-11-12',
      transit_planets: [{ id: 'sun', sign: 'Sco', abs_pos: 230 }],
    },
    field: 'transit_planets',
  },
  'western-profections': {
    result: {
      annual_profection: {
        target_year: 2026,
        age_at_start: 36,
        period: { start: '2026-05-15T12:00:00Z', end: '2027-05-15T12:00:00Z' },
      },
    },
    field: 'annual_profection',
  },
  'western-solar-return': {
    result: {
      meta: { solar_return: { target_year: 2026, exact_moment_utc: '2026-05-15T14:30:00Z' } },
    },
    field: 'meta.solar_return',
  },
  'western-planetary-return': {
    result: { meta: { return_event: { body: 'moon', exact_moment_utc: '2026-11-20T10:30:00Z' } } },
    field: 'meta.return_event',
  },
  'western-synastry': {
    result: { synastry: { aspects: [], house_overlays: [], highlights: [] } },
    field: 'synastry.aspects',
  },
  'western-synastry-cards': {
    result: {
      summary: {
        scores: { overall: 64, communication: 72 },
        archetype: { label: 'Steady Partnership' },
      },
    },
    field: 'summary',
  },
  'western-daily-sign': {
    result: { data: { sign: 'aries', date: '2026-11-12', scores: { overall: 72 } } },
    field: 'data',
  },
  'western-daily-personal': {
    result: { data: { date: '2026-11-12', scores: { overall: 72 } } },
    field: 'data',
  },
  'western-weekly-personal': {
    result: {
      data: {
        scores: { overall: 72 },
        content: { text: 'Set aside time for a project you want to finish.' },
      },
    },
    field: 'data.content.text',
  },
  'western-couples-horoscope': {
    result: { summary: { scores: { romance: 68, communication: 72 } } },
    field: 'summary.scores',
  },
  'vedic-chat': {
    result: {
      reply: 'Share your birth time and birthplace to calculate your lagna.',
      needs_birth_data: true,
    },
    field: 'reply',
  },
  'vedic-natal': {
    result: {
      ascendant: { sign: 'Leo', sign_id: 5 },
      planets: [{ name: 'Sun', house: 11, absolute_degree: 65 }],
    },
    field: 'planets',
  },
  'vedic-full-chart': {
    result: { chart: { ascendant: { sign: 'Leo' }, planets: [{ name: 'Sun', house: 11 }] } },
    field: 'chart',
  },
  'vedic-kp': {
    result: { planets: [], cusps: [], cuspal_sub_lord_table: [] },
    field: 'cuspal_sub_lord_table',
  },
  'vedic-dasha': {
    result: {
      timeline: [{ level: 1, lord: 'Venus', start: '2026-11-12', end: '2046-11-12' }],
      active_periods: [],
    },
    field: 'timeline',
  },
  'vedic-dasha-insights': { result: { summary: {} }, field: 'summary' },
  'vedic-daily-sign': { result: { data: dailyRashi }, field: 'data.interpretation.summary' },
  'vedic-daily-bulk': {
    result: { data: { aries: dailyRashi } },
    field: 'data.aries.interpretation.summary',
  },
  'vedic-yogas': { result: { yogas: [], summary: {} }, field: 'yogas' },
  'vedic-strength': {
    result: { shadbala: {}, ashtakavarga: { sarvashtakavarga: {} } },
    field: 'shadbala',
  },
  'vedic-vargas': {
    result: { vargas: { D9: { ascendant: { sign: 'Leo' }, planets: [] } } },
    field: 'vargas.D9',
  },
  'vedic-muhurat': {
    result: { intent: 'hora', answer: 'Show the local planetary hour.', date: '2026-11-12' },
    field: 'answer',
  },
  'vedic-muhurat-search': {
    result: { purpose: 'general', best_windows: [{ score: 82 }] },
    field: 'best_windows',
  },
  'vedic-compatibility': {
    result: { ashtakoota: { score: 25, max_score: 36 } },
    field: 'ashtakoota.score',
  },
  'moon-phase': {
    result: { phase: { name: 'Waxing Crescent', illumination: 0.14 } },
    field: 'phase',
  },
  'sky-events': {
    result: { date: '2026-11-12', timezone: 'Asia/Kolkata', events: [] },
    field: 'events',
  },
};
