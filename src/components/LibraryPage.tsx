import { ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { styles } from './Marketing';
export default function LibraryPage() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Link href="/" style={styles.link}>
        ← Mantrilo
      </Link>
      <Text style={styles.title}>Content library</Text>
      <Text style={styles.body}>
        The API serves mantras, recordings linked to mantras, scripture books by collection, and
        astrology calculations. Open the website in a browser for full coverage details.
      </Text>
      <Link href="/access" style={styles.link}>
        Request API access →
      </Link>
    </ScrollView>
  );
}
