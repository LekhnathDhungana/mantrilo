import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="blog" />;
}
export function generateMetadata() {
  return { title: 'Blog | Mantrilo Console', robots: 'noindex,nofollow' };
}
