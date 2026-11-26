import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

// Renders a translated sentence that contains markup, such as
// "Review the <link>content license</link> first." Each tag name maps to an element that wraps
// the tagged text; translators can move the tags but not change them. Tags do not nest.
export function Rich({
  text,
  tags = {},
}: {
  text: string;
  tags?: Record<string, ReactElement<{ children?: ReactNode }> | ((inner: string) => ReactNode)>;
}) {
  const out: ReactNode[] = [];
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>|<(\w+)\/>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const name = match[1] ?? match[3];
    const inner = match[2] ?? '';
    const tag = tags[name];
    if (typeof tag === 'function') out.push(<Fragment key={out.length}>{tag(inner)}</Fragment>);
    else if (isValidElement(tag))
      out.push(cloneElement(tag, { key: out.length }, inner || tag.props.children));
    else out.push(inner);
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
