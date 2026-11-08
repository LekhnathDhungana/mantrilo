import { ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { styles } from './Marketing';
export default function AstrologyPage(){return <ScrollView contentContainerStyle={styles.page}><Link href="/" style={styles.link}>← Mantrilo</Link><Text style={styles.title}>Astrology API</Text><Text style={styles.body}>Astrology integration for apps and websites, with service configuration and credit accounting separate from the content catalog. This preview needs a connected astrology service before it can execute live requests.</Text><Link href="/access?interest=astrology" style={styles.link}>Request astrology access →</Link></ScrollView>;}
