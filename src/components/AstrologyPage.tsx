import { ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { styles } from './Marketing';
export default function AstrologyPage() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Link href="/" style={styles.link}>
        ← Mantrilo
      </Link>
      <Text style={styles.title}>Astrology API</Text>
      <Text style={styles.body}>
        Astrology integration for apps and websites, included in every plan. The console backend calculates real planetary positions and instant Panchang elements. The default sidereal offset is approximate, with a custom ayanamsa option.
      </Text>
      <Link href="/access?interest=astrology" style={styles.link}>
        Request astrology access →
      </Link>
    </ScrollView>
  );
}
