import { Image } from 'react-native';

const logo = require('../../assets/mantrilo-logo.png');
const size = { width: '100%', height: '100%' } as const;

export default function Brand() {
  return (
    <div className="brand">
      <div className="brand-original">
        <Image accessibilityLabel="Mantrilo" source={logo} style={size} resizeMode="contain" />
      </div>
      <div className="brand-light-lettering" aria-hidden="true">
        <Image source={logo} style={size} resizeMode="contain" />
      </div>
    </div>
  );
}
