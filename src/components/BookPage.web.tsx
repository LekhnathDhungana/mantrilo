import { Link, useLoaderData } from 'expo-router';
import type { loader } from '../app/library/books/[book]/index';
import type { BookSummary, TextPage, Verse } from '../data/book-pages';
import { curlGet } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import NotFound from './NotFound';
import { Callout, DataTable, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';

// Book overview and chapter pages under /library/books. Both routes' loaders return the same
// shape, so one component serves them.

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function bookResponse(book: BookSummary) {
  return {
    data: {
      id: book.apiId,
      title: '…',
      collection: { id: book.collection, name: '…' },
      description: '…',
      chapters: book.chapters.slice(0, 3).map((chapter) => ({
        number: chapter.number,
        title: '…',
        description: null,
        verseCount: chapter.verseCount,
      })),
      preview: false,
    },
    requestId: 'request-id',
  };
}

const chapterResponse = (page: TextPage, offset: number) => ({
  data: {
    number: page.chapter.number,
    title: '…',
    verseCount: page.chapter.verseCount,
    verses: [
      {
        number: 1,
        sanskrit: '…',
        transliteration: '…',
        translation: null,
        translator: null,
        wordMeaning: null,
        commentary: null,
      },
    ],
    nextOffset: offset + 30 < page.chapter.verseCount ? offset + 30 : null,
  },
  requestId: 'request-id',
});

function BookApi({ book, page }: { book: BookSummary; page?: TextPage }) {
  const bookPath = `/v1/books/${book.apiId}`;
  const chapter = page?.chapter.number ?? book.chapters[0].number;
  const offset = page?.part ? (page.part.index - 1) * 100 : 0;
  const chapterPath = `${bookPath}/chapters/${chapter}${offset ? `?offset=${offset}` : ''}`;
  return (
    <div className="mh-stack mh-prose">
      <h2>Load {page && book.chapters.length > 1 ? 'this chapter' : 'this book'} with the API</h2>
      {!page && (
        <>
          <p>
            The book record lists every chapter with its number and verse count. Use the id{' '}
            <code>{book.apiId}</code>.
          </p>
          <CodePanel title={bookPath} method="GET" code={curlGet(bookPath)} />
          <CodePanel title="Illustrative response" status="200 OK" json={bookResponse(book)} />
        </>
      )}
      <p>
        A chapter request returns up to 30 verses. Pass <code>nextOffset</code> back as{' '}
        <code>offset</code> to read the rest
        {page?.part ? '; this page starts at the offset shown' : ''}.
      </p>
      <CodePanel title={chapterPath} method="GET" code={curlGet(chapterPath)} />
      {page && (
        <CodePanel
          title="Illustrative response"
          status="200 OK"
          json={chapterResponse(page, offset)}
        />
      )}
      <p>
        Each verse has <code>sanskrit</code> and <code>transliteration</code>.{' '}
        <code>translation</code> is <code>null</code>: the English on this page is Mantrilo’s own
        rendering and is not part of the API response.
      </p>
      <p>
        <Link href="/docs#get-book">Book endpoint</Link> ·{' '}
        <Link href="/docs#get-chapter">Chapter endpoint</Link> ·{' '}
        <Link href={`/docs/guides/${book.guide}`}>Integration guide</Link>
      </p>
      <div>
        <KeyButton href={consoleSandboxUrl({ preset: book.guide })}>
          {book.sandbox ? 'Try this book in the sandbox' : 'Try the Books API'}
        </KeyButton>
      </div>
      {!book.sandbox && (
        <p className="mh-muted">
          Sandbox keys return sample books only; a live key reads the full {book.title}.
        </p>
      )}
    </div>
  );
}

function VerseBlock({ verse }: { verse: Verse }) {
  return (
    <article className="mh-verse" id={`v-${verse.key.replace(/[^\w.-]/g, '-')}`}>
      {verse.heading && <h3>{verse.heading}</h3>}
      <p className="mh-verse-key">{verse.key === '0' ? 'Invocation' : verse.key}</p>
      {verse.sanskrit && (
        <p className="mh-preview-verse mh-verse-deva" lang="sa-Deva">
          {verse.sanskrit}
        </p>
      )}
      {verse.transliteration && (
        <p className="mh-preview-verse mh-verse-roman" lang="sa-Latn">
          {verse.transliteration}
        </p>
      )}
      {verse.english && <p className="mh-verse-english">{verse.english}</p>}
    </article>
  );
}

function TextSource({ book }: { book: BookSummary }) {
  return (
    <p className="mh-muted">
      Sanskrit and transliteration from the{' '}
      {book.reference ? <a href={book.reference}>source text</a> : 'source text'}. English rendering
      by Mantrilo. The API returns its catalog edition of the Sanskrit and transliteration, so
      spelling and line breaks can differ from this page.
    </p>
  );
}

function Pager({ page }: { page: TextPage }) {
  if (!page.previous && !page.next) return null;
  return (
    <nav className="mh-pager" aria-label={`${page.book.title} pages`}>
      {page.previous ? <Link href={page.previous.path}>← {page.previous.label}</Link> : <span />}
      {page.next && <Link href={page.next.path}>{page.next.label} →</Link>}
    </nav>
  );
}

function ChapterIndex({ book, current }: { book: BookSummary; current?: string }) {
  return (
    <DataTable
      label={`${book.title} chapters`}
      codeFirst={false}
      head={[book.chapterTerm, 'Name', 'Verses']}
      rows={book.chapters.map((chapter) => [
        current === chapter.path ? (
          String(chapter.number)
        ) : (
          <Link href={chapter.path}>{`${book.chapterTerm} ${chapter.number}`}</Link>
        ),
        chapter.name,
        String(chapter.verseCount),
      ])}
    />
  );
}

function Overview({
  book,
  path,
  meta,
}: {
  book: BookSummary;
  path: string;
  meta: TextPage['meta'];
}) {
  return (
    <SiteFrame path={path} meta={meta}>
      <PageHero
        eyebrow="Library · Books"
        title={book.title}
        lede={book.intro}
        actions={
          <Link href={book.chapters[0].path} className="mh-btn mh-btn-ghost">
            Read {book.chapterTerm.toLowerCase()} {book.chapters[0].number}
          </Link>
        }
        aside={<BookStats book={book} />}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <p>
              {book.author} · {book.aliases}
            </p>
            <h2>
              {plural(book.chapters.length, book.chapterTerm.toLowerCase())}, {book.verseCount}{' '}
              verses
            </h2>
            <ChapterIndex book={book} />
            <p>
              Every {book.chapterTerm.toLowerCase()} page shows the Sanskrit in Devanagari, its
              transliteration and an English rendering, verse by verse.
            </p>
            <TextSource book={book} />
            <p>
              <Link href="/library#books">All books in the Library</Link>
            </p>
          </div>
          <BookApi book={book} />
        </div>
      </section>
    </SiteFrame>
  );
}

function BookStats({ book }: { book: BookSummary }) {
  return (
    <dl className="mh-stat-grid">
      <div>
        <dt>{book.chapters.length === 1 ? 'Verses' : `${book.chapterTerm}s`}</dt>
        <dd>{book.chapters.length === 1 ? book.verseCount : book.chapters.length}</dd>
      </div>
      {book.chapters.length > 1 && (
        <div>
          <dt>Verses</dt>
          <dd>{book.verseCount}</dd>
        </div>
      )}
      <div>
        <dt>Book id</dt>
        <dd>
          <code>{book.apiId}</code>
        </dd>
      </div>
      <div>
        <dt>Collection</dt>
        <dd>
          <code>{book.collection}</code>
        </dd>
      </div>
    </dl>
  );
}

function Text({ page }: { page: TextPage }) {
  const { book, chapter, part } = page;
  const single = book.chapters.length === 1;
  const first = single && (!part || part.index === 1);
  const heading = single
    ? part && part.index > 1
      ? `${book.title}, verses ${part.first}–${part.last}`
      : book.title
    : `${book.chapterTerm} ${chapter.number}${chapter.name.startsWith(book.chapterTerm) ? '' : `: ${chapter.name}`}`;
  const english = page.verses.filter((verse) => verse.english).length;
  return (
    <SiteFrame path={page.path} meta={page.meta}>
      <PageHero
        eyebrow={single ? 'Library · Books' : `Library · ${book.title}`}
        title={heading}
        lede={
          first
            ? book.intro
            : `${plural(page.verses.length, 'verse')}${part ? ` (${part.first} to ${part.last})` : ''} in Sanskrit, with transliteration and English.`
        }
        actions={
          single ? undefined : (
            <Link href={book.path} className="mh-btn mh-btn-ghost">
              {book.title} chapter index
            </Link>
          )
        }
        aside={first ? <BookStats book={book} /> : undefined}
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            {first && (
              <p>
                {book.author} · {book.aliases}
              </p>
            )}
            {part && (
              <nav className="mh-chips" aria-label="Parts of this text">
                {page.parts.map((entry) =>
                  entry.path === page.path ? (
                    <span key={entry.path} className="mh-chip" aria-current="page">
                      {entry.label}
                    </span>
                  ) : (
                    <Link key={entry.path} href={entry.path} className="mh-chip">
                      {entry.label}
                    </Link>
                  ),
                )}
              </nav>
            )}
            {english < page.verses.length && (
              <Callout tone="info">
                {plural(page.verses.length - english, 'verse')} on this page{' '}
                {page.verses.length - english === 1 ? 'does' : 'do'} not have an English rendering
                yet.
              </Callout>
            )}
            <div className="mh-verses">
              {page.verses.map((verse, i) => (
                <VerseBlock key={`${verse.key}-${i}`} verse={verse} />
              ))}
            </div>
            <Pager page={page} />
            <TextSource book={book} />
            {!single && (
              <>
                <h2>All {book.chapterTerm.toLowerCase()}s</h2>
                <ChapterIndex book={book} current={chapter.path} />
              </>
            )}
          </div>
          <BookApi book={book} page={page} />
        </div>
      </section>
    </SiteFrame>
  );
}

export default function BookPage() {
  const data = useLoaderData<typeof loader>();
  if (!data) return <NotFound />;
  if (data.kind === 'overview') return <Overview {...data.overview} />;
  return <Text page={data.page} />;
}
