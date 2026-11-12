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
        {page === 'docs'
          ? 'API documentation'
          : page === 'implementation'
            ? 'Implementation guides'
            : page === 'access'
              ? 'Request access'
              : page === 'license'
                ? 'Content license status'
                : page === 'privacy'
                  ? 'Privacy & data'
                  : 'Website terms status'}
      </Text>
      <Text style={styles.body}>
        {page === 'access'
          ? 'Open the website in a browser to request API access. No account or purchase is created here.'
          : page === 'docs' || page === 'implementation'
            ? 'Open the website in a browser for the full API documentation. Keep all API keys on your server.'
            : page === 'license'
              ? 'Content license documentation has not been supplied. Paid plans include available content for commercial integration subject to the documented content license. This page does not grant content rights.'
              : page === 'privacy'
                ? 'A final operator privacy policy has not been supplied. This app does not submit access requests or collect payments.'
                : 'Final service terms have not been supplied. No account provisioning, billing, or production API access is connected.'}
      </Text>
    </ScrollView>
  );
}
