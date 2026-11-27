// Aggregate tagged Console visits and signup requests from the existing Cloud Run request logs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const days = process.argv[2] || '30';
if (!/^(?:[1-9]|[1-8][0-9]|90)$/.test(days)) {
  console.error('Usage: node developer/scripts/seo-signup-starts.mjs [1–90 days]');
  process.exit(1);
}

const pages = JSON.parse(readFileSync(new URL('../../src/data/seo-pages.json', import.meta.url)));
const guides = JSON.parse(
  readFileSync(new URL('../../src/data/public-guides.json', import.meta.url)),
);
const routes = new Set([
  ...Object.keys(pages),
  ...Object.keys(guides).map((slug) => '/docs/guides/' + slug),
]);

const filter = [
  'resource.type="cloud_run_revision"',
  'resource.labels.service_name="mantrilo-console-hosting"',
  'httpRequest.requestMethod="GET"',
  'httpRequest.status=200',
  '(httpRequest.requestUrl:"/console/login?" OR httpRequest.requestUrl:"/console/docs?")',
  'httpRequest.requestUrl:"entry="',
].join(' AND ');
const rows = JSON.parse(
  execFileSync(
    'gcloud',
    [
      'logging',
      'read',
      filter,
      '--project=mantrilo',
      `--freshness=${days}d`,
      '--format=json(httpRequest.requestUrl)',
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  ),
);
const signupRequestsByPage = {};
const consoleTryRequestsByPage = {};
for (const row of rows) {
  const request = new URL(row.httpRequest.requestUrl);
  const entry = request.searchParams.get('entry');
  const channel = request.searchParams.get('channel');
  if (!routes.has(entry) || !['search', 'other'].includes(channel)) continue;

  const tab = request.searchParams.get('tab');
  const isSignup =
    request.pathname === '/console/login' && request.searchParams.get('mode') === 'signup';
  const isTry =
    request.pathname === '/console/docs' &&
    ((tab === 'try' && request.searchParams.has('preset')) ||
      (tab === 'astrology' && request.searchParams.has('operation')));
  if (!isSignup && !isTry) continue;
  const counts = isSignup ? signupRequestsByPage : consoleTryRequestsByPage;
  counts[entry] ??= { search: 0, other: 0 };
  counts[entry][channel]++;
}
console.log(
  JSON.stringify({ days: Number(days), signupRequestsByPage, consoleTryRequestsByPage }, null, 2),
);
