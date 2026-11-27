import { insist } from '../domain.mjs';

const westernBirth = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  lat: 51.5074,
  lng: -0.1278,
  tz_str: 'Europe/London',
};
const vedicBirth = {
  year: 1995,
  month: 6,
  day: 20,
  hour: 12,
  minute: 30,
  lat: 28.6139,
  lng: 77.209,
  tz_str: 'Asia/Kolkata',
  ayanamsha: 'lahiri',
  house_system: 'whole_sign',
  node_type: 'mean',
};

const kpBirth = { ...vedicBirth, ayanamsha: 'kp', house_system: 'placidus' };
const chatExample = { message: 'What is my birth chart ascendant?' };

// Only explicit routes can be reached with Mantrilo's server credential. The URL and
// HTTP method never come from a customer request.
const definitions = {
  Western: [
    [
      'western-chat',
      'Western astrology chat',
      '/v2/western/chat',
      chatExample,
      { chat: true, timeoutMs: 18000 },
    ],
    ['western-natal', 'Natal chart', '/v1/natal/calculate', westernBirth],
    [
      'western-natal-insights',
      'Natal insights',
      '/v1/western/natal/insights',
      {
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        lat: 51.5074,
        lng: -0.1278,
        tz_str: 'Europe/London',
      },
    ],
    [
      'western-chart-similarity',
      'Birth chart similarity',
      '/v2/western/chart-similarity/famous-people',
      {
        natal: {
          name: 'Sample User',
          year: 1995,
          month: 9,
          day: 5,
          hour: 20,
          minute: 0,
          city: 'Paris, France',
          lat: 48.8566,
          lng: 2.3522,
          tz_str: 'Europe/Paris',
          true_node: true,
        },
        settings: {
          top_n: 3,
          include_angles: true,
          close_position_orb_deg: 5,
          close_angle_orb_deg: 5,
          close_aspect_orb_deg: 2,
          max_detail_items: 3,
        },
      },
      { timeoutMs: 18000 },
    ],
    [
      'western-ephemeris',
      'Ephemeris',
      '/v1/ephemeris/calculate',
      {
        start: '2026-03-01T00:00:00Z',
        bodies: ['Sun', 'Moon', 'Mercury'],
        include_moon_void_of_course: true,
        fixed_stars: ['Spica', 'Regulus'],
      },
    ],
    [
      'western-astrocartography',
      'Astrocartography lines',
      '/v1/western/astrocartography/lines',
      { natal: westernBirth },
    ],
    [
      'western-astrocartography-parans',
      'Astrocartography parans',
      '/v1/western/astrocartography/parans',
      { natal: westernBirth },
    ],
    [
      'western-astrocartography-relocation',
      'Relocated chart',
      '/v1/western/astrocartography/relocation',
      {
        natal: {
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          lat: 51.5074,
          lng: -0.1278,
          tz_str: 'Europe/London',
        },
        city: 'Paris',
        country: 'FR',
        lat: 48.8566,
        lng: 2.3522,
      },
    ],
    [
      'western-astrocartography-recommendations',
      'Astrocartography recommendations',
      '/v1/western/astrocartography/recommendations',
      {
        natal: {
          year: 1995,
          month: 9,
          day: 5,
          hour: 20,
          minute: 0,
          city: 'Paris',
          lat: 48.8566,
          lng: 2.3522,
          tz_str: 'Europe/Paris',
          time_known: true,
          house_system: 'placidus',
        },
        focus: 'home',
        country_scope: 'selected_countries',
        countries: ['FR', 'ES', 'PT'],
        limit: 10,
        min_population: 100000,
      },
    ],
    [
      'western-astrocartography-city',
      'Astrocartography city check',
      '/v1/western/astrocartography/city-check',
      {
        natal: {
          year: 1995,
          month: 9,
          day: 5,
          hour: 20,
          minute: 0,
          city: 'Paris',
          lat: 48.8566,
          lng: 2.3522,
          tz_str: 'Europe/Paris',
          time_known: true,
          house_system: 'placidus',
        },
        city: 'Lisbon',
        country: 'PT',
      },
    ],
    [
      'western-wedding-electional',
      'Wedding electional search',
      '/v2/western/electional/wedding/search',
      {
        search_window: {
          start: '2026-06-01T09:00:00',
          end: '2026-06-01T18:00:00',
          step_minutes: 60,
        },
        city: 'Paris',
        lat: 48.8566,
        lng: 2.3522,
        tz_str: 'Europe/Paris',
        max_results: 1,
      },
    ],
    ['western-sun-sign', 'Sun sign', '/v1/western/signs/sun', westernBirth],
    ['western-moon-sign', 'Moon sign', '/v1/western/signs/moon', westernBirth],
    ['western-rising-sign', 'Rising sign', '/v1/western/signs/rising', westernBirth],
    ['western-midheaven-sign', 'Midheaven sign', '/v1/western/signs/midheaven', westernBirth],
    [
      'western-transits',
      'Transits',
      '/v1/transits/calculate',
      {
        natal: {
          name: 'John Doe',
          city: 'New York',
          year: 1990,
          month: 5,
          day: 15,
          time_known: false,
          hour: 10,
          minute: 30,
          lat: 40.7128,
          lng: -74.006,
          tz_str: 'AUTO',
        },
        transit_date: '2025-01-15T12:00',
        current_city: 'Paris',
        current_lat: 48.8566,
        current_lng: 2.3522,
        tz_str: 'AUTO',
        orb_settings: { Conjunction: 8, Opposition: 8, Trine: 6, Square: 6, Sextile: 4 },
      },
    ],
    [
      'western-transit-timeline',
      'Transit timeline',
      '/v1/western/transits/timeline',
      {
        natal: {
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          lat: 51.5074,
          lng: -0.1278,
          tz_str: 'Europe/London',
          time_known: true,
        },
        range_start: '2026-11-01',
        range_end: '2026-11-30',
        mode: 'month',
      },
    ],
    [
      'western-transit-insights',
      'Transit insights',
      '/v1/western/transits/insights',
      {
        natal: {
          name: 'October Sample',
          year: 1995,
          month: 11,
          day: 3,
          hour: 21,
          minute: 10,
          time_known: true,
          city: 'Paris',
          lat: 48.8566,
          lng: 2.3522,
          tz_str: 'Europe/Paris',
        },
        range_start: '2026-10-01',
        range_end: '2026-10-31',
        mode: 'month',
        include_houses: true,
      },
    ],
    [
      'western-profections',
      'Annual profections',
      '/v1/western/profections/annual',
      {
        name: 'Live Docs Example',
        year: 1990,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        time_known: true,
        city: 'London',
        lat: 51.5074,
        lng: -0.1278,
        tz_str: 'Europe/London',
        annual_profection: {
          year: 2024,
          settings: {
            zodiac_type: 'Tropical',
            orb_policy: { default_orb_deg: 6, by_aspect_deg: {} },
          },
        },
      },
    ],
    [
      'western-primary-directions',
      'Primary directions',
      '/v1/western/directions/primary',
      {
        natal: {
          name: 'Documentation Sample',
          datetime: '1990-01-01 12:00',
          time_known: true,
          location: { city: 'London', lat: 51.5074, lng: -0.1278, tz_str: 'Europe/London' },
        },
        settings: {
          method: 'regiomontanus_in_mundo',
          direction: 'both',
          key: 'naibod',
          secondary_motion: 'moon',
          latitude_doctrine: 'both',
          bounds_system: 'egyptian',
          include_bounds: true,
          include_natal_reference: false,
          promissors: ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'],
          significators: ['asc', 'mc', 'dc', 'ic', 'sun', 'moon', 'lot_of_fortune'],
          aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
          orb_years: 1,
        },
        range: { start_date: '2026-01-01', end_date: '2030-12-31', limit: 5 },
      },
    ],
    [
      'western-secondary-progressions',
      'Secondary progressions',
      '/v1/western/progressions/secondary',
      {
        natal: {
          name: 'User',
          datetime: '1990-01-01 12:00',
          time_known: true,
          location: { city: 'London', lat: 51.5074, lng: -0.1278, tz_str: 'AUTO' },
        },
        secondary_progression: { target_date: '2026-03-30' },
      },
    ],
    [
      'western-progressions-calendar',
      'Progressions calendar',
      '/v1/western/progressions/secondary/calendar',
      {
        natal: {
          name: 'User',
          datetime: '1990-01-01 12:00',
          time_known: true,
          location: { city: 'London', lat: 51.5074, lng: -0.1278, tz_str: 'AUTO' },
        },
        calendar: { from: '2026-03-30', to: '2027-03-30' },
      },
    ],
    [
      'western-solar-return',
      'Solar return',
      '/v1/western/solar/calculate',
      {
        natal: {
          datetime: '1990-05-15T14:30:00',
          location: { city: 'London', lat: 51.5074, lng: -0.1278, tz_str: 'Europe/London' },
        },
        solar_return: { year: 2026, location: { city: 'London' } },
      },
    ],
    [
      'western-planetary-return',
      'Planetary return',
      '/v1/western/returns/calculate',
      {
        natal: {
          datetime: '1990-01-01 12:00',
          location: { city: 'London', lat: 51.5074, lng: -0.1278 },
        },
        return_target: {
          body: 'moon',
          search_start: '2024-05-15T00:00:00Z',
          location: { city: 'Paris', lat: 48.8566, lng: 2.3522 },
        },
        settings: { zodiac_type: 'Sidereal', sidereal_ayanamsa: 'lahiri' },
      },
    ],
    [
      'western-synastry',
      'Synastry',
      '/v2/western/synastry',
      {
        person_a: {
          datetime: '1990-05-15T14:30:00',
          location: { city: 'New York, USA' },
          tz_str: 'AUTO',
        },
        person_b: {
          datetime: '1992-08-20T09:15:00',
          location: { city: 'Los Angeles, USA' },
          tz_str: 'AUTO',
        },
        settings: {
          zodiac: 'sidereal',
          sidereal_ayanamsa: 'lahiri',
          aspect_set: 'extended',
          bodies: [
            'sun',
            'moon',
            'mercury',
            'venus',
            'mars',
            'jupiter',
            'saturn',
            'uranus',
            'neptune',
            'pluto',
            'node',
            'chiron',
            'lilith',
            'asc',
            'mc',
            'vertex',
          ],
          include: {
            natal_snapshots: true,
            aspects: true,
            house_overlays: true,
            scores: true,
            archetype: true,
            text: false,
          },
        },
      },
    ],
    [
      'western-synastry-cards',
      'Synastry cards',
      '/v2/western/synastrycards',
      {
        person_a: {
          datetime: '1990-05-15T14:30:00',
          location: { city: 'New York, USA' },
          tz_str: 'AUTO',
        },
        person_b: {
          datetime: '1992-08-20T09:15:00',
          location: { city: 'Los Angeles, USA' },
          tz_str: 'AUTO',
        },
        settings: { zodiac: 'sidereal', sidereal_ayanamsa: 'lahiri', aspect_set: 'major_plus' },
      },
    ],
    [
      'western-daily-sign',
      'Daily sign horoscope',
      '/v2/horoscope/daily/sign',
      { sign: 'aries' },
      { query: true },
    ],
    [
      'western-daily-personal',
      'Daily personal horoscope',
      '/v3/horoscope/daily/personal',
      {
        birth: {
          year: 1990,
          month: 5,
          day: 15,
          hour: 10,
          minute: 0,
          city: 'London, UK',
          lat: 51.5074,
          lng: -0.1278,
          tz_str: 'Europe/London',
          time_known: true,
        },
        date: '2026-04-20',
        include_interpretation_blocks: true,
      },
    ],
    [
      'western-weekly-personal',
      'Weekly personal horoscope',
      '/v3/horoscope/weekly/personal',
      {
        birth: {
          year: 1990,
          month: 5,
          day: 15,
          hour: 10,
          minute: 0,
          city: 'London, UK',
          lat: 51.5074,
          lng: -0.1278,
          tz_str: 'Europe/London',
          time_known: true,
        },
        week_start: '2026-04-20',
        include_interpretation_blocks: true,
      },
    ],
    [
      'western-couples-horoscope',
      'Couples horoscope',
      '/v1/western/synastry/horoscope',
      {
        person_a: {
          datetime: '1990-01-01T12:00:00+00:00',
          location: { lat: 40.71, lng: -74, city: 'New York' },
        },
        person_b: {
          datetime: '1992-05-15T14:30:00+00:00',
          location: { lat: 48.85, lng: 2.35, city: 'Paris' },
        },
        date: '2026-02-25',
        tz_str: 'America/New_York',
      },
    ],
    ['western-natal-image', 'Natal chart image', '/v1/natal/chart/', westernBirth, { image: true }],
    [
      'western-transit-image',
      'Transit chart image',
      '/v1/natal/chart/transits',
      {
        natal: {
          name: 'John Doe',
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          time_known: false,
          city: 'London',
          tz_str: 'AUTO',
          size: 700,
          theme_type: 'light',
          format: 'svg',
          chart_config: {
            custom_sign_bg_color: '#e8e0f0',
            custom_house_bg_color: '#e0f0f8',
            show_retrograde_markers: true,
            retrograde_marker_style: 'R',
            french_style: true,
            french_planet_radius_offset: 0,
            french_transit_planet_radius_offset: 24,
            french_transit_degree_label_offset: -28,
            french_transit_natal_planets_inside: false,
            french_transit_natal_inner_radius_offset: 0,
            french_transit_inner_natal_house_gap: 60,
            french_transit_inner_natal_planet_radius_offset: null,
            custom_planet_color: null,
          },
        },
        current_city: 'New York',
        transit_date: '2026-02-26T12:00',
        show_inter_aspects: true,
        show_natal_aspects: false,
        show_transit_aspects: false,
        natal_planet_color: '#1565C0',
        transit_planet_color: '#C62828',
      },

      { image: 'natal' },
    ],
    [
      'western-solar-return-image',
      'Solar return chart image',
      '/v1/natal/chart/solar-return',
      {
        natal: {
          name: 'Maya',
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          city: 'London',
          tz_str: 'AUTO',
          format: 'svg',
          size: 700,
          theme_type: 'light',
        },
        solar_return_year: 2026,
        solar_return_city: 'Paris',
        solar_return_tz_str: 'AUTO',
        show_inter_aspects: true,
        show_natal_aspects: false,
        show_solar_return_aspects: false,
        natal_planet_color: '#1565C0',
        solar_return_planet_color: '#C62828',
      },

      { image: 'natal' },
    ],
    [
      'western-progressions-image',
      'Progressions chart image',
      '/v1/natal/chart/progressions',
      {
        natal: {
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          lat: 51.5074,
          lng: -0.1278,
          tz_str: 'Europe/London',
        },
        secondary_progression: { target_date: '2026-11-12' },
        target_date: '2026-11-12',
      },
      { image: 'natal' },
    ],
    [
      'western-synastry-image',
      'Synastry chart image',
      '/v1/natal/chart/synastry',
      {
        person_a: {
          name: 'Person A',
          year: 1990,
          month: 5,
          day: 15,
          hour: 14,
          minute: 30,
          time_known: true,
          city: 'London',
          tz_str: 'AUTO',
          format: 'svg',
          size: 900,
          theme_type: 'light',
        },
        person_b: {
          name: 'Person B',
          year: 1992,
          month: 8,
          day: 6,
          hour: 6,
          minute: 45,
          time_known: true,
          city: 'Paris',
          tz_str: 'AUTO',
        },
        show_a_aspects: false,
        show_inter_aspects: true,
        show_b_aspects: false,
        person_a_planet_color: '#1565C0',
        person_b_planet_color: '#C62828',
        person_a_angle_color: '#1A1A1A',
        person_b_angle_color: '#1A1A1A',
        show_person_b_houses: true,
        show_person_b_angles: true,
        person_a_zone_bg_color: '#fde3e3',
        person_a_zone_bg_opacity: 0.55,
        person_b_zone_bg_color: '#e3ecff',
        person_b_zone_bg_opacity: 0.55,
      },
      { image: 'person_a' },
    ],
    [
      'western-composite-image',
      'Composite chart image',
      '/v1/natal/chart/composite',
      {
        person_a: { year: 1990, month: 5, day: 15, city: 'London' },
        person_b: { year: 1992, month: 8, day: 6, city: 'Paris' },
      },
      { image: 'person_a' },
    ],
  ],
  Numerology: [
    [
      'numerology-profile',
      'Numerology profile',
      '/v1/numerology/profile',
      {
        method: { system: 'pythagorean' },
        subject: { birth_date: '1992-07-16' },
        date_context: { reference_date: '2026-11-12' },
      },
    ],
  ],
  Vedic: [
    [
      'vedic-chat',
      'Vedic astrology chat',
      '/v2/vedic/chat',
      chatExample,
      { chat: true, timeoutMs: 18000 },
    ],
    ['vedic-natal', 'Sidereal natal chart', '/v2/vedic/chart', vedicBirth],
    [
      'vedic-full-chart',
      'Full Vedic chart',
      '/v2/vedic/calculate',
      { ...vedicBirth, vargas: [1, 9] },
    ],
    ['vedic-kp', 'KP astrology', '/v2/vedic/kp', kpBirth],
    ['vedic-kp-image', 'KP chart image', '/v2/vedic/kp/render', kpBirth, { image: true }],
    ['vedic-dasha', 'Vimshottari Dasha', '/v2/vedic/dasha', vedicBirth],
    [
      'vedic-dasha-insights',
      'Dasha insights',
      '/v1/vedic/dasha/insights',
      {
        year: 1985,
        month: 8,
        day: 22,
        hour: 6,
        minute: 45,
        lat: 19.076,
        lng: 72.8777,
        tz_str: 'Asia/Kolkata',
        ayanamsha: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean',
        levels: 3,
      },
    ],
    [
      'vedic-gochar',
      'Gochar timeline',
      '/v2/vedic/gochar/timeline',
      {
        year: 1997,
        month: 9,
        day: 22,
        hour: 23,
        minute: 25,
        city: 'Mumbai',
        lat: 19.391928,
        lng: 72.839732,
        tz_str: 'Asia/Kolkata',
        ayanamsha: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean',
        range_start: '2026-04-01',
        range_end: '2026-04-03',
        transit_hour: 12,
        transit_minute: 0,
        transit_tz_str: 'Asia/Kolkata',
        transit_planets: ['saturn', 'jupiter', 'rahu', 'ketu'],
        include_dasha_overlay: false,
      },
    ],
    [
      'vedic-gochar-insights',
      'Gochar timeline insights',
      '/v2/vedic/gochar/timeline/insights',
      {
        year: 1997,
        month: 9,
        day: 22,
        hour: 23,
        minute: 25,
        city: 'Mumbai',
        lat: 19.391928,
        lng: 72.839732,
        tz_str: 'Asia/Kolkata',
        ayanamsha: 'lahiri',
        house_system: 'whole_sign',
        node_type: 'mean',
        range_start: '2026-04-01',
        range_end: '2026-04-03',
        transit_hour: 12,
        transit_minute: 0,
        transit_tz_str: 'Asia/Kolkata',
        transit_planets: ['saturn', 'jupiter', 'rahu', 'ketu'],
        include_dasha_overlay: false,
      },
    ],
    [
      'vedic-daily-personal',
      'Daily personal Vedic horoscope',
      '/v2/vedic/horoscope/daily/personal',
      {
        year: 1995,
        month: 6,
        day: 20,
        hour: 12,
        minute: 30,
        lat: 28.6139,
        lng: 77.209,
        tz_str: 'Asia/Kolkata',
        target_date: '2026-11-12',
      },
    ],
    [
      'vedic-daily-sign',
      'Daily Rashifal',
      '/v2/vedic/horoscope/daily/sign',
      { sign: 'aries', target_date: '2026-11-12' },
      { query: true },
    ],
    [
      'vedic-daily-bulk',
      'Daily Rashifal for all signs',
      '/v2/vedic/horoscope/daily/bulk',
      {},
      { query: true },
    ],
    ['vedic-yogas', 'Yoga detection', '/v2/vedic/yogas', vedicBirth],
    ['vedic-strength', 'Planetary strength', '/v2/vedic/strength', vedicBirth],
    [
      'vedic-vargas',
      'Divisional charts',
      '/v2/vedic/vargas',
      { ...vedicBirth, divisions: [1, 9, 10, 60] },
    ],
    [
      'vedic-muhurat',
      'Daily Muhurat lookup',
      '/v2/vedic/qa',
      {
        question: 'chaughadia',
        date: '2026-04-30',
        time: '10:30',
        city: 'New Delhi',
        lat: 28.62137,
        lng: 77.2148,
        ayanamsha: 'lahiri',
        language: 'en',
      },
    ],
    [
      'vedic-muhurat-search',
      'Muhurat search',
      '/v2/vedic/muhurat/search',
      {
        purpose: 'vehicle_purchase',
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        city: 'New Delhi',
        lat: 28.62137,
        lng: 77.2148,
        ayanamsha: 'lahiri',
        language: 'en',
        limit: 3,
      },
    ],
    [
      'vedic-personalized-muhurat',
      'Personalized Muhurat search',
      '/v2/vedic/muhurat/personalized-search',
      {
        purpose: 'vehicle_purchase',
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        city: 'New Delhi',
        lat: 28.62137,
        lng: 77.2148,
        ayanamsha: 'lahiri',
        language: 'en',
        limit: 3,
        subject: {
          year: 1990,
          month: 5,
          day: 17,
          hour: 9,
          minute: 30,
          city: 'New Delhi',
          lat: 28.62137,
          lng: 77.2148,
          ayanamsha: 'lahiri',
        },
      },
    ],
    [
      'vedic-compatibility',
      'Moon sign compatibility',
      '/v2/vedic/compatibility',
      {
        person1_moon: {
          label: 'Person 1',
          moon_nakshatra: 22,
          moon_sign: 10,
          moon_degree: 14.2,
          moon_pada: 2,
        },
        person2_moon: {
          label: 'Person 2',
          moon_nakshatra: 13,
          moon_sign: 6,
          moon_degree: 8.5,
          moon_pada: 3,
        },
        language: 'en',
      },
    ],
  ],
  Utilities: [
    ['moon-phase', 'Moon phase', '/v1/moon/phase', { date: '2026-11-12' }, { query: true }],
    [
      'moon-timeline',
      'Monthly Moon timeline',
      '/v1/moon/month',
      { year: 2026, month: 11 },
      { query: true },
    ],
    [
      'sky-events',
      'Sky events',
      '/v1/sky-events',
      { date: '2026-11-12', preset: 'quiet', timezone: 'America/New_York' },
      { query: true },
    ],
  ],
};

