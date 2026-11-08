import { Link } from 'expo-router';
import Seo from './Seo.web';
import './marketing.css';
export default function NotFound() { return <><Seo path="/404" notFound /><main className="wrap info-main"><div className="eyebrow">MANTRILO / 404</div><h1>That page isn’t here.</h1><p>Explore the content API overview or return to the integration guide.</p><p><Link className="button" href="/">Mantrilo home →</Link></p><p><Link href="/docs">Integration guide →</Link></p></main></>; }
