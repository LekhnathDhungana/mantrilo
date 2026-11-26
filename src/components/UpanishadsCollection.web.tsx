import { useLoaderData } from 'expo-router';
import { Link } from '../i18n/Link.web';
import type { loader } from '../app/library/books/upanishads';
import { collectionRequest, collectionResponse } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import { KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/Rich';

export default function UpanishadsCollection() {
  const { books: upanishads } = useLoaderData<typeof loader>();
  const { t, number } = useI18n();
  const n = (count: number) => ({ count, n: number(count) });
  return (
    <SiteFrame path="/library/books/upanishads">
      <PageHero
        eyebrow={t('upanishads.eyebrow')}
        title={t('upanishads.title')}
        lede={t('upanishads.lede', n(upanishads.length))}
        actions={
          <KeyButton href={consoleSandboxUrl({ preset: 'upanishads' })}>
            {t('upanishads.try')}
          </KeyButton>
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <h2>{t('upanishads.readEach')}</h2>
            <ul>
              {upanishads.map((book) => (
                <li key={book.slug}>
                  <Link href={book.path}>{book.title}</Link>
                  {' · '}
                  {book.chapters === 1
                    ? t('common.verses', n(book.verseCount))
                    : `${t(`books.terms.${book.chapterTerm}`, n(book.chapters))}, ${t('common.verses', n(book.verseCount))}`}
                  {book.sandbox && ` · ${t('upanishads.sandboxSample')}`}
                </li>
              ))}
            </ul>
            <h2>{t('upanishads.build')}</h2>
            <ol>
              <li>{t('upanishads.step1')}</li>
              <li>
                <Rich text={t('upanishads.step2')} tags={{ code: <code /> }} />
              </li>
              <li>{t('upanishads.step3')}</li>
            </ol>
            <p>
              <Link href="/docs/guides/upanishads">{t('upanishads.guide')}</Link> ·{' '}
              <Link href="/docs#get-chapter">{t('shelf.flow.reference')}</Link> ·{' '}
              <Link href="/books-api">{t('meta./books-api.label')}</Link>
            </p>
          </div>
          <div className="mh-prose mh-stack">
            <h2>{t('upanishads.sandboxTitle')}</h2>
            <p>{t('upanishads.sandboxCopy')}</p>
            <CodePanel
              title="/v1/books?collection=upanishads"
              method="GET"
              code={collectionRequest('upanishads')}
            />
            <CodePanel
              title={t('upanishads.sandboxResponse')}
              status="200 OK"
              json={collectionResponse}
            />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
