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
          ? 'Integration guide'
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
          ? 'Access requests and astrology inquiries are not connected to a submission service. Astrology service access requires configuration in this preview. Use the website in a browser to prepare a local request draft. No account or purchase is created.'
          : page === 'docs'
            ? 'Production API endpoints and documentation are not connected. Keep all API keys on your server. Review catalog coverage, monthly allowances, and the content license before integration.'
            : page === 'license'
              ? 'Content license documentation has not been supplied. Paid plans include available content for commercial integration subject to the documented content license. This page does not grant content rights.'
              : page === 'privacy'
                ? 'A final operator privacy policy has not been supplied. This app does not submit access requests or collect payments.'
                : 'Final service terms have not been supplied. No account provisioning, billing, or production API access is connected.'}
      </Text>
    </ScrollView>
  );
}
