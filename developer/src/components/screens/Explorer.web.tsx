import { useState } from 'react';
import { Badge, CopyButton, Empty, ErrorNotice, Loading, PageTitle, useLoad } from '../ui.web';
import type { CatalogRecord } from '../../lib/types';

export default function Explorer() {
  const [tab, setTab] = useState('text'),
    [query, setQuery] = useState(''),
    [draft, setDraft] = useState(''),
    [selected, setSelected] = useState('');
  const { data, error, loading } = useLoad<{ data: CatalogRecord[]; demo: boolean }>(
    `/api/catalog?type=${tab}&q=${encodeURIComponent(query)}`,
  );
  const record = data?.data.find((r) => r.id === selected) || data?.data[0];
  return (
    <>
      <PageTitle
        eyebrow="CONTENT LIBRARY"
        title="Explore the content structure."
        copy="Inspect fields, source references, and relationships before integrating."
      />
      <div className="notice">
        Demo fixtures are structural examples. Titles, translations, source editions, languages, and
        recording rights are not verified catalog data.
      </div>
      <div className="explorer-toolbar">
        <div className="segmented" role="group" aria-label="Content category">
          {[
            ['text', 'Mantras & shlokas'],
            ['audio', 'Sacred audio'],
            ['books', 'Shastras & books'],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setSelected('');
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draft);
          }}
        >
          <label className="sr-only" htmlFor="catalog-search">
            Search catalog fixtures
          </label>
          <input
            id="catalog-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            placeholder="Search IDs or fields…"
          />
          <button className="button subtle small-button">Search</button>
        </form>
      </div>
      <ErrorNotice message={error} />
      {loading ? (
        <Loading />
      ) : !data?.data.length ? (
        <Empty title="No matching content.">
          Try another search. In Firebase mode, connect a real catalog service before exploring
          production content.
        </Empty>
      ) : (
        <div className="explorer-grid">
          <aside className="panel catalog-list">
            <div className="panel-heading">
              <h2>Records</h2>
              <Badge>DEMO</Badge>
            </div>
            {data.data.map((r) => (
              <button
                className={record?.id === r.id ? 'catalog-record selected' : 'catalog-record'}
                onClick={() => setSelected(r.id)}
                key={r.id}
              >
                <span className="catalog-glyph" aria-hidden="true">
                  {r.type === 'audio' ? '≋' : r.type === 'shastra' ? '▤' : 'ॐ'}
                </span>
                <strong>{r.label}</strong>
                <code>{r.id}</code>
              </button>
            ))}
          </aside>
          {record && <RecordDetail key={record.id} record={record} />}
        </div>
      )}
    </>
  );
}
function RecordDetail({ record }: { record: CatalogRecord }) {
  const [chapter, setChapter] = useState(0),
    [verse, setVerse] = useState(0);
  const current = record.chapters?.[chapter]?.verses[verse];
  return (
    <section className="panel record-detail">
      <div className="panel-heading">
        <h2>{record.label}</h2>
        <Badge>ILLUSTRATIVE</Badge>
      </div>
      <dl className="field-grid">
        <div>
          <dt>Identifier</dt>
          <dd>
            <code>{record.id}</code>
          </dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{record.language || 'Not supplied'}</dd>
        </div>
        <div>
          <dt>Source reference</dt>
          <dd>{record.source_reference || 'Not supplied'}</dd>
        </div>
        <div>
          <dt>Linked content</dt>
          <dd>{record.audio_id || record.content_id || 'No linked recording'}</dd>
        </div>
      </dl>
      {record.chapters && (
        <div className="book-reader">
          <div className="action-row">
            <label>
              Chapter
              <select
                value={chapter}
                onChange={(e) => {
                  setChapter(Number(e.target.value));
                  setVerse(0);
                }}
              >
                {record.chapters.map((c, i) => (
                  <option value={i} key={c.number}>
                    Chapter {c.number}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Verse
              <select value={verse} onChange={(e) => setVerse(Number(e.target.value))}>
                {record.chapters[chapter].verses.map((v, i) => (
                  <option key={v.number} value={i}>
                    Verse {v.number}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="verse-text">{current?.original_text}</p>
          <p className="small muted">Translation: {current?.translation || 'Not supplied'}</p>
        </div>
      )}
      {record.type === 'audio' &&
        (record.recording_url ? (
          <audio controls preload="none" src={record.recording_url}>
            Your browser does not support audio playback.
          </audio>
        ) : (
          <div className="notice">
            No audio file is connected. Playback is unavailable; no recording is downloaded.
          </div>
        ))}
      <div className="code-heading">
        <h3>Record JSON</h3>
        <CopyButton text={JSON.stringify(record, null, 2)} />
      </div>
      <pre>
        <code>{JSON.stringify(record, null, 2)}</code>
      </pre>
    </section>
  );
}
