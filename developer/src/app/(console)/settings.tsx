import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="settings" />;
}
export function generateMetadata() {
  return { title: 'Settings | Mantrilo Console', robots: 'noindex,nofollow' };
}
