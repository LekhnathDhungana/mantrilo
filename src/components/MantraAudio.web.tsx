import { useRef, useState } from 'react';
import { KeyButton } from './site/Chrome.web';

// Plays a mantra's recording on its public page. A static page can't hold a signed link (they
// expire), so the link is fetched from the API's keyless preview endpoint when the visitor
// presses play. Each browser gets a few previews; the API also limits previews per IP.

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.mantrilo.com').replace(/\/+$/, '');
const GUEST_PLAYS = 3;
const STORAGE_KEY = 'mantrilo-preview-plays';

function playsUsed(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function remember(id: string) {
  try {
    const used = playsUsed();
    if (!used.includes(id)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...used, id]));
  } catch {}
}

type State = 'idle' | 'loading' | 'ready' | 'limit' | 'error';

export default function MantraAudio({ id, title }: { id: string; title: string }) {
  const [state, setState] = useState<State>('idle');
  const [src, setSrc] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  async function play() {
    // Replaying a recording this browser already opened doesn't use another preview.
    const used = playsUsed();
    if (!used.includes(id) && used.length >= GUEST_PLAYS) return setState('limit');
    setState('loading');
    try {
      const response = await fetch(
        `${API_URL}/v1/public/mantras/${encodeURIComponent(id)}/preview`,
      );
      if (response.status === 429) return setState('limit');
      if (!response.ok) throw new Error(String(response.status));
      const { data } = await response.json();
      remember(id);
      setSrc(data.url);
      setState('ready');
      requestAnimationFrame(() => audio.current?.play().catch(() => {}));
    } catch {
      setState('error');
    }
  }

  if (state === 'limit')
    return (
      <div className="mh-audio-preview">
        <p>
          You’ve used this browser’s {GUEST_PLAYS} free previews. Get an API key to stream every
          recording in your own app.
        </p>
        <KeyButton />
      </div>
    );
  return (
    <div className="mh-audio-preview">
      {src ? (
        <audio ref={audio} controls preload="auto" src={src} aria-label={`${title} recording`} />
      ) : (
        <button
          type="button"
          className="mh-btn mh-btn-ghost"
          onClick={play}
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Loading…' : `▶ Play the recording`}
        </button>
      )}
      {state === 'error' && (
        <p className="mh-muted">The recording couldn’t be loaded. Try again in a moment.</p>
      )}
      {state !== 'ready' && (
        <p className="mh-muted">
          Free preview: {GUEST_PLAYS} recordings per browser. Your app streams them with an API key.
        </p>
      )}
    </div>
  );
}
