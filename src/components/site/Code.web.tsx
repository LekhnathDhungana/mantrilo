import { useState, type ReactNode } from 'react';

const DEVANAGARI = /[\u0900-\u097F]/;

// Colors JSON by token type. Devanagari strings get the serif face.
export function JsonCode({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  const out: ReactNode[] = [];
  const re =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = out.length;
    if (m[1] && m[2]) {
      out.push(
        <span key={k} className="mh-t-key">
          {m[1]}
        </span>,
        <span key={k + 0.5} className="mh-t-punct">
          {m[2]}
        </span>,
      );
    } else if (m[1]) {
      out.push(
        <span key={k} className={DEVANAGARI.test(m[1]) ? 'mh-t-str mh-t-deva' : 'mh-t-str'}>
          {m[1]}
        </span>,
      );
    } else if (m[3]) {
      out.push(
        <span key={k} className="mh-t-lit">
          {m[3]}
        </span>,
      );
    } else if (m[4]) {
      out.push(
        <span key={k} className="mh-t-num">
          {m[4]}
        </span>,
      );
    } else {
      out.push(
        <span key={k} className="mh-t-punct">
          {m[5]}
        </span>,
      );
    }
    last = re.lastIndex;
  }
  out.push(text.slice(last));
  return <code>{out}</code>;
}

export type Lang = 'curl' | 'js' | 'python' | 'go';

const KEYWORDS: Record<Lang, string[]> = {
  curl: ['curl'],
  js: ['const', 'await', 'async', 'return', 'new', 'if', 'throw', 'import', 'from'],
  python: ['import', 'from', 'def', 'return', 'if', 'raise', 'for', 'in', 'as'],
  go: ['package', 'import', 'func', 'var', 'struct', 'string', 'if', 'return', 'defer', 'nil'],
};

// A small highlighter for the snippets on this page: strings, comments, keywords, flags.
export function SourceCode({ code, lang }: { code: string; lang: Lang }) {
  const comment = lang === 'python' || lang === 'curl' ? '#[^\\n]*' : '//[^\\n]*';
  const words = KEYWORDS[lang].join('|');
  const re = new RegExp(
    `(${comment})|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`[^\`]*\`)|\\b(${words})\\b|(\\s-{1,2}[A-Za-z]+)|(\\$[A-Z_]+|\\b[A-Z_]{4,}\\b)`,
    'g',
  );
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls = m[1]
      ? 'mh-t-comment'
      : m[2]
        ? 'mh-t-str'
        : m[3]
          ? 'mh-t-kw'
          : m[4]
            ? 'mh-t-flag'
            : 'mh-t-env';
    out.push(
      <span key={out.length} className={cls}>
        {m[0]}
      </span>,
    );
    last = re.lastIndex;
  }
  out.push(code.slice(last));
  return <code>{out}</code>;
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('done');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1800);
  }
  return (
    <button type="button" className="mh-copy" onClick={copy} aria-live="polite">
      {state === 'done' ? (
        <>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8.5l3 3 7-7" />
          </svg>
          Copied
        </>
      ) : state === 'failed' ? (
        'Copy failed'
      ) : (
        <>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" />
            <path d="M10.5 5V3.5A1.5 1.5 0 009 2H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5H5" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

export const MANTRA_ID = 'annapurna-aham-vaishvanaro-bhuthva';

export const snippets: { lang: Lang; label: string; file: string; code: string }[] = [
  {
    lang: 'curl',
    label: 'cURL',
    file: 'request.sh',
    code: `curl "$MANTRILO_API_URL/v1/mantras/${MANTRA_ID}" \\
  -H "Authorization: Bearer $MANTRILO_API_KEY"`,
  },
  {
    lang: 'js',
    label: 'JavaScript',
    file: 'mantra.mjs',
    code: `const id = "${MANTRA_ID}";

const res = await fetch(\`\${process.env.MANTRILO_API_URL}/v1/mantras/\${id}\`, {
  headers: { Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\` },
});
if (!res.ok) throw new Error((await res.json()).error.code);

const { data } = await res.json();
const [verse] = data.verses;
console.log(verse.sanskrit, verse.transliteration);`,
  },
  {
    lang: 'python',
    label: 'Python',
    file: 'mantra.py',
    code: `import os
import requests

mantra_id = "${MANTRA_ID}"

res = requests.get(
    f"{os.environ['MANTRILO_API_URL']}/v1/mantras/{mantra_id}",
    headers={"Authorization": f"Bearer {os.environ['MANTRILO_API_KEY']}"},
    timeout=10,
)
res.raise_for_status()

verse = res.json()["data"]["verses"][0]
print(verse["sanskrit"], verse["transliteration"])`,
  },
  {
    lang: 'go',
    label: 'Go',
    file: 'main.go',
    code: `package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("MANTRILO_API_URL") + "/v1/mantras/${MANTRA_ID}"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+os.Getenv("MANTRILO_API_KEY"))

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()

	var body struct {
		Data struct {
			Verses []struct {
				Sanskrit        string \`json:"sanskrit"\`
				Transliteration string \`json:"transliteration"\`
			} \`json:"verses"\`
		} \`json:"data"\`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		log.Fatal(err)
	}
	fmt.Println(body.Data.Verses[0].Sanskrit)
}`,
  },
];

// A titled code window with a copy button: a request (source) or a response (JSON).
export function CodePanel({
  title,
  method,
  status,
  code,
  json,
  lang = 'curl',
  wrap = false,
}: {
  title: ReactNode;
  method?: string;
  status?: string;
  code?: string;
  json?: unknown;
  lang?: Lang;
  wrap?: boolean;
}) {
  const text = code ?? JSON.stringify(json, null, 2);
  return (
    <div className="mh-window mh-codeblock">
      <div className="mh-window-bar">
        <span className="mh-window-title">
          {method && <b className="mh-method">{method}</b>} {title}
        </span>
        {status && <span className="mh-status">{status}</span>}
        <CopyButton text={text} />
      </div>
      <pre className={wrap ? 'mh-pre mh-pre-wrap' : 'mh-pre'} tabIndex={0}>
        {code !== undefined ? <SourceCode code={code} lang={lang} /> : <JsonCode value={json} />}
      </pre>
    </div>
  );
}
