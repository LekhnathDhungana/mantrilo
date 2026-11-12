import { useState } from 'react';
import { Link, Redirect, Slot, usePathname, router } from 'expo-router';
import Brand from './Brand.web';
import { useConsole } from './Session.web';
import { mutate } from '../lib/api';
// Line icons, 24px grid, drawn with currentColor.
const ICONS = {
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  key: 'M14.5 9.5a4 4 0 11-1.2-2.8M13 11l7 7M17 15l2-2M15 17l2-2',
  play: 'M8 5.5v13l10-6.5z',
  docs: 'M6 3.5h8l4 4V20.5H6zM14 3.5V8h4M9 12h6M9 16h6',
  library: 'M5 4.5h4v15H5zM10 4.5h4v15h-4zM15.5 5l3.5-.8 2.9 14.6-3.5.7z',
  guide: 'M4 6h7a3 3 0 013 3v11a2 2 0 00-2-2H4zM20 6h-6M20 6v12h-6',
  usage: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  admin: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2.2.2-1.3-1.5L17 4.5 14 3l-1.3 1.8h-1.4L10 3 7 4.5l.5 2.2-1.3 1.5L4 8l-1 3 2 1-.1 1.6L3 15l1 3 2.2-.2 1.3 1.5L7 21.5 10 23l1.3-1.8h1.4L14 23l3-1.5-.5-2.2 1.3-1.5 2.2.2 1-3-2-1z',
  signout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
} as const;

export function NavIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export const navigation = [
  ['/', 'home', 'Overview'],
  ['/keys', 'key', 'API keys'],
  ['/docs', 'play', 'API Explorer & docs'],
  ['/library', 'library', 'Library'],
  ['/implementation', 'guide', 'Implementation'],
  ['/billing', 'usage', 'Usage & billing'],
] as const;

// The environment the workspace's plan and usage are about: sandbox until a paid plan adds live.
export function environmentLabel(lane: 'sandbox' | 'live' | 'live-test') {
  return lane === 'sandbox' ? 'Sandbox' : lane === 'live' ? 'Live' : 'Live · test billing';
}
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
  if (!session || !session.user.onboarded) return <Redirect href="/login" />;
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
          {menu ? 'Close' : 'Menu'}
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
        <div className="nav-caption">Workspace</div>
        <nav aria-label="Console navigation">
          {navigation.map(([url, icon, label]) => (
            <Link
              key={url}
              href={url}
              className={pathname === url ? 'nav-item active' : 'nav-item'}
              aria-current={pathname === url ? 'page' : undefined}
              onPress={() => setMenu(false)}
            >
              <NavIcon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        {session.user.admin && (
          <div className="admin-nav">
            <div className="nav-caption">Administration</div>
            <Link
              href="/admin"
              className={pathname === '/admin' ? 'nav-item active' : 'nav-item'}
              onPress={() => setMenu(false)}
            >
              <NavIcon name="admin" />
              Administrator
            </Link>
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="account">
            <span className="user-avatar">{session.user.email.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{session.user.admin ? 'Administrator' : 'Developer'}</strong>
              <small>{session.user.email}</small>
            </div>
            <Link href="/settings" className="signout" aria-label="Settings">
              <NavIcon name="settings" />
            </Link>
            <button className="signout" onClick={logout} title="Sign out" aria-label="Sign out">
              <NavIcon name="signout" />
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
              : navigation.find((n) => n[0] === pathname)?.[2] || 'Settings'}
          </span>
          <div>
            <Link
              href="/keys"
              className={`environment-pill env-${session.usageLane === 'sandbox' ? 'sandbox' : 'live'}`}
              aria-label={`Environment: ${environmentLabel(session.usageLane)}. Open API keys`}
            >
              <i />
              {environmentLabel(session.usageLane)}
            </Link>
            <Link href="/billing" className="plan-pill">
              {session.plan.name} plan
            </Link>
          </div>
        </header>
        {session.mode === 'demo' && (
          <div className="demo-banner">
            <b>Local demo</b>
            <span>
              Local workspace data. Real astrology calculations; no billing. Resets on server
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
