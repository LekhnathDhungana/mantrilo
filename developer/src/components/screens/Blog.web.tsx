import { useEffect, useMemo, useState } from 'react';
import { useConsole } from '../Session.web';
import { api, mutate } from '../../lib/api';
import { Badge, ErrorNotice, Loading, PageTitle, useLoad } from '../ui.web';
import {
  CATEGORY_NAMES,
  DEFAULT_AUTHOR,
  DESCRIPTION_LIMIT,
  SLUG_PATTERN,
  TITLE_LIMIT,
  articleFromPaste,
  describeSlot,
  fromEasternInput,
  isSuggestedDay,
  slugify,
  toEasternInput,
  type ArticleStatus,
  type Category,
} from '../../../server/blog-core.mjs';

// The blog's admin screen: paste a Markdown article with frontmatter, check it, and publish now
// or schedule it. Monday, Wednesday and Friday at 9:00 AM Eastern is suggested; any time works.

type Summary = {
  slug: string;
  title: string;
  description: string;
  keyword: string;
  category: Category;
  author: string;
  readingTimeMinutes: number;
  status: ArticleStatus;
  publishAt: string | null;
  updatedAt: string | null;
};
type Listing = { articles: Summary[]; suggestedSlot: { at: string; label: string } };
type Fields = {
  title: string;
  description: string;
  slug: string;
  keyword: string;
  author: string;
  category: Category;
};

const SITE = 'https://www.mantrilo.com';
const EMPTY: Fields = {
  title: '',
  description: '',
  slug: '',
  keyword: '',
  author: DEFAULT_AUTHOR,
  category: 'Engineering & Architecture',
};

const isLive = (article: Summary) =>
  article.status !== 'draft' && !!article.publishAt && new Date(article.publishAt) <= new Date();

function statusLabel(article: Summary) {
  if (article.status === 'draft') return <Badge>Draft</Badge>;
  return isLive(article) ? (
    <Badge tone="green">Live</Badge>
  ) : (
    <Badge tone="saffron">Scheduled</Badge>
  );
}

// The article as a paste: frontmatter then the body, so editing works like writing.
function toPaste(article: Summary & { markdown: string }) {
  const quote = (value: string) => JSON.stringify(value);
  return [
    '---',
    `title: ${quote(article.title)}`,
    `description: ${quote(article.description)}`,
    `slug: ${article.slug}`,
    `keyword: ${quote(article.keyword)}`,
    `category: ${quote(article.category)}`,
    '---',
    '',
    article.markdown,
  ].join('\n');
}

export default function Blog() {
  const { session } = useConsole();
  return session?.user.admin ? (
    <BlogAdmin />
  ) : (
    <>
      <PageTitle
        eyebrow="ACCESS CONTROL"
        title="Administrator access required"
        copy="Only administrators can write and schedule blog articles."
      />
      <div className="notice error" role="alert">
        Blog operations are enforced by the backend. Ask an administrator for access.
      </div>
    </>
  );
}

