import { Redirect, useLocalSearchParams } from 'expo-router';

// Implementation guides now live under Docs. Keep old links and bookmarks working.
export default function Page() {
  const { guide } = useLocalSearchParams<{ guide?: string }>();
  return <Redirect href={guide ? { pathname: '/docs', params: { guide } } : '/docs'} />;
}

export function generateMetadata() {
  return { title: 'Docs | Mantrilo Console', robots: 'noindex,nofollow' };
}
