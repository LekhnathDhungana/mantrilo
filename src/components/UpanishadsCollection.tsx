import { Link } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { styles } from './Marketing';

// Native fallback; the web page lists every Upanishad from its loader.
export default function UpanishadsCollection() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Upanishads</Text>
      <Text style={styles.body}>Read the Upanishads in Sanskrit with English on the web.</Text>
      <Link href="/library" style={styles.link}>
        Library
      </Link>
      <Link href="/docs/guides/upanishads" style={styles.link}>
        Upanishads integration guide
      </Link>
    </ScrollView>
  );
}
