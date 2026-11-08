import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="astrology" />;
}
export function generateMetadata() {
  return { title: 'Astrology | Mantrilo Console', robots: 'noindex,nofollow' };
}
