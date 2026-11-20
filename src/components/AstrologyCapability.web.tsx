import { Link, useLoaderData } from 'expo-router';
import type { loader } from '../app/astrology-api/[capability]';
import NotFound from './NotFound';
import { Callout, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';

export default function AstrologyCapability() {
  const data = useLoaderData<typeof loader>();
  if (!data) return <NotFound />;
  const { page, heading, item, related } = data;
  const daily = page.operation === 'daily-panchang';
  const instant = page.operation === 'panchang';
  return (
    <SiteFrame path={page.path}>
      <PageHero
        eyebrow={`Astrology API · ${item.facet}`}
        title={heading}
        lede={item.summary}
        actions={
          item.sandbox ? <KeyButton href={item.sandbox}>Try this calculation</KeyButton> : undefined
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            {item.limited && (
              <Callout tone="warn">
                This capability is marked limited. It may be unavailable for some requests, and it
                is not in the sandbox. The console shows its current availability.
              </Callout>
            )}
            <h2>Make a calculation</h2>
            <p>
              Send <code>{`"operation": "${page.operation}"`}</code> to{' '}
              <code>
                {item.method} {item.path}
              </code>{' '}
              from your server with your API key.
            </p>
            <p>{item.inputs}</p>
            <h2>Build with the result</h2>
            <p>{item.render}</p>
            <p>{item.usage}</p>
            {instant && (
              <p>
                This calculation describes one instant. For a local calendar day and sunrise-based
                timings, see the{' '}
                <Link href="/astrology-api/daily-panchang">Daily Panchang API</Link>. Its location
                and time zone determine the local day.
              </p>
            )}
            {daily && (
              <>
                <h2>Local dates and transition times</h2>
                <p>
                  Send a local calendar date, coordinates and an IANA zone such as Asia/Kolkata. The
                  adapter accepts years 1900–2100. Availability depends on the date and location.
                  Transition timestamps include the UTC offset and can fall on the next local day.
                </p>
                <p>
                  This example is for New Delhi on November 15, 2026. Sunrise and sunset are local
                  times. Use the location’s time zone when displaying them. For a single timestamp,
                  use the <Link href="/astrology-api/instant-panchang">Instant Panchang API</Link>.
                </p>
              </>
            )}
            <h2>Reference</h2>
            <p>
              <Link href={item.docs}>Read the endpoint reference</Link> ·{' '}
              <Link href={item.guide}>Integration guide</Link>
              {item.sandbox && (
                <>
                  {' '}
                  · <a href={item.sandbox}>Try this calculation in the sandbox</a>
                </>
              )}
            </p>
            {related.length > 0 && (
              <>
                <h2>
                  Related {page.category === 'Core astrology' ? 'core' : page.category} capabilities
                </h2>
                <ul>
                  {related.map((entry) => (
                    <li key={entry.path}>
                      <Link href={entry.path}>{entry.label}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p>
              <Link href="/astrology-api">Browse all astrology capabilities</Link>
            </p>
          </div>
          <div className="mh-stack">
            <CodePanel title={item.path} method={item.method} code={item.request} />
            <CodePanel title={item.responseLabel} status="200 OK" json={item.response} />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
