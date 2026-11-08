import { ScrollView, Text } from 'react-native';
import { Slot, Link } from 'expo-router';
export default function Shell(){return <ScrollView contentContainerStyle={{padding:24,paddingTop:70,gap:20}}><Text style={{fontSize:26}}>Mantrilo Developer Console</Text><Text>Use the responsive web console for secure browser sessions and workspace operations.</Text><Link href="/login">Account access</Link><Slot/></ScrollView>;}
