import { useState } from 'react';
import { Link } from 'expo-router';
import { Reference, SandboxLink, useAstrologyCatalog } from '../IntegrationExamples.web';
import { Badge, Empty } from '../ui.web';

export default function AstrologyLibrary({
  item,
  onOpen,
  onBack,
}: {
  item: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const { guides, runnable, loaded } = useAstrologyCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const groups = [...new Set(guides.map((guide) => guide.category!))];
  const results = guides.filter(
    (guide) =>
      (!category || category === guide.category) &&
      [guide.name, guide.summary, guide.category, guide.library.item]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const detail = guides.find((guide) => guide.library.item === item);
  if (item)
    return (
      <div className="library-item integration-detail">
        <nav className="library-crumbs" aria-label="Breadcrumb">
          <button className="text-button" onClick={onBack}>
            ← Back to astrology
          </button>
        </nav>
        {detail ? (
          <>
            <section className="panel library-reading integration-panel">
              <header className="library-detail-head">
                <p className="eyebrow">{detail.category}</p>
                <h2>{detail.name}</h2>
                <p className="library-description">{detail.summary}</p>
              </header>
              <p>
                <Badge tone={detail.limited ? 'neutral' : 'green'}>
                  {detail.limited ? 'Unavailable' : 'Available via API'}
                </Badge>
              </p>
              {!detail.limited && loaded && !runnable.has(item) && (
                <p className="small muted">
                  Sandbox runner is not enabled for this operation in this workspace.
                </p>
              )}
              <div className="integration-actions">
                <Link
                  className="button primary"
                  href={{ pathname: '/implementation', params: { guide: detail.id } }}
                >
                  Implementation guide →
                </Link>
                {runnable.has(item) && <SandboxLink operation={item} />}
              </div>
            </section>
            <Reference guide={detail} />
          </>
        ) : (
          <Empty title="Operation unavailable">
            Choose an operation from the astrology catalog.
          </Empty>
        )}
      </div>
    );
  return (
    <>
      <div className="library-filters integration-filters">
        <div className="library-field">
          <label htmlFor="astro-search">Search astrology</label>
          <input
            id="astro-search"
            type="search"
            placeholder="e.g. Panchang, natal or numerology"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="library-field">
          <label htmlFor="astro-category">Category</label>
          <select
            id="astro-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {groups.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="library-status" aria-live="polite">
        {results.length} {results.length === 1 ? 'capability' : 'capabilities'}
      </p>
      {results.length ? (
        <section
          className="panel library-results integration-results"
          aria-label="Astrology capabilities"
        >
          <div className="library-row library-head integration-row" aria-hidden="true">
            <span>Capability</span>
            <span>Availability</span>
          </div>
          {results.map((guide) => (
            <button
              className="library-row integration-row"
              key={guide.id}
              onClick={() => onOpen(guide.library.item!)}
            >
              <span className="library-title">
                <strong>{guide.name}</strong>
                <small>{guide.summary}</small>
              </span>
              <span className="integration-row-meta">
                <Badge tone={guide.limited ? 'neutral' : 'green'}>
                  {guide.limited
                    ? 'Unavailable'
                    : runnable.has(guide.library.item!)
                      ? 'Sandbox runner'
                      : 'Available via API'}
                </Badge>
                <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </section>
      ) : (
        <Empty title="No matching capabilities">Try another name or category.</Empty>
      )}
    </>
  );
}
