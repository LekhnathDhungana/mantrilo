import Screen from '../../components/Screen';
export default function Page() {
  return <Screen page="products" />;
}
export function generateMetadata() {
  return { title: 'Products | Mantrilo Console', robots: 'noindex,nofollow' };
}
