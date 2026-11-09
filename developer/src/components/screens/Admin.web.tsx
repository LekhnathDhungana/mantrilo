import { useState } from 'react';
import { Link } from 'expo-router';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { Badge, ErrorNotice, formatBytes, Loading, PageTitle, useLoad } from '../ui.web';

export default function Administrator() {
  const { session } = useConsole();
  return session?.user.admin ? (
    <AdminControls />
  ) : (
    <>
      <PageTitle
        eyebrow="ACCESS CONTROL"
        title="Administrator access required"
        copy="This account does not have administrator permissions."
      />
      <div className="notice error" role="alert">
        Administrator operations are enforced by the backend. Contact your administrator for access.
      </div>
    </>
  );
}
function AdminControls() {
  const { session } = useConsole();
  const workspaces = useLoad<{
    workspaces: {
      id: string;
      name: string;
      plan: string;
      products: number;
      usage: { contentRequests: number; audioBytes: number };
    }[];
  }>('/api/admin/workspaces');
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function provision(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setPending(true);
    try {
      await mutate('/api/admin/workspaces', 'POST', { name: f.get('name'), email: f.get('email') });
      await workspaces.reload();
      setNotice('Workspace assigned to the existing Firebase account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not provision workspace.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION · PRIVILEGED"
        title="Administrator workspace"
        copy="Customer workspaces and connection status. Every action is authorized server-side."
      />
      <ErrorNotice message={error || workspaces.error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Customer workspaces</h2>
          <Badge>FIRST 100 RECORDS</Badge>
        </div>
        {workspaces.loading ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Content plan</th>
                  <th>Products</th>
                  <th>Content requests</th>
                  <th>Audio delivery</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.data?.workspaces.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <strong>{w.name}</strong>
                      <code className="table-code">{w.id}</code>
                    </td>
                    <td>{w.plan}</td>
                    <td>{w.products}</td>
                    <td>{w.usage.contentRequests}</td>
                    <td>{formatBytes(w.usage.audioBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="settings-grid">
        <section className="panel prose">
          <div className="panel-heading">
            <h2>Integration status</h2>
          </div>
          <ul className="integration-status">
            <li>
              <span>Authentication & metadata</span>
              <Badge tone="green">
                {session?.mode === 'demo' ? 'Local demo' : 'Firebase / Firestore'}
              </Badge>
            </li>
            <li>
              <span>Production catalog</span>
              <Badge>Not connected</Badge>
            </li>
            <li>
              <span>Cloud Storage audio delivery</span>
              <Badge>Not connected</Badge>
            </li>
            <li>
              <span>Billing provider</span>
              <Badge>Setup required</Badge>
            </li>
            <li>
              <span>Astrology engine</span>
              <Badge tone="green">Sandbox available</Badge>
            </li>
          </ul>
          <Link href="/billing" className="text-link">
            Review plan definitions →
          </Link>
        </section>
      </div>
      <section className="panel form-panel">
        <h2>Provision a customer workspace</h2>
        <p className="small muted">
          Use an existing Firebase Authentication account. This does not create a paid subscription
          or change entitlements.
        </p>
        <form className="inline-form" onSubmit={provision}>
          <label>
            Customer email
            <input name="email" type="email" required disabled={session?.mode === 'demo'} />
          </label>
          <label>
            Workspace name
            <input name="name" maxLength={80} required disabled={session?.mode === 'demo'} />
          </label>
          <button className="button" disabled={pending || session?.mode === 'demo'}>
            Assign Sandbox workspace
          </button>
        </form>
        {session?.mode === 'demo' && (
          <p className="small muted">Customer provisioning is unavailable in local demo mode.</p>
        )}
      </section>
    </>
  );
}
