import type { ComponentProps } from 'react';
import { Link as RouterLink } from 'expo-router';
import { useI18n } from './index';

// expo-router's Link, pointing at the current language's address for an internal path.
export function Link(props: ComponentProps<typeof RouterLink>) {
  const { href: localize } = useI18n();
  const { href } = props;
  const target =
    typeof href === 'string'
      ? localize(href)
      : href && typeof href === 'object' && typeof href.pathname === 'string'
        ? { ...href, pathname: localize(href.pathname) }
        : href;
  return <RouterLink {...props} href={target as typeof href} />;
}
