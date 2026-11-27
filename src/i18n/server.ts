import { i18n } from './index';

// Server only (src/i18n/index.ts loads it when there is no window): every language's strings, so
// each page renders in its own language at export time. The browser bundle never includes these
// files; it gets a language's strings from /locales/<code>.js.
const context = (
  require as unknown as {
    context(dir: string, deep: boolean, match: RegExp): { keys(): string[]; (key: string): any };
  }
).context('./locales', false, /\.json$/);

export function registerLocales() {
  for (const key of context.keys()) {
    const code = key.replace(/^\.\//, '').replace(/\.json$/, '');
    if (i18n.hasResourceBundle(code, 'translation')) continue;
    const strings = context(key);
    i18n.addResourceBundle(code, 'translation', strings.default ?? strings, true, true);
  }
}
registerLocales();