const entries = Object.entries(definitions).flatMap(([category, routes]) =>
  routes.map(([id, name, route, example, options = {}]) => ({
    id,
    name,
    category,
    route: '/api' + route,
    description: options.image ? 'Returns a PNG chart.' : 'Returns structured astrology results.',
    ...(example ? { example: { parameters: example } } : {}),
    ...options,
  })),
);

const operations = new Map(entries.map((operation) => [operation.id, operation]));

export function catalogOperation(id) {
  return operations.get(id);
}

export const catalogOperations = entries.map(({ id, name, category, description, example }) => ({
  id,
  name,
  category,
  description,
  requestFormat: 'parameters',
  ...(example ? { example } : {}),
}));

const prohibited =
  /^(?:__proto__|constructor|prototype|api[_-]?key|token|authorization|(?:base|callback|webhook|redirect|source|remote|image|logo)[_-]?url|account[_-]?id|workspace[_-]?id|conversation[_-]?id)$/i;
const reportOption = /^(?:psychological[_-]?report|pdf[_-]?report|webhook|callback)$/i;
const remoteValue = /(?:https?:\/\/|file:\/\/|^\s*(?:data:|\/\/))/i;

function safeParameters(value, depth = 0) {
  insist(depth <= 12, 400, 'invalid_parameters', 'Calculation parameters are nested too deeply.');
  if (typeof value === 'string') {
    insist(
      value.length <= 4000 && !remoteValue.test(value),
      400,
      'invalid_parameters',
      'Calculation parameters must not include URLs.',
    );
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const members = Object.entries(value);
  insist(
    members.length <= 250,
    400,
    'invalid_parameters',
    'There are too many calculation parameters.',
  );
  for (const [field, child] of members) {
    insist(
      !prohibited.test(field) && !reportOption.test(field),
      400,
      'invalid_parameters',
      'The request contains a reserved parameter.',
    );
    safeParameters(child, depth + 1);
  }
}

export function catalogRequest(operation, parameters) {
  insist(
    parameters && typeof parameters === 'object' && !Array.isArray(parameters),
    400,
    'invalid_parameters',
    'Provide calculation inputs in a parameters object.',
  );
  safeParameters(parameters);
  if (operation.query) {
    const query = new URLSearchParams();
    for (const [field, value] of Object.entries(parameters)) {
      insist(
        ['string', 'number', 'boolean'].includes(typeof value),
        400,
        'invalid_parameters',
        'This calculation accepts scalar parameters.',
      );
      query.set(field, String(value));
    }
    return { route: operation.route + '?' + query.toString() };
  }
  let payload = parameters;
  if (operation.chat) {
    payload = { ...parameters, memory: 'request', debug: false };
  } else if (typeof operation.image === 'string') {
    const profile = parameters[operation.image];
    insist(
      profile && typeof profile === 'object' && !Array.isArray(profile),
      400,
      'invalid_parameters',
      'Provide a natal chart profile.',
    );
    payload = { ...parameters, [operation.image]: { ...profile, format: 'png' } };
  } else if (operation.image) {
    payload = { ...parameters, format: 'png' };
  }
  return {
    route: operation.route,
    payload,
    format: operation.image ? 'png' : 'json',
    timeoutMs: operation.timeoutMs,
  };
}

const upstreamIdentity =
  /(?:https?:\/\/[^\s"'<>]*freeastroapi[^\s"'<>]*|free[-_ .]*astro[-_ .]*api(?:\.com)?)/gi;
function brand(text) {
  return text.replace(upstreamIdentity, 'Mantrilo API');
}

export function publicAstrologyResult(value) {
  if (typeof value === 'string') return brand(value);
  if (Array.isArray(value)) return value.map(publicAstrologyResult);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([field, child]) =>
      prohibited.test(field) ? [] : [[brand(field), publicAstrologyResult(child)]],
    ),
  );
}
