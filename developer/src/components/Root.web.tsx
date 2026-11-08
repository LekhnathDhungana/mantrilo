import { Slot } from 'expo-router';
import SessionProvider from './Session.web';
import './console.css';
export default function Root() {
  return (
    <SessionProvider>
      <Slot />
    </SessionProvider>
  );
}
