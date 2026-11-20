import { Image } from 'react-native';

export function Rosette({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <circle cx="120" cy="120" r="113" stroke="currentColor" strokeWidth=".6" />
      <circle cx="120" cy="120" r="102" stroke="currentColor" strokeWidth=".6" />
      {Array.from({ length: 16 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 22.5} 120 120)`}>
          <ellipse cx="120" cy="79" rx="22" ry="61" stroke="currentColor" strokeWidth=".65" />
          <path d="M120 10 L124 19 L120 27 L116 19 Z" fill="currentColor" />
        </g>
      ))}
      <circle cx="120" cy="120" r="29" fill="var(--paper)" stroke="currentColor" strokeWidth=".7" />
      <path d="M120 102 Q140 120 120 138 Q100 120 120 102Z" stroke="currentColor" />
      <circle cx="120" cy="120" r="4" fill="currentColor" />
    </svg>
  );
}

const logo = require('../../developer/assets/mantrilo-logo.png');
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
