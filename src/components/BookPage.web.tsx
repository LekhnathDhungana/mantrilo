import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/library/books/[book]/index';
import type { BookSummary, TextPage, Verse } from '../data/book-pages';
import { curlGet } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import NotFound from './NotFound';
import { Callout, DataTable, KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { useI18n, type I18n } from '../i18n';
import { Rich } from '../i18n/Rich';

// Book overview and chapter pages under /library/books. Both routes' loaders return the same
// shape, so one component serves them.

// Book, chapter and verse text is content and stays as published; the words around it follow
// the visitor's language (the chapter term itself, e.g. Valli, is a Sanskrit name).
const verses = ({ t, number }: I18n, count: number) =>
  t('common.verses', { count, n: number(count) });
const parts = ({ t, number }: I18n, term: string, count: number) =>
  t(`books.terms.${term}`, { count, n: number(count) }) ||
  `${number(count)} ${term.toLowerCase()}s`;
const term = (t: I18n['t'], name: string) => t(`books.term.${name}`) || name;
const termPlural = (t: I18n['t'], name: string) => t(`books.termPlural.${name}`) || `${name}s`;

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
  const { t } = useI18n();
  const code = { code: <code /> };
  return (
    <div className="mh-stack mh-prose">
      <h2>
        {page && book.chapters.length > 1
          ? t('bookPage.api.chapterTitle')
          : t('bookPage.api.bookTitle')}
      </h2>
      {!page && (
        <>
          <p>
            <Rich text={t('bookPage.api.bookCopy', { id: book.apiId })} tags={code} />
          </p>
          <CodePanel title={bookPath} method="GET" code={curlGet(bookPath)} />
          <CodePanel
            title={t('bookPage.api.illustrative')}
            status="200 OK"
            json={bookResponse(book)}
          />
        </>
      )}
      <p>
        <Rich
          text={page?.part ? t('bookPage.api.pagingOffset') : t('bookPage.api.paging')}
          tags={code}
        />
      </p>
      <CodePanel title={chapterPath} method="GET" code={curlGet(chapterPath)} />
      {page && (
        <CodePanel
          title={t('bookPage.api.illustrative')}
          status="200 OK"
          json={chapterResponse(page, offset)}
        />
      )}
      <p>
        <Rich text={t('bookPage.api.fields')} tags={code} />
      </p>
      <p>
        <Link href="/docs#get-book">{t('bookPage.api.bookEndpoint')}</Link> ·{' '}
        <Link href="/docs#get-chapter">{t('bookPage.api.chapterEndpoint')}</Link> ·{' '}
        <Link href={`/docs/guides/${book.guide}`}>{t('upanishads.guide')}</Link>
      </p>
      <div>
        <KeyButton href={consoleSandboxUrl({ preset: book.guide })}>
          {book.sandbox ? t('bookPage.api.trySandbox') : t('bookPage.api.tryApi')}
        </KeyButton>
      </div>
      {!book.sandbox && <p className="mh-muted">{t('bookPage.api.live', { title: book.title })}</p>}
    </div>
  );
}

