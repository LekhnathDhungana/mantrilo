import { useEffect, useRef, useState } from 'react';
import type { SignFocus } from '../data/calculator-pages';
import { KeyButton } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';

// The free sign calculator. It calls the API's keyless public endpoints (limited per visitor):
// /v1/public/places to find the birthplace and /v1/public/signs for the result. Birth details
// live only in this component's state.

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.mantrilo.com').replace(/\/+$/, '');

type Place = {
  name: string;
  country?: string;
  state?: string | null;
  district?: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
};
type Western = { number: number; name: string; degreesWithinSign: number; possible?: string[] };
type Vedic = {
  rashi: { number: number; name: string; english: string };
  degreesWithinRashi: number | null;
  nakshatra: { number: number; name: string; pada: number | null; lord: string | null } | null;
};
type Result = {
  datetime: string;
  timezone: string;
  timeKnown: boolean;
  western: { sun: Western; moon: Western; rising: Western | null };
  vedic: { sun: Vedic; moon: Vedic; lagna: Vedic | null };
};

const GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'];
const MODES = ['Cardinal', 'Fixed', 'Mutable'];
const RULERS = [
  'Mars',
  'Venus',
  'Mercury',
  'Moon',
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Saturn',
  'Jupiter',
];
const DEVANAGARI = [
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

const placeLabel = (place: Place) =>
  [place.name, place.district !== place.name ? place.district : null, place.state, place.country]
    .filter(Boolean)
    .join(', ');
const degrees = (value: number | null) => {
  if (value === null) return '';
  const whole = Math.floor(value);
  return `${whole}°${String(Math.floor((value - whole) * 60)).padStart(2, '0')}′`;
};

function westernFacts(number: number) {
  const i = number - 1;
  return `${ELEMENTS[i % 4]} · ${MODES[i % 3]} · ruled by ${RULERS[i]}`;
}

type CardProps = {
  label: string;
  sub: string;
  number: number;
  name: string;
  detail: string;
  note?: string;
  primary?: boolean;
  devanagari?: boolean;
};
function SignCard({ label, sub, number, name, detail, note, primary, devanagari }: CardProps) {
  return (
    <div className={primary ? 'mh-sign is-primary' : 'mh-sign'}>
      <span className="mh-sign-glyph" aria-hidden="true">
        {GLYPHS[number - 1]}
      </span>
      <div>
        <p className="mh-sign-label">
          {label} <span>{sub}</span>
        </p>
        <p className="mh-sign-name">
          {name}
          {devanagari && (
            <span lang="sa-Deva" className="mh-sign-deva">
              {DEVANAGARI[number - 1]}
            </span>
          )}
        </p>
        <p className="mh-sign-detail">{detail}</p>
        {note && <p className="mh-sign-note">{note}</p>}
      </div>
    </div>
  );
}

function Missing({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="mh-sign is-missing">
      <span className="mh-sign-glyph" aria-hidden="true">
        ?
      </span>
      <div>
        <p className="mh-sign-label">
          {label} <span>{sub}</span>
        </p>
        <p className="mh-sign-detail">Add your birth time to calculate this.</p>
      </div>
    </div>
  );
}

function Results({ result, focus }: { result: Result; focus: SignFocus }) {
  const { western, vedic } = result;
  const vedicDetail = (row: Vedic, lord: string) =>
    `${row.rashi.english} · ${degrees(row.degreesWithinRashi)} · lord ${lord}`;
  const rashiLord = (row: Vedic) => RULERS[row.rashi.number - 1];
  const moonNote = western.moon.possible
    ? `The Moon moved from ${western.moon.possible[0]} to ${western.moon.possible[1]} that day. Add your birth time to be sure.`
    : undefined;
  const nak = vedic.moon.nakshatra;

  const cards: Record<Exclude<SignFocus, 'all'>, React.ReactNode> = {
    sun: (
      <SignCard
        key="sun"
        label="Sun sign"
        sub="Western"
        primary={focus === 'sun'}
        number={western.sun.number}
        name={western.sun.name}
        detail={`${degrees(western.sun.degreesWithinSign)} · ${westernFacts(western.sun.number)}`}
      />
    ),
    moon: (
      <SignCard
        key="moon"
        label="Moon sign"
        sub="Western"
        primary={focus === 'moon'}
        number={western.moon.number}
        name={western.moon.name}
        detail={`${degrees(western.moon.degreesWithinSign)} · ${westernFacts(western.moon.number)}`}
        note={moonNote}
      />
    ),
    rising: western.rising ? (
      <SignCard
        key="rising"
        label="Rising sign"
        sub="Ascendant"
        primary={focus === 'rising'}
        number={western.rising.number}
        name={western.rising.name}
        detail={`${degrees(western.rising.degreesWithinSign)} · ${westernFacts(western.rising.number)}`}
      />
    ) : (
      <Missing key="rising" label="Rising sign" sub="Ascendant" />
    ),
    rashi: (
      <SignCard
        key="rashi"
        label="Rashi"
        sub="Vedic Moon sign"
        devanagari
        primary={focus === 'rashi'}
        number={vedic.moon.rashi.number}
        name={vedic.moon.rashi.name}
        detail={vedicDetail(vedic.moon, rashiLord(vedic.moon))}
        note={
          result.timeKnown ? undefined : 'Calculated for midday. Add your birth time to be sure.'
        }
      />
    ),
    lagna: vedic.lagna ? (
      <SignCard
        key="lagna"
        label="Lagna"
        sub="Vedic ascendant"
        devanagari
        primary={focus === 'lagna'}
        number={vedic.lagna.rashi.number}
        name={vedic.lagna.rashi.name}
        detail={vedicDetail(vedic.lagna, rashiLord(vedic.lagna))}
        note={
          vedic.lagna.nakshatra
            ? `In ${vedic.lagna.nakshatra.name} nakshatra, pada ${vedic.lagna.nakshatra.pada}`
            : undefined
        }
      />
    ) : (
      <Missing key="lagna" label="Lagna" sub="Vedic ascendant" />
    ),
    nakshatra: nak ? (
      <div key="nakshatra" className={focus === 'nakshatra' ? 'mh-sign is-primary' : 'mh-sign'}>
        <span className="mh-sign-glyph mh-sign-star" aria-hidden="true">
          ✦
        </span>
        <div>
          <p className="mh-sign-label">
            Nakshatra <span>Birth star</span>
          </p>
          <p className="mh-sign-name">{nak.name}</p>
          <p className="mh-sign-detail">
            {nak.number} of 27{nak.pada ? ` · pada ${nak.pada}` : ''}
            {nak.lord ? ` · lord ${nak.lord}` : ''}
          </p>
          {!result.timeKnown && (
            <p className="mh-sign-note">
              Calculated for midday. The Moon changes Nakshatra about once a day, so add your birth
              time to be sure.
            </p>
          )}
        </div>
      </div>
    ) : null,
  };
  const vedicSun = (
    <SignCard
      key="vedic-sun"
      label="Sun sign"
      sub="Vedic"
      devanagari
      number={vedic.sun.rashi.number}
      name={vedic.sun.rashi.name}
      detail={vedicDetail(vedic.sun, rashiLord(vedic.sun))}
    />
  );

  return (
    <div className="mh-signs" aria-live="polite">
      {focus !== 'all' && <div className="mh-signs-lead">{cards[focus]}</div>}
      <div className="mh-signs-grid">
        <section>
          <h3>
            Western <span>Tropical zodiac</span>
          </h3>
          {(['sun', 'moon', 'rising'] as const)
            .filter((key) => key !== focus)
            .map((key) => cards[key])}
        </section>
        <section>
          <h3>
            Vedic <span>Sidereal · Lahiri</span>
          </h3>
          {(['rashi', 'lagna'] as const).filter((key) => key !== focus).map((key) => cards[key])}
          {vedicSun}
          {focus !== 'nakshatra' && cards.nakshatra}
        </section>
      </div>
    </div>
  );
}

export default function SignCalculator({
  focus,
  needsTime,
}: {
  focus: SignFocus;
  needsTime: boolean;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const searchId = useRef(0);

  // Search places as the visitor types, once they pause.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 || (place && placeLabel(place) === query)) return;
    const id = ++searchId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `${API_URL}/v1/public/places?query=${encodeURIComponent(text)}`,
        );
        const body = await response.json();
        if (id !== searchId.current) return;
        if (!response.ok) throw new Error(body?.error?.message || 'Place search failed.');
        setPlaces(body.data.places);
        setOpen(true);
      } catch (failure) {
        if (id === searchId.current) setError((failure as Error).message);
      } finally {
        if (id === searchId.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, place]);

  function choose(next: Place) {
    setPlace(next);
    setQuery(placeLabel(next));
    setPlaces([]);
    setOpen(false);
    setError('');
  }

  async function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!date) return setError('Enter your birth date.');
    if (!place) return setError('Choose your birthplace from the list.');
    if (!unknownTime && !time && needsTime)
      return setError('Enter your birth time, or tick “I don’t know my birth time”.');
    const params = new URLSearchParams({
      date,
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      timezone: place.timezone,
    });
    if (time && !unknownTime) params.set('time', time);
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/v1/public/signs?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || 'The calculation failed.');
      setResult(body.data);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    } catch (failure) {
      setResult(null);
      setError(
        failure instanceof TypeError
          ? 'Could not reach the calculator. Check your connection and try again.'
          : (failure as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }

  const request = result && {
    operation: 'signs',
    birth: {
      datetime: result.datetime,
      latitude: place?.latitude,
      longitude: place?.longitude,
      timezone: result.timezone,
    },
    ...(result.timeKnown ? {} : { timeKnown: false }),
  };

  return (
    <div className="mh-calc">
      <form className="mh-form mh-calc-form" onSubmit={calculate} noValidate>
        <div className="mh-calc-row">
          <label>
            Birth date
            <input
              type="date"
              value={date}
              min="1900-01-01"
              max="2100-12-31"
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label>
            Birth time{!needsTime && <span className="mh-calc-optional"> (optional)</span>}
            <input
              type="time"
              value={unknownTime ? '' : time}
              disabled={unknownTime}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
        </div>
        {needsTime && (
          <label className="mh-calc-check">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={(event) => setUnknownTime(event.target.checked)}
            />
            I don’t know my birth time
          </label>
        )}
        <label className="mh-calc-place">
          Birthplace
          <input
            type="text"
            value={query}
            placeholder="Start typing a city, e.g. Kathmandu"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && places.length > 0}
            aria-controls="mh-calc-places"
            aria-autocomplete="list"
            onChange={(event) => {
              setQuery(event.target.value);
              setPlace(null);
              if (event.target.value.trim().length < 2) setPlaces([]);
            }}
            onFocus={() => places.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {searching && <span className="mh-calc-spinner" aria-hidden="true" />}
          {open && places.length > 0 && (
            <ul id="mh-calc-places" role="listbox" className="mh-calc-places">
              {places.map((option) => (
                <li
                  key={`${option.latitude},${option.longitude}`}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                >
                  <strong>{option.name}</strong>
                  <span>
                    {[option.state, option.country].filter(Boolean).join(', ')} · {option.timezone}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {open && !searching && query.trim().length >= 2 && !place && places.length === 0 && (
            <span className="mh-calc-hint">No matching places. Try a nearby larger city.</span>
          )}
        </label>
        {error && (
          <p className="mh-calc-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="mh-btn mh-btn-primary" disabled={busy}>
          {busy ? 'Calculating…' : 'Calculate my signs'}
        </button>
        <p className="mh-calc-privacy">Your birth details are not stored.</p>
      </form>

      <div ref={resultRef} className="mh-calc-result">
        {result && (
          <>
            <Results result={result} focus={focus} />
            <details className="mh-calc-api">
              <summary>Building an app? See this as an API call</summary>
              <p>
                This result comes from Mantrilo’s astrology API. Send the same request from your
                server with an API key and you get the same JSON back.
              </p>
              <CodePanel
                title="/v1/astrology/calculate"
                method="POST"
                lang="curl"
                wrap
                code={`curl https://api.mantrilo.com/v1/astrology/calculate \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(request)}'`}
              />
              <CodePanel
                title="Response"
                status="200 OK"
                json={{ data: { operation: 'signs', ...result } }}
              />
              <KeyButton>Get a free API key</KeyButton>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
