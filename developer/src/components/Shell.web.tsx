import { useState } from 'react';
import { Link, Redirect, Slot, usePathname, router } from 'expo-router';
import Brand from './Brand.web';
import { useConsole } from './Session.web';
import { mutate } from '../lib/api';
export const navigation = [
  ['/', '◫', 'Overview'],
  ['/keys', '⌘', 'API keys'],
  ['/explorer', '▤', 'Content explorer'],
  ['/playground', '›_', 'API playground'],
  ['/astrology', '✧', 'Astrology'],
  ['/usage', '↗', 'Usage & logs'],
  ['/billing', '▱', 'Billing & plans'],
  ['/products', '▦', 'Products'],
  ['/settings', '⚙', 'Settings'],
] as const;
export default function Shell() {
  const { session, loading, error, refresh } = useConsole(),
    pathname = usePathname();
  const [menu, setMenu] = useState(false),
    [logoutError, setLogoutError] = useState('');
  if (loading)
    return (
      <div className="full-loading" role="status">
        Loading your workspace…
      </div>
    );
  if (error)
    return (
      <div className="full-loading">
        <h1>Console connection needed.</h1>
        <p role="alert">{error}</p>
        <button className="button" onClick={() => void refresh()}>
          Try again
        </button>
        <Link href="/login">Return to sign in</Link>
      </div>
    );
  if (!session) return <Redirect href="/login" />;
  async function logout() {
    try {
      await mutate('/api/auth/logout', 'POST');
      await refresh();
      router.replace('/login');
    } catch (e) {
      setLogoutError(e instanceof Error ? e.message : 'Could not sign out.');
    }
  }
  return (
    <div className="console-layout">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="mobile-header">
        <Brand />
        <button
          className="icon-button"
          aria-expanded={menu}
          aria-controls="sidebar"
          onClick={() => setMenu(!menu)}
        >
          {menu ? 'Close ✕' : 'Menu ☰'}
        </button>
      </header>
      <aside className={`sidebar ${menu ? 'open' : ''}`} id="sidebar">
        <Link href="/" aria-label="Mantrilo console home">
          <Brand />
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">{session.workspace.name.charAt(0)}</span>
          <div>
            <strong>{session.workspace.name}</strong>
            <small>{session.mode === 'demo' ? 'Demo workspace' : 'Customer workspace'}</small>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Console navigation">
          {navigation.map(([url, icon, label]) => (
            <Link
              key={url}
              href={url}
              className={pathname === url ? 'nav-item active' : 'nav-item'}
              aria-current={pathname === url ? 'page' : undefined}
              onPress={() => setMenu(false)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        {session.user.admin && (
          <div className="admin-nav">
            <div className="nav-caption">ADMINISTRATION</div>
            <Link
              href="/admin"
              className={pathname === '/admin' ? 'nav-item active' : 'nav-item'}
              onPress={() => setMenu(false)}
            >
              <span aria-hidden="true">◇</span>Administrator
            </Link>
          </div>
        )}
        <div className="sidebar-bottom">
          <Link href="/docs" className="nav-item">
            <span aria-hidden="true">↗</span>Integration guide
          </Link>
          <div className="account">
            <span className="user-avatar">{session.user.email.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{session.user.admin ? 'Administrator' : 'Developer'}</strong>
              <small>{session.user.email}</small>
            </div>
            <button className="signout" onClick={logout} title="Sign out" aria-label="Sign out">
              ↪
            </button>
          </div>
          {logoutError && (
            <p className="error-text" role="alert">
              {logoutError}
            </p>
          )}
        </div>
      </aside>
      <div className="console-body">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{' '}
            {pathname === '/admin'
              ? 'Administrator'
              : navigation.find((n) => n[0] === pathname)?.[2] || 'Integration guide'}
          </span>
          <div>
            <span className="environment-pill">
              <i />
              {session.mode === 'demo' ? 'Local sandbox' : 'Authenticated workspace'}
            </span>
            <Link href="/keys" className="topbar-link">
              API keys ↗
            </Link>
          </div>
        </header>
        {session.mode === 'demo' && (
          <div className="demo-banner">
            <b>LOCAL DEMO</b>
            <span>
              Isolated sample data. Server-backed actions; no live API or billing. Resets on server
              restart.
            </span>
          </div>
        )}
        <main id="main" className="main-content">
          <Slot />
        </main>
        <footer className="console-footer">
          <span>Mantrilo Developer Console</span>
          <span>{session.mode === 'demo' ? 'Demo state · Not billable' : 'Private workspace'}</span>
        </footer>
      </div>
    </div>
  );
}
