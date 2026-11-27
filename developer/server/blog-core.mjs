// Blog rules shared by the console server and the admin screen: reading a pasted article,
// recommending a category and finding the next publishing slot. No I/O, no dependencies.

export const CATEGORIES = [
  { name: 'Vedic Astrology', slug: 'vedic-astrology' },
  { name: 'Mantras & Shlokas', slug: 'mantras-shlokas' },
  { name: 'Sacred Audio', slug: 'sacred-audio' },
  { name: 'Scripture Books', slug: 'scripture-books' },
  { name: 'Engineering & Architecture', slug: 'engineering-architecture' },
];
export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);
// Every article is bylined to Sri Kumar; frontmatter can't change it.
export const DEFAULT_AUTHOR = 'Sri Kumar';
export const STATUSES = ['draft', 'scheduled', 'published'];
export const SCHEDULE_ZONE = 'America/New_York';
// Posts are suggested for Monday, Wednesday and Friday at 9:00 AM Eastern. Any day and time
// can still be chosen by hand.
export const SUGGESTED_DAYS = [1, 3, 5];
export const SUGGESTED_HOUR = 9;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TITLE_LIMIT = 60;
export const DESCRIPTION_LIMIT = 160;

export function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

const unquote = (value) => {
  const text = value.trim();
  if (text.length >= 2 && (text[0] === '"' || text[0] === "'") && text.at(-1) === text[0])
    return text.slice(1, -1).replace(text[0] === '"' ? /\\"/g : /''/g, text[0]);
  return text;
};

// Reads `key: value` lines from a leading `--- ... ---` block. Lists and nested values are
// skipped; the article fields are all single values.
export function parseFrontmatter(raw) {
  const text = String(raw || '')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n');
  const match = text.match(/^\s*---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { data: {}, body: text.trim() };
  const data = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!field || !field[2].trim() || /^[[{|>]/.test(field[2].trim())) continue;
    data[field[1]] = unquote(field[2].replace(/\s+#.*$/, ''));
  }
  return { data, body: text.slice(match[0].length).trim() };
}

const RULES = [
  [
    'Vedic Astrology',
    /\b(panchang|kundli|kundali|dasha|horoscope|astrology|jyotish|nakshatra|muhurat|tithi|rashi|graha|birth chart|natal|vedic chart|synastry|transit|zodiac)\b/gi,
  ],
  [
    'Mantras & Shlokas',
    /\b(mantras?|shlokas?|slokas?|stotras?|stotrams?|devanagari|chant(?:ing)?|japa|gayatri|sanskrit text|transliteration|hymns?)\b/gi,
  ],
  [
    'Sacred Audio',
    /\b(audio|recordings?|signed (?:url|link)s?|streaming|playback|player|mp3|listen(?:ing)?)\b/gi,
  ],
  [
    'Scripture Books',
    /\b(gita|upanishads?|ramayana|mahabharata|books?|scriptures?|verses?|chapters?|sutras?|vedanta|puranas?)\b/gi,
  ],
  [
    'Engineering & Architecture',
    /\b(proxy|caching|cache|auth(?:entication)?|quota|rate limit(?:ing)?|api keys?|latency|webhooks?|architecture|backend|server|deploy(?:ment)?|pagination|cursor)\b/gi,
  ],
];

// The category whose terms appear most, counting the title three times as much as the body.
export function recommendCategory(title = '', body = '') {
  let best = null;
  for (const [category, pattern] of RULES) {
    const score =
      (String(title).match(pattern)?.length ?? 0) * 3 + (String(body).match(pattern)?.length ?? 0);
    if (score > 0 && (!best || score > best.score)) best = { category, score };
  }
  return best?.category ?? 'Engineering & Architecture';
}

const matchCategory = (value) => {
  const wanted = slugify(value);
  return CATEGORIES.find((category) => category.slug === wanted)?.name ?? null;
};

export function readingTimeMinutes(markdown) {
  const words = String(markdown || '')
    .replace(/```[\s\S]*?```/g, (code) => ' '.repeat(Math.ceil(code.length / 12)) + 'x')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

// A pasted article: frontmatter fields, the body without frontmatter, and where the category
// came from.
export function articleFromPaste(raw) {
  const { data, body } = parseFrontmatter(raw);
  const firstHeading = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';
  const title = data.title || firstHeading;
  const stated = data.category ? matchCategory(data.category) : null;
  return {
    title,
    description: data.description || data.excerpt || data.summary || '',
    slug: SLUG_PATTERN.test(data.slug || '') ? data.slug : slugify(data.slug || title),
    keyword: data.keyword || data.keywords?.split(',')[0]?.trim() || '',
    author: DEFAULT_AUTHOR,
    category: stated ?? recommendCategory(title, body),
    categoryRecommended: !stated,
    markdown: body,
    readingTimeMinutes: readingTimeMinutes(body),
    publishAt: data.publishAt || data.date || null,
  };
}

// ── Eastern time ────────────────────────────────────────────────────────────────────────────

function zoneParts(date, zone = SCHEDULE_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
  };
}

const offsetAt = (date, zone) => {
  const p = zoneParts(date, zone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(date.getTime() / 1000) * 1000
  );
};

/** The instant a wall-clock time in `zone` happens (DST-aware). */
export function zonedTime(year, month, day, hour = 0, minute = 0, zone = SCHEDULE_ZONE) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let instant = guess - offsetAt(new Date(guess), zone);
  instant = guess - offsetAt(new Date(instant), zone);
  return new Date(instant);
}

/** "2026-11-23T09:00" in Eastern time → Date. */
export function fromEasternInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, m, d, h, min] = match.map(Number);
  return zonedTime(y, m, d, h, min);
}

/** Date → "2026-11-23T09:00" in Eastern time, for a datetime-local input. */
export function toEasternInput(date) {
  const p = zoneParts(new Date(date));
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

const easternDay = (date) => {
  const p = zoneParts(new Date(date));
  return `${p.year}-${p.month}-${p.day}`;
};

/**
 * The next Monday, Wednesday or Friday at 9:00 AM Eastern that is after `now` and has no
 * article scheduled or published that day. `taken` is every scheduled or published publishAt.
 */
export function suggestSlot(taken = [], now = new Date()) {
  const busy = new Set(taken.map(easternDay));
  const today = zoneParts(now);
  for (let offset = 0; offset < 400; offset++) {
    const noon = zonedTime(today.year, today.month, today.day + offset, 12);
    const p = zoneParts(noon);
    if (!SUGGESTED_DAYS.includes(p.weekday)) continue;
    const slot = zonedTime(p.year, p.month, p.day, SUGGESTED_HOUR);
    if (slot > now && !busy.has(easternDay(slot))) return slot;
  }
  throw new Error('No open slot in the next year.');
}

/** "Mon, Nov 23 at 9:00 AM EST" */
export function describeSlot(date) {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHEDULE_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHEDULE_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
  return `${day} at ${time}`;
}

export const isSuggestedDay = (date) => SUGGESTED_DAYS.includes(zoneParts(new Date(date)).weekday);
