// Monthly activation cohorts from existing Firestore fields. Output contains aggregate counts only.
import { execFileSync } from 'node:child_process';

const [period] = process.argv.slice(2);
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? '')) {
  console.error('Usage: node developer/scripts/seo-activation-report.mjs YYYY-MM');
  process.exit(1);
}

const project = process.env.FIREBASE_PROJECT_ID || 'mantrilo';
const start = new Date(`${period}-01T00:00:00.000Z`);
const end = new Date(start);
end.setUTCMonth(end.getUTCMonth() + 1);
const token = execFileSync('gcloud', ['auth', 'print-access-token', '--quiet'], {
  encoding: 'utf8',
}).trim();

const field = (fieldPath) => ({ fieldPath });
const filter = (name, op, value) => ({
  fieldFilter: { field: field(name), op, value: { stringValue: value } },
});

async function query(collection, fields, where) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: collection }], select: { fields }, where },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`Read of ${collection} failed (HTTP ${response.status}).`);
  return (await response.json()).flatMap((row) => row.document ?? []);
}

const inMonth = (name) => ({
  compositeFilter: {
    op: 'AND',
    filters: [
      filter(name, 'GREATER_THAN_OR_EQUAL', start.toISOString()),
      filter(name, 'LESS_THAN', end.toISOString()),
    ],
  },
});
const [cohort, keys, usage] = await Promise.all([
  query('workspaces', [field('createdAt')], inMonth('createdAt')),
  query('apiKeys', ['workspaceId', 'environment'].map(field), inMonth('createdAt')),
  query(
    'apiUsage',
    ['workspaceId', 'lane', 'contentRequests'].map(field),
    filter('period', 'EQUAL', period),
  ),
]);
const newWorkspaces = new Set(cohort.map(({ name }) => name.split('/').at(-1)));
const sandboxKeys = new Set();
for (const { fields } of keys) {
  const id = fields.workspaceId?.stringValue;
  const environment = fields.environment?.stringValue;
  if (newWorkspaces.has(id) && environment === 'sandbox') sandboxKeys.add(id);
}

const totals = new Map();
for (const { fields } of usage) {
  const id = fields.workspaceId?.stringValue;
  if (!sandboxKeys.has(id) || (fields.lane?.stringValue ?? 'sandbox') !== 'sandbox') continue;
  const count = Number(fields.contentRequests?.integerValue ?? 0);
  totals.set(id, (totals.get(id) ?? 0) + count);
}

const activated = [...totals.values()].filter((count) => count > 0).length;
console.log(
  JSON.stringify(
    {
      period,
      newWorkspaces: newWorkspaces.size,
      sandboxKeysIssued: sandboxKeys.size,
      workspacesWithSuccessfulSandboxUsage: activated,
      activationRateAmongIssued: sandboxKeys.size ? activated / sandboxKeys.size : null,
    },
    null,
    2,
  ),
);
