import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="billing" />;
}
export function generateMetadata() {
  return { title: 'Usage & billing | Mantrilo Console', robots: 'noindex,nofollow' };
}
