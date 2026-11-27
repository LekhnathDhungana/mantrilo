// Smooth page changes. Clicking an in-app link unmounts the current page while the next one's
// code loads, which left a blank frame. With the View Transitions API the browser keeps showing
// the current page until the next one has rendered, then cross-fades (see "Page transitions" in
// site.css). Browsers without the API navigate as before; <html> carries the theme background,
// so the gap is never white.

// Served outside this app (Firebase rewrites and redirects), so they load as full pages.
const SERVER_PATHS = /^\/(blog|console|admin)(\/|$)/;

let installed = false;
let replaying = false;
let pending: { path: string; done: () => void } | null = null;

const normalize = (path: string) => decodeURIComponent(path).replace(/\/+$/, '') || '/';

/** Called by each page frame after it renders, before the browser paints it. */
export function pageShown(path: string) {
  if (pending && normalize(path) === pending.path) pending.done();
}

function onClick(event: MouseEvent) {
  if (replaying || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest?.('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || url.hash) return;
  if (url.pathname === location.pathname || SERVER_PATHS.test(url.pathname)) return;
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return;

  // Hold the click, let the browser capture the current page, then replay the click so the link
  // navigates exactly as it would have. The transition finishes once the new page has rendered.
  event.preventDefault();
  event.stopImmediatePropagation();
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          if (pending?.done === finish) pending = null;
          resolve();
        };
        const timer = setTimeout(finish, 2500);
        pending = { path: normalize(url.pathname), done: finish };
        replaying = true;
        try {
          anchor.click();
        } finally {
          replaying = false;
        }
      }),
  );
}

/** Listens for link clicks once per page load. */
export function installPageTransitions() {
  if (installed || typeof document === 'undefined' || !('startViewTransition' in document)) return;
  installed = true;
  document.addEventListener('click', onClick, true);
}
