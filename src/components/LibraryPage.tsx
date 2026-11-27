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
        Explore mantras, recordings, Sanskrit scriptures, English retellings of the Ramayana and
        Mahabharata, and astrology calculations.
      </Text>
      <Link href="/books-api" style={styles.link}>
        Explore the Books API →
      </Link>
      <Link href="/contact" style={styles.link}>
        Request API access →
      </Link>
    </ScrollView>
  );
}
