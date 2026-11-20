import { Link } from 'expo-router';
import { curlGet, MANTRA_ID, verse } from '../data/examples';
import { consoleSandboxUrl } from '../data/site';
import { CodePanel } from './site/Code.web';
import { KeyButton, PageHero, SiteFrame } from './site/Chrome.web';

export default function MantraPreview() {
  const path = `/v1/mantras/${MANTRA_ID}`;
  return (
    <SiteFrame path="/library/mantras/aham-vaishvanaro-bhutva">
      <PageHero
        title="Aham Vaishvanaro Bhutva"
        eyebrow="Library · Bhagavad Gita 15.14"
        lede="In this verse, Krishna describes the fire within living beings that digests food. The verse is also recited before meals."
      />
      <section className="mh-section-sm">
        <div className="mh-wrap mh-split">
          <div className="mh-prose">
            <h2>Read and listen</h2>
            <p className="mh-preview-verse" lang="sa-Deva">
              {verse.sanskrit}
            </p>
            <p className="mh-preview-verse" lang="sa-Latn">
              {verse.transliteration}
            </p>
            <audio
              controls
              preload="none"
              aria-label="Aham Vaishvanaro Bhutva recording"
              src={`/samples/${MANTRA_ID}.m4a`}
            />
            <p>
              <Link href="/library/books/bhagavad-gita">Bhagavad Gita chapter index</Link> ·{' '}
              <a href="https://heritage.iitk.ac.in/SBG/15.14">Text reference</a>
            </p>
          </div>
          <div className="mh-prose mh-stack">
            <h2>Add this mantra to your app</h2>
            <CodePanel title={path} method="GET" code={curlGet(path)} />
            <p>
              <Link href="/docs#get-mantra">Mantra endpoint</Link> ·{' '}
              <Link href="/docs/guides/sacred-audio">Playback guide</Link>
            </p>
            <div>
              <KeyButton href={consoleSandboxUrl({ preset: 'featured-mantra' })}>
                Try this mantra
              </KeyButton>
            </div>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
