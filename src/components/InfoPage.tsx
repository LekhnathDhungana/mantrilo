import { ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { styles } from './Marketing';
export default function InfoPage({ page }: { page: string }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Link href="/" style={styles.link}>
        ← Mantrilo
      </Link>
      <Text style={styles.title}>
        {page === 'about'
          ? 'About Mantrilo'
          : page === 'docs'
            ? 'API documentation'
            : page === 'implementation'
              ? 'Implementation guides'
              : page === 'contact'
                ? 'Contact'
                : page === 'license'
                  ? 'Content license status'
                  : page === 'privacy'
                    ? 'Privacy & data'
                    : 'Website terms status'}
      </Text>
      <Text style={styles.body}>
        {page === 'about'
          ? 'Mantrilo provides an API for Hindu content and astrology calculations.'
          : page === 'contact'
            ? 'Open the website in a browser to contact us. Nothing is sent from here.'
            : page === 'docs' || page === 'implementation'
              ? 'Open the website in a browser for the full API documentation. Keep all API keys on your server.'
              : page === 'license'
                ? 'You can reuse original Sanskrit where it is in the public domain. Check the terms for modern editions, translations, and English retellings before distributing them in your app.'
                : page === 'privacy'
                  ? 'A final operator privacy policy has not been supplied. This app does not submit access requests or collect payments.'
                  : 'Final service terms have not been supplied. No account provisioning, billing, or production API access is connected.'}
      </Text>
    </ScrollView>
  );
}
