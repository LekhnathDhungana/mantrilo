import { useState } from 'react';
import { useConsole } from '../Session.web';
import { mutate } from '../../lib/api';
import { Badge, Empty, ErrorNotice, formatDate, PageTitle } from '../ui.web';

export default function Products() {
  const { session, refresh } = useConsole();
  const [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [notice, setNotice] = useState('');
  if (!session) return null;
  async function register(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      f = new FormData(form);
    setPending(true);
    setError('');
    try {
      await mutate('/api/products', 'POST', {
        name: f.get('name'),
        type: f.get('type'),
        environment: f.get('environment'),
      });
      form.reset();
      await refresh();
      setNotice('Product registered in this workspace.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Product registration failed.');
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    setPending(true);
    try {
      await mutate(`/api/products/${id}`, 'DELETE');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove product.');
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CUSTOMER PRODUCTS"
        title="Apps & websites"
        copy="Register the products covered by your workspace. Limits are enforced by the server."
      />
      <div className="plan-strip">
        <div>
          <span className="strip-label">CURRENT PLAN</span>
          <strong>{session.plan.name}</strong>
        </div>
        <div>
          <span className="strip-label">REGISTERED PRODUCTS</span>
          <strong>
            {session.workspace.products.length}{' '}
            {session.allowance.products !== null
              ? `/ ${session.allowance.products}`
              : '· Testing only'}
          </strong>
        </div>
      </div>
      <ErrorNotice message={error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel form-panel">
        <h2>Register a product</h2>
        <form className="inline-form" onSubmit={register}>
          <label>
            Product name
            <input name="name" maxLength={80} placeholder="Your app or website" required />
          </label>
          <label>
            Type
            <select name="type">
              <option value="app">App</option>
              <option value="website">Website</option>
            </select>
          </label>
          <label>
            Environment
            <select name="environment">
              <option value="sandbox">Sandbox / testing</option>
              <option value="production" disabled={!session.plan.price}>
                Production
              </option>
            </select>
          </label>
          <button className="button" disabled={pending}>
            {pending ? 'Saving…' : 'Register product'}
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Registered products</h2>
        </div>
        {session.workspace.products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Environment</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {session.workspace.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.type}</td>
                    <td>
                      <Badge>{p.environment}</Badge>
                    </td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <button
                        className="text-button danger"
                        disabled={pending}
                        onClick={() => remove(p.id)}
                      >
                        Remove registration
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No products registered yet.">
            Sandbox is for testing only. Paid plans cover the stated number of apps or websites.
          </Empty>
        )}
      </section>
    </>
  );
}
