import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { Badge, Empty, formatBytes, formatDate, Meter, PageTitle } from '../ui.web';
import type { Activity } from '../../lib/types';

export default function Overview() {
  const { session } = useConsole();
  if (!session) return null;
  const s = session;
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE OVERVIEW"
        title="A clear view of your integration."
        copy="Your content, credentials, and usage. All in one place."
        action={
          <Link href="/keys" className="button">
            Create an API key <span>↗</span>
          </Link>
        }
      />
      <div className="plan-strip">
        <div>
          <span className="strip-label">CONTENT PLAN</span>
          <strong>
            {s.plan.name} <Badge>{s.plan.price ? `$${s.plan.price}/month` : 'Free'}</Badge>
          </strong>
        </div>
        <div>
          <span className="strip-label">ASTROLOGY</span>
          <strong>
            Calculation sandbox <Badge tone="green">Available</Badge>
          </strong>
        </div>
        <div>
          <span className="strip-label">METERING WINDOW · UTC</span>
          <strong>{s.period}</strong>
          <small>Billing period not available</small>
        </div>
        <Link href="/billing" className="text-link">
          View plans ↗
        </Link>
      </div>
      <div className="metrics">
        <Meter
          label="Content requests"
          value={s.usage.contentRequests}
          limit={s.allowance.requests}
          note="Separate monthly content allowance"
        />
        <Meter
          label="Audio delivered"
          value={s.usage.audioBytes}
          limit={s.allowance.audioBytes}
          displayLimit={
            s.allowance.audioBytes ? formatBytes(s.allowance.audioBytes) : 'Samples only'
          }
          note="Data delivered, not storage"
        />
        <Meter
          label="Astrology credits"
          value={s.usage.astrologyCredits}
          limit={s.allowance.astrologyCredits}
          note="Nonbillable sandbox calculations"
        />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Your next steps</h2>
            <Badge>GET STARTED</Badge>
          </div>
          <div className="step-list">
            {[
              [
                '01',
                'Create your first API key',
                'Keep sandbox and production credentials separate.',
                '/keys',
              ],
              [
                '02',
                'Explore the content model',
                'Text, recordings, and book structures in context.',
                '/explorer',
              ],
              [
                '03',
                'Run a sandbox request',
                'Inspect the response and its demo usage cost.',
                '/playground',
              ],
            ].map(([n, t, c, url]) => (
              <Link className="step-row" href={url} key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{c}</p>
                </div>
                <b>↗</b>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            <Link href="/usage" className="text-link">
              View logs →
            </Link>
          </div>
          {s.workspace.logs.length ? (
            <ActivityList logs={s.workspace.logs.slice(0, 5)} />
          ) : (
            <Empty title="A fresh start." icon="↗">
              Create a key or run a sandbox request. Your real console activity will appear here.
            </Empty>
          )}
        </section>
      </div>
      <section className="library-banner">
        <div>
          <div className="eyebrow">THE CONTENT LIBRARY</div>
          <h2>Build with context intact.</h2>
          <p>
            Mantras and shlokas, sacred audio, and shastra books. Astrology calculations use a
            separate credit allowance.
          </p>
        </div>
        <div className="library-glyph" lang="sa" aria-hidden="true">
          ज्ञानम्
        </div>
        <Link href="/explorer" className="button outline">
          Explore content <span>↗</span>
        </Link>
      </section>
      <p className="footnote">
        {s.mode === 'demo'
          ? 'Usage starts at zero. Only successful demo catalog requests move the content meter. No demo activity is billed.'
          : 'Usage comes from server-side workspace records. Production catalog and billing connections are not configured.'}
      </p>
    </>
  );
}
function ActivityList({ logs }: { logs: Activity[] }) {
  return (
    <ul className="activity-list">
      {logs.map((log) => (
        <li key={log.id}>
          <span className={`activity-dot ${log.type === 'error' ? 'bad' : ''}`} />
          <div>
            <strong>{log.message || log.endpoint || log.type.replaceAll('_', ' ')}</strong>
            <small>
              {formatDate(log.at)} · {new Date(log.at).toLocaleTimeString()}{' '}
              {log.status ? `· ${log.status}` : ''}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}
