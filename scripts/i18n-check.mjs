// Checks every locale file in src/i18n/locales against en.json, the source of truth.
//
//   node scripts/i18n-check.mjs          fail on missing or extra keys and broken placeholders
//   node scripts/i18n-check.mjs --warn   report the same problems without failing
//   node scripts/i18n-check.mjs --only=hi,ta   check only these languages
//
// A missing key still renders (it falls back to English), so missing keys are reported per
// language. Plural keys may differ by language: English has _one/_other, while a language may add
// _zero, _two, _few or _many, or (Urdu aside) need only _other; any plural form of a base key that
// exists in English counts. Every {{placeholder}} and <tag> in the English string must appear in
// the translation, and the translation must not add any.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');
const warnOnly = process.argv.includes('--warn');
const only = process.argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice(7)
  .split(',');
const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') flatten(child, path, out);
    else out[path] = child;
  }
  return out;
}

const tokens = (text) =>
  [...String(text).matchAll(/\{\{\s*([\w.]+)[^}]*\}\}|<\/?(\w+)\s*\/?>/g)]
    .map((m) => (m[1] ? `{{${m[1]}}}` : m[0].replace(/\s+/g, '')))
    .sort()
    .join(' ');

const read = (file) => flatten(JSON.parse(readFileSync(join(dir, file), 'utf8')));
const en = read('en.json');
const base = (key) => key.replace(PLURAL, '');
const enBases = new Set(Object.keys(en).map(base));

let failed = false;
const files = readdirSync(dir).filter(
  (f) => f.endsWith('.json') && f !== 'en.json' && (!only || only.includes(f.replace('.json', ''))),
);
console.log(`en: ${Object.keys(en).length} keys`);
for (const file of files.sort()) {
  const code = file.replace('.json', '');
  let strings;
  try {
    strings = read(file);
  } catch (error) {
    console.log(`${code}: invalid JSON (${error.message})`);
    failed = true;
    continue;
  }
  const problems = [];
  const bases = new Set(Object.keys(strings).map(base));
  for (const key of Object.keys(en)) {
    const plural = PLURAL.test(key);
    if (plural ? !bases.has(base(key)) : !(key in strings)) problems.push(`missing ${key}`);
  }
  for (const [key, value] of Object.entries(strings)) {
    const plural = PLURAL.test(key);
    if (plural ? !enBases.has(base(key)) : !(key in en)) {
      problems.push(`extra ${key}`);
      continue;
    }
    const english = en[key] ?? en[`${base(key)}_other`];
    // An empty English string (a word-order slot such as plans.requestsPerMonthPrefix) may stay empty.
    if (typeof value !== 'string' || (!value.trim() && english !== '')) {
      problems.push(`empty ${key}`);
      continue;
    }
    const source = english;
    if (source !== undefined && tokens(source) !== tokens(value)) {
      // A plural form may leave out the count (Hindi "एक श्लोक"), so {{n}} alone is optional.
      const strip = (text) => text.replace(/\{\{n\}\}\s?/g, '');
      if (!(plural && strip(tokens(source)) === strip(tokens(value))))
        problems.push(`placeholders ${key}: expected [${tokens(source)}] got [${tokens(value)}]`);
    }
  }
  const missing = problems.filter((p) => p.startsWith('missing')).length;
  console.log(
    `${code}: ${Object.keys(strings).length} keys, ${problems.length ? `${problems.length} problem(s), ${missing} missing` : 'ok'}`,
  );
  for (const problem of problems.slice(0, 40)) console.log(`  ${problem}`);
  if (problems.length > 40) console.log(`  … ${problems.length - 40} more`);
  if (problems.length) failed = true;
}
if (failed && !warnOnly) process.exit(1);
