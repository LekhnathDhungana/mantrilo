import type { Snippet } from '../components/site/Shlokam.web';

// cURL, JavaScript and Python for one astrology calculation, built from the catalog's cURL
// sample so all three send the same body.

export const bodyOf = (curl: string): unknown => {
  const match = curl.match(/-d '([\s\S]*)'\s*$/);
  try {
    return match ? JSON.parse(match[1]) : {};
  } catch {
    return {};
  }
};

const indent = (text: string, by: string) => text.replace(/\n/g, `\n${by}`);

function python(value: unknown, depth = 0): string {
  const pad = '    '.repeat(depth + 1);
  const end = '    '.repeat(depth);
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (Array.isArray(value))
    return value.length
      ? `[\n${value.map((v) => pad + python(v, depth + 1)).join(',\n')},\n${end}]`
      : '[]';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length
      ? `{\n${entries.map(([k, v]) => `${pad}${JSON.stringify(k)}: ${python(v, depth + 1)}`).join(',\n')},\n${end}}`
      : '{}';
  }
  return JSON.stringify(value);
}

export function astrologySnippets(curl: string, path: string): Snippet[] {
  const body = bodyOf(curl);
  return [
    { lang: 'curl', label: 'cURL', file: 'request.sh', code: curl },
    {
      lang: 'js',
      label: 'JavaScript',
      file: 'calculate.mjs',
      code: `const res = await fetch(\`\${process.env.MANTRILO_API_URL}${path}\`, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.MANTRILO_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${indent(JSON.stringify(body, null, 2), '  ')}),
});
const { data } = await res.json();
console.log(data);`,
    },
    {
      lang: 'python',
      label: 'Python',
      file: 'calculate.py',
      code: `import os
import requests

res = requests.post(
    f"{os.environ['MANTRILO_API_URL']}${path}",
    json=${indent(python(body), '    ')},
    headers={"Authorization": f"Bearer {os.environ['MANTRILO_API_KEY']}"},
    timeout=10,
)
res.raise_for_status()
print(res.json()["data"])`,
    },
  ];
}
