import type { ReactNode } from 'react';
import { Empty } from './ui.web';
import Overview from './screens/Overview.web';
import Keys from './screens/Keys.web';
import Library from './screens/Library.web';
import Billing from './screens/Billing.web';
import Settings from './screens/Settings.web';
import Administrator from './screens/Admin.web';
import Docs from './screens/Docs.web';
import Blog from './screens/Blog.web';

// Each console route renders one screen; route files pass their page key here.
const screens: Record<string, () => ReactNode> = {
  overview: Overview,
  keys: Keys,
  library: Library,
  billing: Billing,
  settings: Settings,
  admin: Administrator,
  docs: Docs,
  blog: Blog,
};
export default function Screen({ page }: { page: string }) {
  const Component = screens[page];
  return Component ? <Component /> : <Empty title="Page unavailable.">Return to Home.</Empty>;
}
