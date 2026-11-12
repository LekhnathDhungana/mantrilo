import { Link } from 'expo-router';
import {
  astrologyGuides,
  backendExample,
  curl,
  productionApi,
  type Guide,
  type Operation,
} from '../data/integrations';
import { useConsole } from './Session.web';
import { CopyButton, useLoad } from './ui.web';

export function useAstrologyCatalog() {
  const { data } = useLoad<{ availableOperations: Operation[] }>('/api/astrology');
  const operations = data?.availableOperations ?? [];
  return {
    guides: astrologyGuides(operations),
    runnable: new Set(operations.filter((op) => op.availability !== 'limited').map((op) => op.id)),
    loaded: Boolean(data),
  };
}

function useExampleContext(original: Guide) {
  const { config } = useConsole();
  const demo = config?.mode === 'demo';
  const guide = demo
    ? {
        ...original,
        path: original.demoPath ?? original.path,
        followupPaths: original.demoFollowupPaths ?? original.followupPaths,
        library: original.demoItem
          ? { ...original.library, item: original.demoItem }
          : original.library,
      }
    : original;
  const remote =
    demo && guide.area === 'Astrology' && !['positions', 'panchang'].includes(guide.library.item!);
  return { guide, demo, remote, base: (remote ? null : config?.apiUrl) ?? productionApi };
}

export function CodeExample({
  title,
  code,
  label = 'Copy',
}: {
  title: string;
  code: string;
  label?: string;
}) {
  return (
    <div className="integration-example">
      <div className="panel-heading">
        <h3>{title}</h3>
        <CopyButton key={code} text={code} label={label} />
      </div>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function GuideLinks({ guide: original, sandbox }: { guide: Guide; sandbox: boolean }) {
  const { guide } = useExampleContext(original);
  return (
    <div className="integration-actions">
      <Link className="button subtle" href={{ pathname: '/library', params: guide.library }}>
        View in Library →
      </Link>
      {sandbox && <SandboxLink operation={guide.library.item!} />}
    </div>
  );
}

export function SandboxLink({ operation }: { operation: string }) {
  return (
    <Link
      className="button subtle"
      href={{ pathname: '/docs', params: { tab: 'astrology', operation } }}
    >
      Try in Sandbox
    </Link>
  );
}

export function Reference({ guide: original }: { guide: Guide }) {
  const { guide, base, demo, remote } = useExampleContext(original);
  return (
    <section className="panel integration-panel">
      <h2>API request and result</h2>
      <p>
        <code>
          {guide.method} {guide.path}
        </code>
      </p>
      <h3>Inputs</h3>
      <p>{guide.inputs}</p>
      <h3>What your app displays</h3>
      <p>{guide.render}</p>
      {guide.limited ? (
        <p className="notice">
          This operation is currently unavailable. The API can return HTTP 503 for this operation.
        </p>
      ) : (
        <>
          {remote && (
            <p className="small muted">
              This request targets the hosted API and needs a key created there.
            </p>
          )}
          {demo && guide.area !== 'Astrology' && (
            <p className="small muted">
              The local demo uses placeholder data. The response below is from the hosted sandbox.
            </p>
          )}
          <CodeExample title="cURL request" code={curl(guide, base)} label="Copy request" />
          {guide.followupPaths?.map(([title, path]) => (
            <CodeExample
              key={path}
              title={title}
              code={curl({ ...guide, path }, base)}
              label="Copy request"
            />
          ))}
          <CodeExample
            title={guide.sampleLabel ?? 'Sandbox response excerpt'}
            code={JSON.stringify(guide.sample, null, 2)}
            label="Copy response"
          />
        </>
      )}
    </section>
  );
}

export function ServerIntegration({ guide: original }: { guide: Guide }) {
  const { guide, base } = useExampleContext(original);
  if (guide.limited) return null;
  const payload = guide.body
    ? Object.fromEntries(Object.entries(guide.body).filter(([key]) => key !== 'operation'))
    : null;
  const fetchOptions = payload
    ? `, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(payload, null, 2).replaceAll('\n', '\n  ')}),
}`
    : '';
  return (
    <details className="panel integration-panel integration-steps">
      <summary>Server and app integration</summary>
      <ol>
        <li>
          Save the example as <code>server.mjs</code>. Set <code>MANTRILO_API_KEY</code> on your
          server and run <code>node server.mjs</code>.
        </li>
        <li>
          Test the example on <code>http://127.0.0.1:3000/api/mantrilo-guide</code> with a{' '}
          {guide.method} request. For a web app, serve the route from your app’s backend. For
          mobile, call the HTTPS URL of your deployed backend.
        </li>
        <li>
          Before making your route public, add your app’s authentication and rate limits. Keep the
          Mantrilo key on the server.
        </li>
      </ol>
      <CodeExample
        title="Node.js backend"
        code={backendExample(guide, base)}
        label="Copy server code"
      />
      <CodeExample
        title="Web or mobile app"
        code={`// Web: use this path on the app's origin.
// Mobile: prepend your deployed backend's HTTPS origin.
const response = await fetch('/api/mantrilo-guide'${fetchOptions});
if (!response.ok) throw new Error('Could not load this feature');
const { data } = await response.json();
${guide.viewCode ?? 'console.log(data);'}`}
        label="Copy app code"
      />
    </details>
  );
}
