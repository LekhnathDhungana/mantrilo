import type { ReactNode } from 'react';
import AstrologyCalculator from './AstrologyCalculator.web';
import { Empty } from './ui.web';
import Overview from './screens/Overview.web';
import Keys from './screens/Keys.web';
import Explorer from './screens/Explorer.web';
import Playground from './screens/Playground.web';
import Usage from './screens/Usage.web';
import Billing from './screens/Billing.web';
import Products from './screens/Products.web';
import Settings from './screens/Settings.web';
import Administrator from './screens/Admin.web';
import Docs from './screens/Docs.web';

// Each console route renders one screen; route files pass their page key here.
const screens: Record<string, () => ReactNode> = {
  overview: Overview,
  keys: Keys,
  explorer: Explorer,
  playground: Playground,
  astrology: AstrologyCalculator,
  usage: Usage,
  billing: Billing,
  products: Products,
  settings: Settings,
  admin: Administrator,
  docs: Docs,
};
export default function Screen({ page }: { page: string }) {
  const Component = screens[page];
  return Component ? (
    <Component />
  ) : (
    <Empty title="Page unavailable.">Return to the workspace overview.</Empty>
  );
}
