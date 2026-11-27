import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { KeyButton } from './site/Chrome.web';
import { useI18n } from '../i18n';

// Plays a mantra's recording on its public page. A static page can't hold a signed link (they
// expire), so the link is fetched from the API's keyless preview endpoint when the visitor
// presses play. Each browser gets a few previews; the API also limits previews per IP.

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.mantrilo.com').replace(/\/+$/, '');
const MEDIA_ORIGIN = 'https://storage.googleapis.com';
const GUEST_PLAYS = 3;
const STORAGE_KEY = 'mantrilo-preview-plays';

// The API scales to zero and takes about 4 s to boot, which a first press of play used to wait
// out. So when a page with a recording opens, wake the API (GET /v1 reads nothing and uses no
// preview) and open the connections play will need, while the visitor reads.
let warmed = false;
function warmUp() {
  if (warmed) return;
  warmed = true;
  for (const [href, crossOrigin] of [
    [API_URL, 'anonymous'],
    [MEDIA_ORIGIN, null],
  ] as const) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (crossOrigin) link.crossOrigin = crossOrigin;
    document.head.appendChild(link);
  }
  fetch(`${API_URL}/v1`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}

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

// One player per page, shared by the hero's Play button and the Recording card: either one
// starts, pauses and shows the same audio.
type Status = 'idle' | 'loading' | 'ready' | 'limit' | 'error';
type Player = {
  id: string | null;
  status: Status;
  playing: boolean;
  time: number;
  duration: number;
};
const IDLE: Player = { id: null, status: 'idle', playing: false, time: 0, duration: 0 };
let player = IDLE;
const listeners = new Set<() => void>();
function update(patch: Partial<Player>) {
  player = { ...player, ...patch };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let element: HTMLAudioElement | null = null;
function audio() {
  if (element) return element;
  const el = (element = new Audio());
  el.preload = 'auto';
  const sync = () =>
    update({
      playing: !el.paused && !el.ended,
      time: el.currentTime,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
    });
  for (const type of ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'emptied'])
    el.addEventListener(type, sync);
  return el;
}

async function toggle(id: string, title: string) {
  const el = audio();
  if (player.id === id && player.status === 'ready') {
    if (el.paused) el.play().catch(() => {});
    else el.pause();
    return;
  }
  if (player.id === id && player.status === 'loading') return;
  // Replaying a recording this browser already opened doesn't use another preview.
  const used = playsUsed();
  if (!used.includes(id) && used.length >= GUEST_PLAYS)
    return update({ ...IDLE, id, status: 'limit' });
  update({ ...IDLE, id, status: 'loading' });
  // Safari starts audio only from a click, and the link arrives after an await: loading the
  // element inside the click lets the later play() through.
  el.removeAttribute('src');
  el.load();
  try {
    const response = await fetch(`${API_URL}/v1/public/mantras/${encodeURIComponent(id)}/preview`);
    if (player.id !== id) return;
    if (response.status === 429) return update({ status: 'limit' });
    if (!response.ok) throw new Error(String(response.status));
    const { data } = await response.json();
    if (player.id !== id) return;
    remember(id);
    el.src = data.url;
    // `title` arrives already worded as the player's accessible name ("<title> recording").
    el.setAttribute('aria-label', title);
    update({ status: 'ready' });
    el.play().catch(() => {});
  } catch {
    if (player.id === id) update({ status: 'error' });
  }
}

function usePlayer(id: string): Player {
  const current = useSyncExternalStore(
    subscribe,
    () => player,
    () => IDLE,
  );
  useEffect(() => {
    warmUp();
    // Leaving the page stops its recording.
    return () => {
      if (player.id === id) element?.pause();
    };
  }, [id]);
  return current.id === id ? current : IDLE;
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** The hero's Play button: starts the recording, then shows pause, progress and time. */
export function PlayButton({ id, title }: { id: string; title: string }) {
  const { status, playing, time, duration } = usePlayer(id);
  const { t, number } = useI18n();
  const ended = status === 'ready' && !playing && duration > 0 && time >= duration - 0.25;
  const label =
    status === 'loading'
      ? t('audio.loading')
      : status === 'limit'
        ? t('audio.used')
        : status === 'error'
          ? t('audio.retry')
          : playing
            ? t('audio.pause')
            : ended
              ? t('audio.again')
              : status === 'ready' && time > 0
                ? t('audio.resume')
                : t('audio.play');
  const progress = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <button
      type="button"
      className={`mh-btn mx-play is-${playing ? 'playing' : status}`}
      style={{ '--p': `${progress}%` } as CSSProperties}
      onClick={() => toggle(id, t('audio.label', { title }))}
      disabled={status === 'loading' || status === 'limit'}
      title={status === 'limit' ? t('audio.usedTitle', { n: number(GUEST_PLAYS) }) : undefined}
    >
      <span className="mx-play-icon" aria-hidden="true">
        {status === 'loading' ? (
          <span className="mx-play-spin" />
        ) : playing ? (
          <svg viewBox="0 0 16 16">
            <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
            <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16">
            <path
              d="M5 2.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L6.2 2.1A.8.8 0 0 0 5 2.8z"
              fill="currentColor"
            />
          </svg>
        )}
      </span>
      {label}
      {status === 'ready' && duration > 0 && (
        <span className="mx-play-time">
          {clock(time)} / {clock(duration)}
        </span>
      )}
      {playing && (
        <span className="mx-play-eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </button>
  );
}

/** The Recording card's player: a Play button until the link arrives, then audio controls. */
export default function MantraAudio({ id, title }: { id: string; title: string }) {
  const { status } = usePlayer(id);
  const { t, number } = useI18n();
  const plays = { n: number(GUEST_PLAYS) };
  const slot = useRef<HTMLDivElement>(null);
  const ready = status === 'ready';
  useEffect(() => {
    if (!ready || !slot.current) return;
    const el = audio();
    el.controls = true;
    slot.current.appendChild(el);
    return () => el.remove();
  }, [ready]);

  if (status === 'limit')
    return (
      <div className="mh-audio-preview">
        <p>{t('audio.limit', plays)}</p>
        <KeyButton />
      </div>
    );
  return (
    <div className="mh-audio-preview">
      <div ref={slot} className="mx-audio-slot" hidden={!ready} />
      {!ready && (
        <button
          type="button"
          className="mh-btn mh-btn-ghost"
          onClick={() => toggle(id, t('audio.label', { title }))}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? t('audio.loading') : `▶ ${t('audio.playThe')}`}
        </button>
      )}
      {status === 'error' && <p className="mh-muted">{t('audio.error')}</p>}
      {!ready && <p className="mh-muted">{t('audio.free', plays)}</p>}
    </div>
  );
}
