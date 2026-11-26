import { useEffect, useRef, useState } from 'react';
import type { SignFocus } from '../data/calculator-pages';
import { KeyButton } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { useI18n } from '../i18n';
import type { TFunction } from 'i18next';

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

// Element, modality and planet names are display labels; sign and nakshatra names come from the
// API and stay as returned.
const planet = (t: TFunction, name: string) => t(`calc.planets.${name}`) || name;
function westernFacts(t: TFunction, number: number) {
  const i = number - 1;
  return t('calc.westernFacts', {
    element: t(`calc.elements.${ELEMENTS[i % 4]}`),
    mode: t(`calc.modes.${MODES[i % 3]}`),
    ruler: planet(t, RULERS[i]),
  });
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
  const { t } = useI18n();
  return (
    <div className="mh-sign is-missing">
      <span className="mh-sign-glyph" aria-hidden="true">
        ?
      </span>
      <div>
        <p className="mh-sign-label">
          {label} <span>{sub}</span>
        </p>
        <p className="mh-sign-detail">{t('calc.addTime')}</p>
      </div>
    </div>
  );
}

function Results({ result, focus }: { result: Result; focus: SignFocus }) {
  const { western, vedic } = result;
  const { t, number } = useI18n();
  const vedicDetail = (row: Vedic, lord: string) =>
    `${row.rashi.english} · ${degrees(row.degreesWithinRashi)} · ${t('calc.lord', { lord: planet(t, lord) })}`;
  const rashiLord = (row: Vedic) => RULERS[row.rashi.number - 1];
  const moonNote = western.moon.possible
    ? t('calc.moonMoved', { from: western.moon.possible[0], to: western.moon.possible[1] })
    : undefined;
  const western_ = t('calc.western');
  const nak = vedic.moon.nakshatra;

  const cards: Record<Exclude<SignFocus, 'all'>, React.ReactNode> = {
    sun: (
      <SignCard
        key="sun"
        label={t('calc.sun')}
        sub={western_}
        primary={focus === 'sun'}
        number={western.sun.number}
        name={western.sun.name}
        detail={`${degrees(western.sun.degreesWithinSign)} · ${westernFacts(t, western.sun.number)}`}
      />
    ),
    moon: (
      <SignCard
        key="moon"
        label={t('calc.moon')}
        sub={western_}
        primary={focus === 'moon'}
        number={western.moon.number}
        name={western.moon.name}
        detail={`${degrees(western.moon.degreesWithinSign)} · ${westernFacts(t, western.moon.number)}`}
        note={moonNote}
      />
    ),
    rising: western.rising ? (
      <SignCard
        key="rising"
        label={t('calc.rising')}
        sub={t('calc.ascendant')}
        primary={focus === 'rising'}
        number={western.rising.number}
        name={western.rising.name}
        detail={`${degrees(western.rising.degreesWithinSign)} · ${westernFacts(t, western.rising.number)}`}
      />
    ) : (
      <Missing key="rising" label={t('calc.rising')} sub={t('calc.ascendant')} />
    ),
    rashi: (
      <SignCard
        key="rashi"
        label={t('calc.rashi')}
        sub={t('calc.vedicMoon')}
        devanagari
        primary={focus === 'rashi'}
        number={vedic.moon.rashi.number}
        name={vedic.moon.rashi.name}
        detail={vedicDetail(vedic.moon, rashiLord(vedic.moon))}
        note={result.timeKnown ? undefined : t('calc.midday')}
      />
    ),
    lagna: vedic.lagna ? (
      <SignCard
        key="lagna"
        label={t('calc.lagna')}
        sub={t('calc.vedicAscendant')}
        devanagari
        primary={focus === 'lagna'}
        number={vedic.lagna.rashi.number}
        name={vedic.lagna.rashi.name}
        detail={vedicDetail(vedic.lagna, rashiLord(vedic.lagna))}
        note={
          vedic.lagna.nakshatra
            ? t('calc.inNakshatra', {
                name: vedic.lagna.nakshatra.name,
                pada: vedic.lagna.nakshatra.pada == null ? '' : number(vedic.lagna.nakshatra.pada),
              })
            : undefined
        }
      />
    ) : (
      <Missing key="lagna" label={t('calc.lagna')} sub={t('calc.vedicAscendant')} />
    ),
    nakshatra: nak ? (
      <div key="nakshatra" className={focus === 'nakshatra' ? 'mh-sign is-primary' : 'mh-sign'}>
        <span className="mh-sign-glyph mh-sign-star" aria-hidden="true">
          ✦
        </span>
        <div>
          <p className="mh-sign-label">
            {t('calc.nakshatra')} <span>{t('calc.birthStar')}</span>
          </p>
          <p className="mh-sign-name">{nak.name}</p>
          <p className="mh-sign-detail">
            {t('calc.ofTotal', { n: number(nak.number), total: number(27) })}
            {nak.pada ? ` · ${t('calc.pada', { n: number(nak.pada) })}` : ''}
            {nak.lord ? ` · ${t('calc.lord', { lord: planet(t, nak.lord) })}` : ''}
          </p>
          {!result.timeKnown && <p className="mh-sign-note">{t('calc.middayNakshatra')}</p>}
        </div>
      </div>
    ) : null,
  };
  const vedicSun = (
    <SignCard
      key="vedic-sun"
      label={t('calc.sun')}
      sub={t('calc.vedic')}
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
            {western_} <span>{t('calc.tropical')}</span>
          </h3>
          {(['sun', 'moon', 'rising'] as const)
            .filter((key) => key !== focus)
            .map((key) => cards[key])}
        </section>
        <section>
          <h3>
            {t('calc.vedic')} <span>{t('calc.sidereal')}</span>
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
  const { t } = useI18n();
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
        if (!response.ok) throw new Error(body?.error?.message || t('calc.errors.places'));
        setPlaces(body.data.places);
        setOpen(true);
      } catch (failure) {
        if (id === searchId.current) setError((failure as Error).message);
      } finally {
        if (id === searchId.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, place, t]);

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
    if (!date) return setError(t('calc.errors.date'));
    if (!place) return setError(t('calc.errors.place'));
    if (!unknownTime && !time && needsTime)
      return setError(t('calc.errors.time', { unknown: t('calc.unknownTime') }));
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
      if (!response.ok) throw new Error(body?.error?.message || t('calc.errors.failed'));
      setResult(body.data);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    } catch (failure) {
      setResult(null);
      setError(
        failure instanceof TypeError ? t('calc.errors.network') : (failure as Error).message,
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
            {t('calc.birthDate')}
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
            {t('calc.birthTime')}
            {!needsTime && <span className="mh-calc-optional"> {t('calc.optional')}</span>}
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
            {t('calc.unknownTime')}
          </label>
        )}
        <label className="mh-calc-place">
          {t('calc.birthplace')}
          <input
            type="text"
            value={query}
            placeholder={t('calc.placePlaceholder')}
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
            <span className="mh-calc-hint">{t('calc.noPlaces')}</span>
          )}
        </label>
        {error && (
          <p className="mh-calc-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="mh-btn mh-btn-primary" disabled={busy}>
          {busy ? t('calc.calculating') : t('calc.submit')}
        </button>
        <p className="mh-calc-privacy">{t('calc.privacy')}</p>
      </form>

      <div ref={resultRef} className="mh-calc-result">
        {result && (
          <>
            <Results result={result} focus={focus} />
            <details className="mh-calc-api">
              <summary>{t('calc.apiSummary')}</summary>
              <p>{t('calc.apiCopy')}</p>
              <CodePanel
                title="/v1/astrology/calculate"
                method="POST"
                lang="curl"
                wrap
                code={`curl https://api.mantrilo.com/v1/astrology/calculate \\\n  -H "Authorization: Bearer $MANTRILO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(request)}'`}
              />
              <CodePanel
                title={t('calc.response')}
                status="200 OK"
                json={{ data: { operation: 'signs', ...result } }}
              />
              <KeyButton>{t('calc.getKey')}</KeyButton>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
