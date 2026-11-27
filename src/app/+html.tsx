import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import {
  DEFAULT_LOCALE,
  LOCALE_KEY,
  fontHref,
  hasLocalizedUrl,
  localeInfo,
  localeScript,
  locales,
  splitLocale,
} from '../i18n';
import { registerLocales } from '../i18n/server';

// The document around every exported page. It sets <html lang dir> for the page's language,
// loads that language's strings and script font in <head>, and sends a first-time visitor on an
// English URL to their language's address before anything paints.

// Runs inline before the page paints. Mirrors detectLocale() in src/i18n: saved choice, then
// browser languages (hi-IN matches hi), then English. Catalog pages without a localized URL stay
// put; the app renders their interface in the visitor's language after it loads.
const redirect = `(function(){try{
var L=${JSON.stringify(locales.map((l) => l.code))},D=${JSON.stringify(DEFAULT_LOCALE)};
var p=location.pathname,f=p.split('/')[1];
if(f!==D&&L.indexOf(f)>-1)return;
var s=null;try{s=localStorage.getItem(${JSON.stringify(LOCALE_KEY)})}catch(e){}
if(L.indexOf(s)<0){s=null;var n=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];
for(var i=0;i<n.length;i++){var c=String(n[i]).toLowerCase().split(/[-_]/)[0];if(L.indexOf(c)>-1){s=c;break}}}
if(!s||s===D)return;
var h=${hasLocalizedUrl.toString()};
if(!h(p))return;
location.replace('/'+s+(p==='/'?'':p)+location.search+location.hash);
}catch(e){}})();`;

export default function Root({ children, pathname }: PropsWithChildren<{ pathname?: string }>) {
  registerLocales();
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  const [lang] = splitLocale(pathname ?? '/');
  const code = lang ?? DEFAULT_LOCALE;
  const font = fontHref(code);
  return (
    <html {...htmlAttributes} lang={code} dir={localeInfo(code).dir}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <script dangerouslySetInnerHTML={{ __html: redirect }} />
        {lang && <script src={localeScript(lang)} />}
        {font && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={font} data-locale-font={code} />
          </>
        )}
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