function VerseBlock({ verse }: { verse: Verse }) {
  const { t } = useI18n();
  return (
    <article className="mh-verse" id={`v-${verse.key.replace(/[^\w.-]/g, '-')}`}>
      {verse.heading && <h3>{verse.heading}</h3>}
      <p className="mh-verse-key">{verse.key === '0' ? t('bookPage.invocation') : verse.key}</p>
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
  const { t } = useI18n();
  return (
    <p className="mh-muted">
      <Rich
        text={t('bookPage.source')}
        tags={{
          source: (inner) => (book.reference ? <a href={book.reference}>{inner}</a> : inner),
        }}
      />
    </p>
  );
}

function Pager({ page }: { page: TextPage }) {
  const { t } = useI18n();
  if (!page.previous && !page.next) return null;
  return (
    <nav className="mh-pager" aria-label={t('bookPage.pages', { title: page.book.title })}>
      {page.previous ? (
        <Link href={page.previous.path}>
          <span className="mh-flip" aria-hidden="true">
            ←
          </span>{' '}
          {page.previous.label}
        </Link>
      ) : (
        <span />
      )}
      {page.next && (
        <Link href={page.next.path}>
          {page.next.label}{' '}
          <span className="mh-flip" aria-hidden="true">
            →
          </span>
        </Link>
      )}
    </nav>
  );
}

function ChapterIndex({ book, current }: { book: BookSummary; current?: string }) {
  const { t, number } = useI18n();
  const name = term(t, book.chapterTerm);
  return (
    <DataTable
      label={t('bookPage.chapters', { title: book.title })}
      codeFirst={false}
      head={[name, t('bookPage.name'), t('bookPage.verses')]}
      rows={book.chapters.map((chapter) => [
        current === chapter.path ? (
          number(chapter.number)
        ) : (
          <Link href={chapter.path}>{`${name} ${number(chapter.number)}`}</Link>
        ),
        chapter.name,
        number(chapter.verseCount),
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
  const i18n = useI18n();
  const { t, number } = i18n;
  return (
    <SiteFrame path={path} meta={meta}>
      <PageHero
        eyebrow={t('upanishads.eyebrow')}
        title={book.title}
        lede={book.intro}
        actions={
          <Link href={book.chapters[0].path} className="mh-btn mh-btn-ghost">
            {t('bookPage.readFirst', {
              term: term(t, book.chapterTerm),
              n: number(book.chapters[0].number),
            })}
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
              {parts(i18n, book.chapterTerm, book.chapters.length)}, {verses(i18n, book.verseCount)}
            </h2>
            <ChapterIndex book={book} />
            <p>{t('bookPage.every', { term: term(t, book.chapterTerm) })}</p>
            <TextSource book={book} />
            <p>
              <Link href="/library#books">{t('bookPage.allBooks')}</Link>
            </p>
          </div>
          <BookApi book={book} />
        </div>
      </section>
    </SiteFrame>
  );
}

function BookStats({ book }: { book: BookSummary }) {
  const { t, number } = useI18n();
  return (
    <dl className="mh-stat-grid">
      <div>
        <dt>
          {book.chapters.length === 1 ? t('bookPage.verses') : termPlural(t, book.chapterTerm)}
        </dt>
        <dd>{number(book.chapters.length === 1 ? book.verseCount : book.chapters.length)}</dd>
      </div>
      {book.chapters.length > 1 && (
        <div>
          <dt>{t('bookPage.verses')}</dt>
          <dd>{number(book.verseCount)}</dd>
        </div>
      )}
      <div>
        <dt>{t('bookPage.bookId')}</dt>
        <dd>
          <code>{book.apiId}</code>
        </dd>
      </div>
      <div>
        <dt>{t('bookPage.collection')}</dt>
        <dd>
          <code>{book.collection}</code>
        </dd>
      </div>
    </dl>
  );
}

function Text({ page }: { page: TextPage }) {
  const { book, chapter, part } = page;
  const i18n = useI18n();
  const { t, number } = i18n;
  const single = book.chapters.length === 1;
  const first = single && (!part || part.index === 1);
  const range = part && { first: part.first, last: part.last };
  const heading = single
    ? part && part.index > 1
      ? t('bookPage.versesOf', { title: book.title, ...range })
      : book.title
    : `${term(t, book.chapterTerm)} ${number(chapter.number)}${chapter.name.startsWith(book.chapterTerm) ? '' : `: ${chapter.name}`}`;
  const missing = page.verses.length - page.verses.filter((verse) => verse.english).length;
  return (
    <SiteFrame path={page.path} meta={page.meta}>
      <PageHero
        eyebrow={single ? t('upanishads.eyebrow') : `${t('meta./library.label')} · ${book.title}`}
        title={heading}
        lede={
          first
            ? book.intro
            : t(part ? 'bookPage.ledeRange' : 'bookPage.lede', {
                verses: verses(i18n, page.verses.length),
                ...range,
              })
        }
        actions={
          single ? undefined : (
            <Link href={book.path} className="mh-btn mh-btn-ghost">
              {t('bookPage.index', { title: book.title })}
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
              <nav className="mh-chips" aria-label={t('bookPage.parts')}>
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
            {missing > 0 && (
              <Callout tone="info">
                {t('bookPage.missingEnglish', { count: missing, n: number(missing) })}
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
                <h2>{t('bookPage.all', { terms: termPlural(t, book.chapterTerm) })}</h2>
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
