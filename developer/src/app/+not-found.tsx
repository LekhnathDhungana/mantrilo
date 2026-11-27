import { Link } from 'expo-router';
import { Text, View } from 'react-native';
export default function NotFound() {
  return (
    <View style={{ padding: 40 }}>
      <Text>Console page not found.</Text>
      <Link href="/">Return to workspace</Link>
    </View>
  );
}
