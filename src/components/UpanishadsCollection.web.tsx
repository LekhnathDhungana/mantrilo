import { Link, useLoaderData } from 'expo-router';
import type { loader } from '../app/library/books/upanishads';
import { collectionRequest, collectionResponse } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import { KeyButton, PageHero, SiteFrame } from './site/Chrome.web';
import { CodePanel } from './site/Code.web';

export default function UpanishadsCollection() {
  const { books: upanishads } = useLoaderData<typeof loader>();
  return (
    <SiteFrame path="/library/books/upanishads">
      <PageHero
        eyebrow="Library · Books"
        title="Upanishads"
        lede={`Read ${upanishads.length} Upanishads verse by verse in Sanskrit with English, then use one collection request to list the titles available to your key.`}
        actions={
          <KeyButton href={consoleSandboxUrl({ preset: 'upanishads' })}>
            Try the Upanishads API
          </KeyButton>
        }
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <h2>Read each Upanishad</h2>
            <ul>
              {upanishads.map((book) => (
                <li key={book.slug}>
                  <Link href={book.path}>{book.title}</Link>
                  {' · '}
                  {book.chapters === 1
                    ? `${book.verseCount} verses`
                    : `${book.chapters} ${book.chapterTerm.toLowerCase()}s, ${book.verseCount} verses`}
                  {book.sandbox && ' · Sandbox sample'}
                </li>
              ))}
            </ul>
            <h2>Build an Upanishads reader</h2>
            <ol>
              <li>List the collection and use the returned book ID to load its chapter index.</li>
              <li>
                Read a chapter by number and follow <code>nextOffset</code> for additional verses.
              </li>
              <li>
                Display Sanskrit and transliteration when available. Supply any translations you
                have permission to use separately.
              </li>
            </ol>
            <p>
              <Link href="/docs/guides/upanishads">Integration guide</Link> ·{' '}
              <Link href="/docs#get-chapter">Chapter reference</Link> ·{' '}
              <Link href="/books-api">Books API</Link>
            </p>
          </div>
          <div className="mh-prose mh-stack">
            <h2>What the sandbox returns</h2>
            <p>
              The collection request returns Isha Upanishad. Its opening chapter includes the
              invocation and the first two numbered verses in the sandbox. Use a live key for the
              other titles.
            </p>
            <CodePanel
              title="/v1/books?collection=upanishads"
              method="GET"
              code={collectionRequest('upanishads')}
            />
            <CodePanel
              title="Sandbox collection response"
              status="200 OK"
              json={collectionResponse}
            />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
