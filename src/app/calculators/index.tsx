import CalculatorHub from '../../components/CalculatorHub';
import { pageMetadata } from '../../data/metadata';

export default function Page() {
  return <CalculatorHub />;
}

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/calculators', undefined, params);
}
