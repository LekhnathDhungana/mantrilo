import { useEffect, useId, useState, type ReactNode } from 'react';
import { CopyButton, SourceCode, type Lang } from './Code.web';
import './shlokam.css';

// Shared pieces for the mantra pages and the bookshelf (styles in shlokam.css).

const DIGITS = '०१२३४५६७८९';
export const toDeva = (value: number | string) =>
  String(value).replace(/\d/g, (digit) => DIGITS[Number(digit)]);

export const plural = (count: number, word: string) =>
  `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

/** The drifting stripes behind a hero. */
export function Ribbon() {
  return <div className="mx-ribbon" aria-hidden="true" />;
}

export function EndpointPill({ path, method = 'GET' }: { path: string; method?: string }) {
  return (
    <div className="mx-endpoint">
      <span className="mx-method">{method}</span>
      <code>{path}</code>
      <CopyButton text={path} />
    </div>
  );
}

export function Checks({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <ul className={`mx-checks ${className}`}>
      {items.map((item) => (
        <li key={item}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Hero numbers. The exported HTML holds the final values; once the page runs they count up. */
export function Stats({ items }: { items: [number, string][] }) {
  const [progress, setProgress] = useState(1);
  const [counting, setCounting] = useState(false);
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let start = 0;
    const step = (now: number) => {
      setCounting(true);
      if (still) return;
      start ||= now;
      const t = Math.min(1, (now - start) / 1600);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className={counting ? 'mx-stats mx-rise mx-d6 is-counting' : 'mx-stats mx-rise mx-d6'}>
      {items.map(([value, label]) => (
        <p key={label}>
          <b>{Math.round(value * progress).toLocaleString('en-US')}</b>
          <span>{label}</span>
        </p>
      ))}
    </div>
  );
}

export type Snippet = { lang: Lang; label: string; file: string; code: string };

/** Language tabs over one code window. */
export function CodeTabs({ snippets, label }: { snippets: Snippet[]; label: string }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabId = (lang: string) => `${uid}-tab-${lang}`;
  const panelId = `${uid}-panel`;
  const snippet = snippets[active];
  return (
    <div className="mx-code">
      <div className="mx-tabs" role="tablist" aria-label={label}>
        {snippets.map((item, i) => (
          <button
            key={item.lang}
            type="button"
            role="tab"
            id={tabId(item.lang)}
            aria-selected={i === active}
            aria-controls={panelId}
            tabIndex={i === active ? 0 : -1}
            className="mx-tab"
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              if (!step) return;
              event.preventDefault();
              const next = (active + step + snippets.length) % snippets.length;
              setActive(next);
              document.getElementById(tabId(snippets[next].lang))?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
        <span className="mx-file">{snippet.file}</span>
        <CopyButton text={snippet.code} />
      </div>
      <pre
        key={snippet.lang}
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(snippet.lang)}
        className="mh-pre"
        tabIndex={0}
      >
        <SourceCode code={snippet.code} lang={snippet.lang} />
      </pre>
    </div>
  );
}

/** Four corner marks around a passage of the response. */
export function Specimen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-specimen">
      <span className="mx-tick" aria-hidden="true" />
      <span className="mx-tick" aria-hidden="true" />
      <span className="mx-tick" aria-hidden="true" />
      <span className="mx-tick" aria-hidden="true" />
      {children}
    </div>
  );
}

/** A slowly turning ring with ॐ at its centre, for closing calls to action. */
export function Ring() {
  return (
    <div className="mx-ring" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="94" strokeOpacity=".3" strokeDasharray="2 7" />
        <circle cx="100" cy="100" r="76" strokeOpacity=".22" />
        <circle cx="100" cy="100" r="62" strokeOpacity=".35" strokeDasharray="1 5" />
      </svg>
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="6" r="3" />
        <circle cx="194" cy="100" r="3" />
        <circle cx="100" cy="194" r="3" />
        <circle cx="6" cy="100" r="3" />
      </svg>
      <span lang="sa-Deva">ॐ</span>
    </div>
  );
}
