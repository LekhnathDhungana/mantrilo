// The astrology hero's art: the sidereal zodiac with the Sun and Moon where Mantrilo's own sample
// responses put them. The angle between the two is what a Panchang is made of: every 12° of it is
// one tithi. Decorative (the hero marks it aria-hidden); the same values are in the samples.

const RASHI = [
  'मेष',
  'वृषभ',
  'मिथुन',
  'कर्क',
  'सिंह',
  'कन्या',
  'तुला',
  'वृश्चिक',
  'धनु',
  'मकर',
  'कुम्भ',
  'मीन',
];
const TITHI = [
  'प्रतिपदा',
  'द्वितीया',
  'तृतीया',
  'चतुर्थी',
  'पञ्चमी',
  'षष्ठी',
  'सप्तमी',
  'अष्टमी',
  'नवमी',
  'दशमी',
  'एकादशी',
  'द्वादशी',
  'त्रयोदशी',
  'चतुर्दशी',
];
const NAKSHATRA_SPAN = 360 / 27;

export type Sky = {
  /** ISO instant the samples were calculated for. */
  at: string;
  sun: number;
  moon: number;
  tithi: number;
  paksha: string;
  nakshatra: { number: number; name: string; pada: number };
  karana: string;
  moonRashi: string;
};

type Json = Record<string, any>;

/** Reads the positions and panchang samples. Null if either is missing a field the art needs. */
export function skyFrom(positions: unknown, panchang: unknown): Sky | null {
  const sun = (positions as Json)?.data?.planets?.find((p: Json) => p.body === 'Sun');
  const p = (panchang as Json)?.data?.panchang;
  if (!sun || !p?.moonRashi || !p.tithi || !p.nakshatra) return null;
  return {
    at: (panchang as Json).data.datetimeUtc,
    sun: sun.siderealLongitudeDegrees,
    moon: (p.moonRashi.number - 1) * 30 + p.moonRashi.degreesWithin,
    tithi: p.tithi.numberWithinPaksha ?? p.tithi.number,
    paksha: p.tithi.paksha,
    nakshatra: p.nakshatra,
    karana: p.karana?.name ?? '',
    moonRashi: `${p.moonRashi.name} ${p.moonRashi.degreesWithin.toFixed(2)}°`,
  };
}

const C = 200;
// Longitude 0 (the start of Mesha) sits at 9 o'clock and the zodiac runs counterclockwise, as on a
// printed chart.
function at(lon: number, r: number): [number, number] {
  const a = ((180 + lon) * Math.PI) / 180;
  return [+(C + r * Math.cos(a)).toFixed(2), +(C - r * Math.sin(a)).toFixed(2)];
}
function band(from: number, to: number, inner: number, outer: number) {
  const large = to - from > 180 ? 1 : 0;
  const [a, b, c, d] = [at(from, outer), at(to, outer), at(to, inner), at(from, inner)];
  return `M${a} A${outer} ${outer} 0 ${large} 0 ${b} L${c} A${inner} ${inner} 0 ${large} 1 ${d} Z`;
}
function arc(from: number, to: number, r: number) {
  const span = (((to - from) % 360) + 360) % 360;
  return `M${at(from, r)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 0 ${at(to, r)}`;
}

export function SkyWheel({ sky }: { sky: Sky }) {
  const sunSign = Math.floor(sky.sun / 30);
  const moonSign = Math.floor(sky.moon / 30);
  const star = (sky.nakshatra.number - 1) * NAKSHATRA_SPAN;
  const span = (((sky.moon - sky.sun) % 360) + 360) % 360;
  const tithiName =
    sky.tithi === 15 ? (sky.paksha === 'Krishna' ? 'अमावस्या' : 'पूर्णिमा') : TITHI[sky.tithi - 1];
  const [sunX, sunY] = at(sky.sun, 108);
  const [moonX, moonY] = at(sky.moon, 108);
  return (
    <svg className="mx-sky" viewBox="0 0 400 400" role="presentation">
      <defs>
        <radialGradient id="mx-sky-sun">
          <stop offset="0%" stopColor="var(--saffron)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--saffron)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mx-sky-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--saffron)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--saffron)" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <circle className="mx-sky-face" cx={C} cy={C} r={190} />
      <g className="mx-sky-sweep" style={{ transformOrigin: `${C}px ${C}px` }}>
        <path d={band(0, 24, 0, 150)} fill="url(#mx-sky-sweep)" />
      </g>

      {/* Rashis: the outer band, with the Sun's and Moon's signs lit. */}
      {[sunSign, moonSign].map((sign, i) => (
        <path key={i} className="mx-sky-lit" d={band(sign * 30, sign * 30 + 30, 150, 190)} />
      ))}
      <circle className="mx-sky-ring" cx={C} cy={C} r={190} />
      <circle className="mx-sky-ring" cx={C} cy={C} r={150} />
      <circle className="mx-sky-ring mx-sky-faint" cx={C} cy={C} r={128} />
      {RASHI.map((name, i) => {
        const [x1, y1] = at(i * 30, 128);
        const [x2, y2] = at(i * 30, 190);
        const [tx, ty] = at(i * 30 + 15, 170);
        return (
          <g key={name}>
            <line className="mx-sky-ring" x1={x1} y1={y1} x2={x2} y2={y2} />
            <text
              className={
                i === sunSign || i === moonSign ? 'mx-sky-rashi is-lit' : 'mx-sky-rashi'
              }
              x={tx}
              y={ty}
              style={{ animationDelay: `${0.25 + i * 0.05}s` }}
            >
              {name}
            </text>
          </g>
        );
      })}

      {/* Nakshatras: 27 ticks inside, with the Moon's star filled. */}
      <path className="mx-sky-star" d={band(star, star + NAKSHATRA_SPAN, 128, 150)} />
      {Array.from({ length: 27 }, (_, i) => {
        const [x1, y1] = at(i * NAKSHATRA_SPAN, 140);
        const [x2, y2] = at(i * NAKSHATRA_SPAN, 150);
        return <line key={i} className="mx-sky-tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}

      {/* The Sun–Moon angle: twelve degrees of it make one tithi. */}
      <circle className="mx-sky-ring mx-sky-faint mx-sky-dash" cx={C} cy={C} r={108} />
      <path
        className="mx-sky-arc"
        d={arc(sky.sun, sky.moon, 108)}
        pathLength={1}
        style={{ ['--mx-arc' as string]: span / 360 }}
      />
      <circle cx={sunX} cy={sunY} r={26} fill="url(#mx-sky-sun)" className="mx-sky-glow" />
      <circle cx={sunX} cy={sunY} r={8} className="mx-sky-sun" />
      <circle cx={moonX} cy={moonY} r={6.5} className="mx-sky-moon" />
      <text className="mx-sky-body" x={at(sky.sun, 84)[0]} y={at(sky.sun, 84)[1]}>
        सूर्य
      </text>
      <text className="mx-sky-body" x={at(sky.moon, 84)[0]} y={at(sky.moon, 84)[1]}>
        चन्द्र
      </text>

      <text className="mx-sky-at" x={C} y={C - 28}>
        {sky.at.slice(0, 16).replace('T', ' · ')} UTC
      </text>
      <text className="mx-sky-tithi" x={C} y={C + 6}>
        {tithiName}
      </text>
      <text className="mx-sky-paksha" x={C} y={C + 38}>
        {sky.paksha === 'Krishna' ? 'कृष्ण पक्ष' : 'शुक्ल पक्ष'} · {span.toFixed(1)}°
      </text>
    </svg>
  );
}