function BlogAdmin() {
  const listing = useLoad<Listing>('/api/admin/articles');
  const [paste, setPaste] = useState('');
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [markdown, setMarkdown] = useState('');
  const [recommended, setRecommended] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // An empty value means the recommended slot.
  const [chosenWhen, setWhen] = useState('');
  const [preview, setPreview] = useState<{ markdown: string; html: string } | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const articles = useMemo(() => listing.data?.articles ?? [], [listing.data]);
  const slot = listing.data?.suggestedSlot;

  const when = chosenWhen || (slot ? toEasternInput(slot.at) : '');

  // Server-rendered preview, so it matches the live page exactly.
  useEffect(() => {
    if (!showPreview || !markdown.trim()) return;
    const timer = setTimeout(() => {
      mutate<{ html: string }>('/api/admin/articles/preview', 'POST', { markdown })
        .then((result) => setPreview({ markdown, html: result.html }))
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [markdown, showPreview]);
  const previewHtml = preview?.markdown === markdown ? preview.html : null;

  function readPaste(value: string) {
    setPaste(value);
    const parsed = articleFromPaste(value);
    setMarkdown(parsed.markdown);
    setRecommended(parsed.categoryRecommended);
    setFields({
      title: parsed.title,
      description: parsed.description,
      slug: parsed.slug,
      keyword: parsed.keyword,
      author: parsed.author,
      category: parsed.category,
    });
    if (parsed.publishAt) {
      const date = new Date(parsed.publishAt);
      if (!Number.isNaN(date.getTime())) setWhen(toEasternInput(date));
    }
  }

  const set = (key: keyof Fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const slugTaken = articles.some(
    (article) => article.slug === fields.slug && article.slug !== editing,
  );
  const slugValid = SLUG_PATTERN.test(fields.slug);
  const scheduled = fromEasternInput(when);
  const ready =
    !!fields.title.trim() &&
    !!fields.description.trim() &&
    slugValid &&
    !slugTaken &&
    !!markdown.trim();

  function reset() {
    setPaste('');
    setFields(EMPTY);
    setMarkdown('');
    setEditing(null);
    setRecommended(false);
    setWhen('');
  }

  async function save(mode: 'schedule' | 'now' | 'draft') {
    setError('');
    setNotice('');
    if (mode === 'schedule' && !scheduled) return setError('Choose a date and time to schedule.');
    setPending(true);
    try {
      const body = {
        ...fields,
        markdown,
        create: !editing,
        status: mode === 'draft' ? 'draft' : mode === 'now' ? 'published' : 'scheduled',
        publishNow: mode === 'now',
        publishAt: mode === 'now' ? null : (scheduled?.toISOString() ?? null),
      };
      await mutate(`/api/admin/articles/${editing ?? fields.slug}`, 'PUT', body);
      setNotice(
        mode === 'now'
          ? `Published: ${SITE}/blog/${fields.slug}`
          : mode === 'draft'
            ? 'Draft saved.'
            : `Scheduled for ${describeSlot(scheduled!)}.`,
      );
      reset();
      await listing.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the article.');
    } finally {
      setPending(false);
    }
  }

  async function edit(slug: string) {
    setError('');
    setNotice('');
    try {
      const { article } = await api<{ article: Summary & { markdown: string } }>(
        `/api/admin/articles/${slug}`,
      );
      readPaste(toPaste(article));
      setRecommended(false);
      setEditing(slug);
      if (article.publishAt) setWhen(toEasternInput(article.publishAt));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the article.');
    }
  }

  async function reschedule(article: Summary) {
    const answer = window.prompt(
      `New publish time for “${article.title}” (Eastern time, YYYY-MM-DD HH:MM)`,
      toEasternInput(article.publishAt ?? slot?.at ?? new Date()).replace('T', ' '),
    );
    if (!answer) return;
    const date = fromEasternInput(answer.trim().replace(' ', 'T'));
    if (!date) return setError('Use the format YYYY-MM-DD HH:MM, for example 2026-11-23 09:00.');
    setError('');
    try {
      const { article: full } = await api<{ article: Summary & { markdown: string } }>(
        `/api/admin/articles/${article.slug}`,
      );
      await mutate(`/api/admin/articles/${article.slug}`, 'PUT', {
        ...full,
        status: 'scheduled',
        publishAt: date.toISOString(),
      });
      setNotice(`“${article.title}” now goes live ${describeSlot(date)}.`);
      await listing.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reschedule.');
    }
  }

  async function remove(article: Summary) {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    setError('');
    try {
      await mutate(`/api/admin/articles/${article.slug}`, 'DELETE');
      if (editing === article.slug) reset();
      setNotice(`Deleted “${article.title}”.`);
      await listing.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.');
    }
  }

  const counter = (length: number, limit: number) => (
    <span className={length > limit ? 'small danger' : 'small muted'}>
      {length}/{limit}
      {length > limit ? ' · search results will cut this off' : ''}
    </span>
  );

  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION · BLOG"
        title="Blog"
        copy="Paste a Markdown article with its frontmatter, check it, then publish or schedule it."
      />
      <ErrorNotice message={error || listing.error} />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}

      <section className="panel form-panel blog-editor">
        <div className="panel-heading">
          <h2>{editing ? `Editing ${editing}` : 'New article'}</h2>
          {editing && (
            <button type="button" className="text-button" onClick={reset}>
              Start a new article
            </button>
          )}
        </div>
        <label>
          Markdown with frontmatter
          <textarea
            className="blog-paste"
            value={paste}
            onChange={(event) => readPaste(event.target.value)}
            placeholder={
              '---\ntitle: "How to build a daily Panchang widget"\ndescription: "…"\nkeyword: panchang api\ncategory: Vedic Astrology\n---\n\nYour article…'
            }
            spellCheck={false}
          />
        </label>

        {markdown && (
          <>
            <div className="blog-fields">
              <label>
                <span className="blog-label">
                  Title {counter(fields.title.length, TITLE_LIMIT)}
                </span>
                <input
                  value={fields.title}
                  onChange={(e) => set('title')(e.target.value)}
                  maxLength={200}
                />
              </label>
              <label>
                <span className="blog-label">
                  Slug
                  {slugTaken ? (
                    <span className="small danger">Already used by another article</span>
                  ) : !slugValid ? (
                    <span className="small danger">Lowercase letters, numbers and hyphens</span>
                  ) : (
                    <span className="small muted">/blog/{fields.slug}</span>
                  )}
                </span>
                <span className="blog-inline">
                  <input
                    value={fields.slug}
                    onChange={(e) => set('slug')(e.target.value)}
                    maxLength={80}
                  />
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => set('slug')(slugify(fields.title))}
                  >
                    From title
                  </button>
                </span>
              </label>
              <label className="blog-wide">
                <span className="blog-label">
                  Meta description {counter(fields.description.length, DESCRIPTION_LIMIT)}
                </span>
                <textarea
                  rows={2}
                  value={fields.description}
                  onChange={(e) => set('description')(e.target.value)}
                  maxLength={320}
                />
              </label>
              <label>
                Primary keyword
                <input
                  value={fields.keyword}
                  onChange={(e) => set('keyword')(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                <span className="blog-label">
                  Category
                  {recommended && <Badge tone="saffron">Recommended from the text</Badge>}
                </span>
                <select
                  value={fields.category}
                  onChange={(e) => {
                    set('category')(e.target.value);
                    setRecommended(false);
                  }}
                >
                  {CATEGORY_NAMES.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Author
                <input value={DEFAULT_AUTHOR} readOnly disabled />
              </label>
            </div>
          </>
        )}

        <div className="blog-schedule">
          {slot && (
            <p className="blog-slot">
              <Badge tone="green">Recommended</Badge> {slot.label}: the next open Monday, Wednesday
              or Friday slot.{' '}
              {when !== toEasternInput(slot.at) && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setWhen(toEasternInput(slot.at))}
                >
                  Use it
                </button>
              )}
            </p>
          )}
          <label>
            Publish time (Eastern)
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          {scheduled && (
            <p className="small muted">
              {describeSlot(scheduled)}
              {scheduled <= new Date()
                ? ' · in the past, so it goes live immediately'
                : !isSuggestedDay(scheduled)
                  ? ' · not a Monday, Wednesday or Friday, which is fine'
                  : ''}
            </p>
          )}
          <div className="action-row">
            <button
              type="button"
              className="button"
              disabled={!ready || pending || !scheduled}
              onClick={() => save('schedule')}
            >
              Schedule
            </button>
            <button
              type="button"
              className="button outline"
              disabled={!ready || pending}
              onClick={() => save('now')}
            >
              Publish now
            </button>
            <button
              type="button"
              className="button subtle"
              disabled={!ready || pending}
              onClick={() => save('draft')}
            >
              Save draft
            </button>
          </div>
          {!markdown && (
            <p className="small muted">Paste an article above to schedule or publish it.</p>
          )}
        </div>
      </section>

      {markdown && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Preview</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => setShowPreview((on) => !on)}
            >
              {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>
          {showPreview &&
            (previewHtml === null ? (
              <Loading />
            ) : (
              <article className="blog-preview">
                <Badge tone="saffron">{fields.category}</Badge>
                <h1>{fields.title}</h1>
                <p className="muted">{fields.description}</p>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </article>
            ))}
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>Articles</h2>
          <Badge>{articles.length}</Badge>
        </div>
        {listing.loading ? (
          <Loading />
        ) : articles.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Publish time (Eastern)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.slug}>
                    <td>
                      {isLive(article) ? (
                        <a href={`${SITE}/blog/${article.slug}`} target="_blank" rel="noreferrer">
                          <strong>{article.title}</strong>
                        </a>
                      ) : (
                        <strong>{article.title}</strong>
                      )}
                      <code className="table-code">/blog/{article.slug}</code>
                    </td>
                    <td>
                      <Badge>{article.category}</Badge>
                    </td>
                    <td>{statusLabel(article)}</td>
                    <td>{article.publishAt ? describeSlot(new Date(article.publishAt)) : '—'}</td>
                    <td>
                      <span className="blog-actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => edit(article.slug)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => reschedule(article)}
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => remove(article)}
                        >
                          Delete
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small muted">No articles yet. Paste your first one above.</p>
        )}
      </section>
    </>
  );
}
