import { Text, View } from 'react-native';
export default function Screen({page}:{page:string}){return <View><Text style={{fontSize:24,textTransform:'capitalize'}}>{page}</Text><Text>Open the responsive web console to use protected workspace operations. No account data is loaded in this native fallback.</Text></View>;}
