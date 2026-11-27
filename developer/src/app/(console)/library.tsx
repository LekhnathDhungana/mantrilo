import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="library" />;
}
export function generateMetadata() {
  return { title: 'Library | Mantrilo Console', robots: 'noindex,nofollow' };
}
