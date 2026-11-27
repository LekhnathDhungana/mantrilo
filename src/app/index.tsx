import { pageMetadata } from '../data/metadata';
import Marketing from '../components/Marketing';
export default Marketing;

export function generateMetadata(_request?: unknown, params?: Record<string, string | string[]>) {
  return pageMetadata('/', undefined, params);
}
