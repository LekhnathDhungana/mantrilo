import { useState } from 'react';
import { Link } from 'expo-router';
import Seo from './Seo.web';
import PricingTables from './PricingTables.web';
import Brand, { Rosette } from './Brand.web';
import { plans } from '../data/plans';
import { samples, exampleRequest, type SampleType } from '../data/samples';
import './marketing.css';

const categories = [
  {
    icon: 'ॐ',
    title: 'Mantras & shlokas',
    subtitle: 'Words with depth. Data with context.',
    copy: 'Original text, transliteration, translation, and meaning, with source references where available.',
    tags: ['Original text', 'Transliteration', 'Meaning'],
    href: '/mantra-shloka-api',
    type: 'mantra' as SampleType,
  },
  {
    icon: '≋',
    title: 'Sacred audio',
    subtitle: 'Bring the listening experience closer.',
    copy: 'Recordings linked to relevant content. Connect what your users read with what they hear.',
    tags: ['Linked recordings', 'Audio metadata'],
    href: '/sacred-audio-api',
    type: 'audio' as SampleType,
  },
  {
    icon: '▤',
    title: 'Shastras & books',
    subtitle: 'A library, thoughtfully structured.',
    copy: 'Explore Hindu scriptures and texts through books, chapters, and verses where applicable.',
    tags: ['Books', 'Chapters', 'Verses'],
    href: '/shastra-books-api',
    type: 'book' as SampleType,
  },
];
const faqs = [
  [
    'What content is available?',
    'Mantrilo is designed for mantras, shlokas, sacred audio, and shastra books. Paid plans cover the full available catalog; Sandbox covers sample content for testing. A verified title list is not yet connected to this preview. Astrology is separate from the content catalog and its plan allowances.',
  ],
  [
    'How do I access the astrology API?',
    'Astrology uses a separate service connection and credit allowance. This local preview has no astrology provider configured, so live requests require integration setup. Prepare an inquiry to describe your requirements; the form does not submit or register interest.',
  ],
  [
    'How do I integrate Mantrilo?',
    'Request access, review the available catalog and documentation, then integrate through your server. The requests on this website are illustrative; production endpoints and API key provisioning are not connected yet.',
  ],
  [
    'Can I use the content commercially?',
    'Paid plans include the available mantras, shlokas, sacred audio, shastra books, and discovery features for commercial integration, subject to the documented content license. Review the final content license before using any content.',
  ],
  [
    'What does audio delivery mean?',
    `Audio allowances measure data delivered each month, not storage. ${plans
      .filter((p) => p.price)
      .map((p) => `${p.name} includes ${p.audio}`)
      .join('; ')}. Sandbox includes sample audio only. All allowances reset monthly.`,
  ],
  [
    'What counts as a customer product?',
    `A customer product is an app or website covered by your plan. ${plans
      .filter((p) => p.price)
      .map((p) => `${p.name} covers ${p.products}`)
      .join('; ')}. Sandbox is for testing only.`,
  ],
  [
    'Where can I review the content license?',
    'The license status page explains what still needs to be supplied. The repository contains a software license, which does not establish rights to sacred texts or recordings. Content license documentation must be provided before commercial integration.',
  ],
];
export default function Marketing() {
  const [active, setActive] = useState<SampleType>('mantra');
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(exampleRequest);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <>
      <Seo path="/" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="nav wrap">
          <Link href="/" aria-label="Mantrilo home">
            <Brand />
          </Link>
          <button
            className="menu-toggle"
            aria-expanded={menu}
            aria-controls="navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? 'Close ✕' : 'Menu ☰'}
          </button>
          <nav
            id="navigation"
            className={menu ? 'nav-links open' : 'nav-links'}
            aria-label="Main navigation"
          >
            {[
              ['Features', 'features'],
              ['Content Library', 'library'],
              ['Developers', 'developers'],
              ['Pricing', 'pricing'],
            ].map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <Link href="/astrology-api" onPress={() => setMenu(false)}>
              Astrology
            </Link>
          </nav>
          <Link className="button button-small nav-cta" href="/access">
            Request access <span>↗</span>
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-line" /> ANCIENT WISDOM. MODERN INFRASTRUCTURE.
            </div>
            <h1>
              Rooted in tradition.
              <br />
              Ready for{' '}
              <em>
                your
                <br className="desktop-break" /> next creation.
              </em>
            </h1>
            <p className="hero-sub">
              A Hindu content API for developers building apps and websites. Integrate mantras,
              shlokas, sacred audio, and shastra books.{' '}
              <Link href="/astrology-api">Explore the astrology API.</Link>
            </p>
            <div className="hero-actions">
              <Link className="button" href="/access">
                Request API access <span>↗</span>
              </Link>
              <a className="text-link" href="#playground">
                Explore the API <span>→</span>
              </a>
            </div>
            <div className="hero-note">
              <span className="tiny-rosette">✳</span> For developers building with purpose.
            </div>
          </div>
          <div className="hero-art">
            <Rosette className="hero-rosette" />
            <div className="library-window">
              <div className="window-top">
                <span className="window-dots">● ● ●</span>
                <span>THE MANTRILO LIBRARY</span>
                <span>↗</span>
              </div>
              <div className="window-body">
                <div className="library-kicker">SACRED KNOWLEDGE, STRUCTURED.</div>
                <div className="devanagari" lang="sa">
                  ज्ञानम्
                </div>
                <div className="knowledge-label">A place for timeless knowledge.</div>
                <div className="library-divider" />
                <div className="preview-row">
                  <span className="preview-icon">ॐ</span>
                  <div>
                    <strong>Mantras & shlokas</strong>
                    <small>Text · Transliteration · Meaning</small>
                  </div>
                  <span>↗</span>
                </div>
                <div className="preview-row">
                  <span className="preview-icon">≋</span>
                  <div>
                    <strong>Sacred audio</strong>
                    <small>Recordings connected to content</small>
                  </div>
                  <span>↗</span>
                </div>
                <div className="preview-row">
                  <span className="preview-icon">▤</span>
                  <div>
                    <strong>Shastras & books</strong>
                    <small>Books · Chapters · Verses</small>
                  </div>
                  <span>↗</span>
                </div>
              </div>
              <div className="window-bottom">
                <span className="status-dot" /> ILLUSTRATIVE LIBRARY PREVIEW<span>JSON</span>
              </div>
            </div>
            <div className="floating-code">
              <span className="code-spark">✦</span>
              <code>
                Tradition, meet <span>integration.</span>
              </code>
            </div>
          </div>
        </section>
        <div className="catalog-strip">
          <div className="wrap">
            <span>ONE INTEGRATION. MANY POSSIBILITIES.</span>
            <span>Mantras & shlokas</span>
            <i>✧</i>
            <span>Sacred audio</span>
            <i>✧</i>
            <span>Shastras & books</span>
            <i>✧</i>
            <Link href="/astrology-api">Astrology</Link>
          </div>
        </div>
        <section id="library" className="section wrap">
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 / THE CONTENT LIBRARY</div>
              <h2>
                A deeper foundation
                <br />
                for what you build.
              </h2>
            </div>
            <p>
              From a single verse to a chapter-by-chapter reading experience. Bring sacred content
              into your product with context intact.
            </p>
          </div>
          <div className="category-grid">
            {categories.map((c, i) => (
              <article className="category" key={c.type}>
                <div className="category-top">
                  <span className="category-icon" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span className="index">0{i + 1}</span>
                </div>
                <h3>
                  <Link href={c.href}>{c.title}</Link>
                </h3>
                <p className="category-sub">{c.subtitle}</p>
                <p>{c.copy}</p>
                <div className="tags">
                  {c.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <Link className="category-link" href={c.href}>
                  Explore this API <span>↗</span>
                </Link>
              </article>
            ))}
          </div>
          <div className="astrology-overview">
            <span className="astrology-symbol" aria-hidden="true">
              ✧
            </span>
            <div>
              <h3>Astrology</h3>
              <p>
                Astrology integration for apps and websites, with credit accounting separate from
                content requests and audio delivery.
              </p>
            </div>
            <Link className="text-link" href="/astrology-api">
              Explore astrology ↗
            </Link>
          </div>
          <p className="section-footnote">
            Catalog examples are illustrative. Available titles and recordings will be confirmed
            during access onboarding.
          </p>
        </section>
        <section id="playground" className="playground-section">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <div className="eyebrow">02 / A CLOSER LOOK</div>
                <h2>
                  Sacred content.
                  <br />
                  <em>Developer-friendly form.</em>
                </h2>
              </div>
              <p>
                Explore the shape of an integration. Switch between content types to see how text,
                recordings, and books fit together.
              </p>
            </div>
            <div className="playground">
              <div className="sample-pane">
                <div className="tabs" role="tablist" aria-label="Content example">
                  {categories.map((c) => (
                    <button
                      key={c.type}
                      id={`tab-${c.type}`}
                      role="tab"
                      aria-selected={active === c.type}
                      aria-controls="sample-panel"
                      onClick={() => setActive(c.type)}
                      onKeyDown={(event) => {
                        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                          event.preventDefault();
                          const types = categories.map((c) => c.type);
                          const index = types.indexOf(active);
                          const next =
                            event.key === 'Home'
                              ? 0
                              : event.key === 'End'
                                ? 2
                                : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                          setActive(types[next]);
                          document.getElementById(`tab-${types[next]}`)?.focus();
                        }
                      }}
                      tabIndex={active === c.type ? 0 : -1}
                    >
                      {c.type === 'book'
                        ? 'Shastra book'
                        : c.type === 'audio'
                          ? 'Sacred audio'
                          : 'Mantra'}
                    </button>
                  ))}
                </div>
                <div
                  id="sample-panel"
                  role="tabpanel"
                  aria-labelledby={`tab-${active}`}
                  className="sample-content"
                >
                  <span className="sample-badge">ILLUSTRATIVE SAMPLE</span>
                  {active === 'mantra' ? (
                    <>
                      <div className="sample-symbol" lang="sa">
                        अ आ इ
                      </div>
                      <h3>A verse, with its context.</h3>
                      <p>Original text → Transliteration → Translation</p>
                      <div className="sample-field">
                        <span>MEANING & SOURCE</span>
                        <p>Included where available in the catalog.</p>
                      </div>
                    </>
                  ) : active === 'audio' ? (
                    <>
                      <div className="waveform" aria-hidden="true">
                        {Array.from({ length: 42 }, (_, i) => (
                          <i key={i} style={{ height: `${12 + (Math.sin(i * 1.9) + 1) * 23}px` }} />
                        ))}
                      </div>
                      <h3>Read. Listen. Connect.</h3>
                      <p>A recording linked to its source content.</p>
                      <div className="sample-field">
                        <span>RECORDING STATUS</span>
                        <p>No audio file connected in this preview.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="book-visual" aria-hidden="true">
                        ▤
                      </div>
                      <h3>From book to individual verse.</h3>
                      <p>Book → Chapter 1 → Verse 1</p>
                      <div className="sample-field">
                        <span>STRUCTURED READING</span>
                        <p>Chapter and verse organization where applicable.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="json-pane">
                <div className="code-top">
                  <span>response.json</span>
                  <span>SCHEMA EXAMPLE</span>
                </div>
                <pre>
                  <code>{JSON.stringify(samples[active], null, 2)}</code>
                </pre>
                <div className="code-note">Placeholder values · Not a production API response</div>
              </div>
            </div>
          </div>
        </section>
        <section className="section wrap" id="features">
          <div className="eyebrow">03 / FROM IDEA TO INTEGRATION</div>
          <h2>
            Less content wrangling.
            <br />
            More meaningful building.
          </h2>
          <div className="features-grid">
            {[
              [
                '01',
                'Get access',
                'Request a plan and review the content license for your intended app or website.',
              ],
              [
                '02',
                'Explore the catalog',
                'Find relevant text, audio, and books through search and filtering.',
              ],
              [
                '03',
                'Make it your own',
                'Integrate content into a reading view, listening experience, or scripture explorer.',
              ],
              [
                '04',
                'Keep usage in view',
                'Use API keys and usage reporting to manage requests and audio delivery.',
              ],
            ].map(([n, t, c]) => (
              <article key={n}>
                <span className="step-number">{n}</span>
                <h3>{t}</h3>
                <p>{c}</p>
              </article>
            ))}
          </div>
          <div className="feature-band">
            <span className="feature-band-icon">↳</span>
            <div>
              <h3>Built around the way content connects.</h3>
              <p>
                Keep verse references beside translations, attach recordings to the relevant text,
                and organize longer reading experiences by book and chapter.
              </p>
            </div>
            <a className="text-link" href="#developers">
              See the integration <span>→</span>
            </a>
          </div>
        </section>
        <section id="developers" className="developer-section">
          <div className="wrap developer-grid">
            <div>
              <div className="eyebrow">04 / FOR THE BUILDERS</div>
              <h2>
                Ancient knowledge.
                <br />A familiar interface.
              </h2>
              <p>
                Work with structured content in your own application. Keep API credentials on your
                server, then shape the experience around your users.
              </p>
              <ul className="check-list">
                <li>Text, audio, and book structures</li>
                <li>Catalog search and filtering</li>
                <li>API keys and usage reporting</li>
              </ul>
              <Link className="button button-light" href="/docs">
                Read the integration guide <span>↗</span>
              </Link>
            </div>
            <div className="request-card">
              <div className="code-top">
                <span>example.sh</span>
                <button onClick={copy}>{copied ? 'Copied ✓' : 'Copy request'}</button>
              </div>
              <pre>
                <code>{exampleRequest}</code>
              </pre>
              <div className="request-response">
                <span>↳ RESPONSE SHAPE</span>
                <pre>
                  <code>
                    {'{\n  "data": [\n    { "type": "shastra", "chapters": [...] }\n  ]\n}'}
                  </code>
                </pre>
              </div>
              <p>
                Illustrative endpoint and schema. Production API documentation is not yet connected.
              </p>
            </div>
          </div>
        </section>
        <PricingTables />
        <section className="faq-section">
          <div className="wrap faq-grid">
            <div>
              <div className="eyebrow">06 / GOOD TO KNOW</div>
              <h2>A little more clarity.</h2>
              <p>
                Thoughtful integrations start
                <br />
                with the right questions.
              </p>
              <Link className="text-link" href="/access">
                Contact & access details <span>↗</span>
              </Link>
            </div>
            <div>
              {faqs.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>
                    {a}
                    {q.includes('astrology') && (
                      <>
                        {' '}
                        <Link href="/astrology-api">Review astrology integration →</Link>
                      </>
                    )}
                    {q.includes('license') && (
                      <>
                        {' '}
                        <Link href="/license">View license status →</Link>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="closing wrap">
          <Rosette className="closing-rosette" />
          <div className="eyebrow">BUILD SOMETHING MEANINGFUL.</div>
          <h2>
            Timeless wisdom.
            <br />
            <em>New possibilities.</em>
          </h2>
          <p>
            Bring mantras, sacred audio, and shastra books
            <br />
            into the experiences you create.
          </p>
          <Link className="button" href="/access">
            Request API access <span>↗</span>
          </Link>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap footer-top">
          <div>
            <Link href="/" aria-label="Mantrilo home">
              <Brand />
            </Link>
            <p>Sacred content. Thoughtfully connected.</p>
          </div>
          <div className="footer-links">
            <a href="#library">Content Library</a>
            <Link href="/docs">Documentation</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/astrology-api">Astrology</Link>
            <Link href="/access">Contact</Link>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} Mantrilo</span>
          <span>Made for meaningful creations.</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/license">Content license</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
