import { ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { productPages, type ProductSlug } from '../data/products';
import { styles } from './Marketing';
export default function ProductPage({ slug }: { slug: ProductSlug }) {
  const page = productPages[slug];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Link style={styles.link} href="/">
        ← Mantrilo
      </Link>
      <Text style={styles.title}>{page.title}</Text>
      <Text style={styles.body}>{page.intro}</Text>
      <Text style={styles.body}>{page.status}</Text>
      {page.sections.map((s) => (
        <Text style={styles.body} key={s.title}>
          {s.title}
          {'\n'}
          {s.copy}
        </Text>
      ))}
      <Link href="/access" style={styles.link}>
        Prepare an access request →
      </Link>
    </ScrollView>
  );
}
