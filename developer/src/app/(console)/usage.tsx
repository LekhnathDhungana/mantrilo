import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="usage" />;
}
export function generateMetadata() {
  return { title: 'Usage | Mantrilo Console', robots: 'noindex,nofollow' };
}
