import { Slot } from 'expo-router';
import SessionProvider from './Session.web';
import './console.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Tiro+Devanagari+Sanskrit:ital@0;1&display=swap';

export default function Root() {
  return (
    <SessionProvider>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <Slot />
    </SessionProvider>
  );
}
