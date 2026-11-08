import { useState } from 'react';
import { useConsole } from '../Session.web';
import { Badge, Empty, ErrorNotice, formatBytes, Loading, PageTitle, useLoad } from '../ui.web';
import type { Activity } from '../../lib/types';

export default function Usage() {
  const { session } = useConsole();
  const [from, setFrom] = useState(`${session?.period || new Date().toISOString().slice(0, 7)}-01`),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10)),
    [range, setRange] = useState({ from, to }),
    [metric, setMetric] = useState<'contentRequests' | 'audioBytes' | 'astrologyCredits'>(
      'contentRequests',
    ),
    [page, setPage] = useState(0);
  const { data, error, loading } = useLoad<{
    daily: { day: string; contentRequests: number; audioBytes: number; astrologyCredits: number }[];
    logs: Activity[];
    endpoints: Record<string, number>;
    policy: string;
    logLimit: number;
  }>(`/api/usage?from=${range.from}&to=${range.to}`);
  const labels = {
    contentRequests: 'Content requests',
    audioBytes: 'Audio bytes delivered',
    astrologyCredits: 'Astrology credits',
  };
  const maximum = Math.max(1, ...(data?.daily.map((day) => day[metric]) || []));
  return (
    <>
      <PageTitle
        eyebrow="OBSERVABILITY"
        title="Usage & request logs"
        copy="Separate server-side meters. Inspect activity without exposing credentials or personal inputs."
      />
      <form
        className="date-filter panel"
        onSubmit={(event) => {
          event.preventDefault();
          setRange({ from, to });
          setPage(0);
        }}
      >
        <label>
          From · UTC
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          To · UTC
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button className="button subtle">Apply date range</button>
        <span className="small muted">Up to 94 days</span>
      </form>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="panel">
              <div className="panel-heading">
                <h2>Daily usage</h2>
                <div className="segmented compact">
                  {Object.entries(labels).map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={metric === id}
                      onClick={() => setMetric(id as typeof metric)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {data.daily.length ? (
                <>
                  <svg
                    className="usage-chart"
                    viewBox="0 0 800 200"
                    role="img"
                    aria-label={`${labels[metric]} by day. Values are in the accompanying table.`}
                  >
                    <line x1="20" y1="170" x2="780" y2="170" stroke="#deded3" />
                    {data.daily.map((day, index) => {
                      const width = 730 / data.daily.length;
                      const h = (day[metric] / maximum) * 140;
                      return (
                        <g key={day.day}>
                          <rect
                            x={25 + index * width}
                            y={170 - h}
                            width={Math.min(40, width - 3)}
                            height={Math.max(day[metric] ? 2 : 0, h)}
                            rx="3"
                            fill="#ad4f2d"
                          />
                          <title>
                            {day.day}: {day[metric]}
                          </title>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Date · UTC</th>
                          <th>Content requests</th>
                          <th>Audio delivered</th>
                          <th>Astrology credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily.map((day) => (
                          <tr key={day.day}>
                            <td>{day.day}</td>
                            <td>{day.contentRequests.toLocaleString()}</td>
                            <td>{formatBytes(day.audioBytes)}</td>
                            <td>{day.astrologyCredits.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <Empty title="No metered activity in this period.">
                  Successful demo catalog requests appear here. Keys, settings, and failed requests
                  do not consume demo credits.
                </Empty>
              )}
            </section>
            <div className="notice">{data.policy}</div>
            <section className="panel">
              <div className="panel-heading">
                <h2>Endpoint usage</h2>
                <Badge>SUCCESSFUL REQUESTS</Badge>
              </div>
              {Object.keys(data.endpoints).length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Endpoint</th>
                        <th>Successful requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.endpoints).map(([endpoint, count]) => (
                        <tr key={endpoint}>
                          <td>
                            <code>{endpoint}</code>
                          </td>
                          <td>{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No endpoint usage yet.">
                  Run a supported request to populate endpoint-level totals.
                </Empty>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Recent activity & errors</h2>
                <span className="small muted">Most recent {data.logLimit} retained records</span>
              </div>
              {data.logs.length ? (
                <>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Operation</th>
                          <th>Status</th>
                          <th>Request ID</th>
                          <th>Accounting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.logs.slice(page * 15, page * 15 + 15).map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.at).toLocaleString()}</td>
                            <td>{log.message || log.endpoint || log.type}</td>
                            <td>
                              <Badge tone={log.status >= 400 ? 'red' : 'neutral'}>
                                {log.status}
                              </Badge>
                            </td>
                            <td>
                              <code>{log.requestId || '—'}</code>
                            </td>
                            <td>
                              {log.cost
                                ? `${log.cost.contentRequests} content · ${log.cost.audioBytes} bytes · ${log.cost.astrologyCredits} astrology`
                                : 'No usage charge'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button
                      className="button subtle small-button"
                      disabled={!page}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {page + 1}</span>
                    <button
                      className="button subtle small-button"
                      disabled={(page + 1) * 15 >= data.logs.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <Empty title="No activity recorded.">
                  Events will show status and request identifiers. Secrets and exact birth details
                  are never placed in these general logs.
                </Empty>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
