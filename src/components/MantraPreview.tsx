import { Link } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { verse } from '../data/examples';
import { styles } from './Marketing';

export default function MantraPreview() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Link href="/library" style={styles.link}>
        Library
      </Link>
      <Text style={styles.title}>Aham Vaishvanaro Bhutva</Text>
      <Text style={styles.body}>{verse.sanskrit}</Text>
      <Text style={styles.body}>{verse.transliteration}</Text>
      <Link href="/library/books/bhagavad-gita" style={styles.link}>
        Bhagavad Gita
      </Link>
    </ScrollView>
  );
}
