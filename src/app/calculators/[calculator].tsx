import { createStaticLoader } from 'expo-router/server';
import CalculatorPage from '../../components/CalculatorPage';
import { calculatorPages } from '../../data/calculator-pages';
import { pageMetadata } from '../../data/metadata';

// One static page per sign calculator. The calculation itself runs in the browser against the
// API's keyless public endpoint.

export async function generateStaticParams() {
  return calculatorPages.map((page) => ({ calculator: page.slug }));
}

// The exporter also renders the bare [calculator] template; finalize-web removes that file.
export const loader = createStaticLoader(
  (params) => calculatorPages.find((page) => page.slug === params.calculator) ?? null,
);

export function generateMetadata(_request: unknown, params: Record<string, string | string[]>) {
  return pageMetadata(`/calculators/${String(params.calculator)}`);
}

export default function Page() {
  return <CalculatorPage />;
}
