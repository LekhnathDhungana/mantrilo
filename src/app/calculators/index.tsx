import CalculatorHub from '../../components/CalculatorHub';
import { pageMetadata } from '../../data/metadata';

export default function Page() {
  return <CalculatorHub />;
}

export function generateMetadata() {
  return pageMetadata('/calculators');
}
