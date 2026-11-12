import { Image } from 'react-native';

export default function Brand() {
  return (
    <div className="brand">
      <Image
        accessibilityLabel="Mantrilo"
        source={require('../../assets/mantrilo-logo.png')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </div>
  );
}
