import Screen from '../../components/Screen';

export default function Page() {
  return <Screen page="implementation" />;
}

export function generateMetadata() {
  return { title: 'Implementation | Mantrilo Console', robots: 'noindex,nofollow' };
}
