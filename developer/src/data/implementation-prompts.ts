import { epicBooks } from './epic-books';
import { productionApi, type Guide } from './integrations';

export type PromptFeature = Pick<
  Guide,
  'id' | 'name' | 'summary' | 'method' | 'path' | 'body' | 'inputs' | 'render' | 'followupPaths' | 'limited'
> & { liveOnly?: boolean; docsUrl?: string };

export function implementationPrompt(
  feature: PromptFeature,
  credential?: { secret: string; environment: 'sandbox' | 'production' },
): string {
  const docsUrl = feature.docsUrl ?? `https://www.mantrilo.com/docs?guide=${feature.id}`;
  const request = [
    `${feature.method} ${productionApi}${feature.path}`,
    `Authorization: Bearer ${credential?.secret ?? '$MANTRILO_API_KEY'}`,
    ...(feature.body ? ['Content-Type: application/json', '', JSON.stringify(feature.body, null, 2)] : []),
  ].join('\n');
  const followups = feature.followupPaths?.map(([label, path]) => `- ${label}: GET ${path}`);
  const availability = feature.limited
    ? 'This operation is currently unavailable. Check the operation catalog, build an unavailable state, and use a mock response for local testing until the operation is enabled.'
    : feature.liveOnly
      ? 'This title requires a live key. Use fixtures for local or automated tests when a live key is unavailable.'
      : 'Use a sandbox key and documented samples for development where supported. Use a live key for the full content catalog. For astrology, verify the operation is enabled for the workspace.';
  return [
    `Implement this feature in my project using the Mantrilo API: ${feature.name}.`,
    'Project context: [app, framework, backend, and where this feature belongs]. Inspect the project for existing conventions. Ask for missing details only when they affect the implementation.',
    `Goal: ${feature.summary}\nDocs: ${docsUrl}`,
    `Request it from the backend:\n${request}`,
    ...(followups?.length ? [`Related requests:\n${followups.join('\n')}`] : []),
    `Inputs: ${feature.inputs}\nDisplay: ${feature.render}\nAccess: ${availability}`,
    ...(credential
      ? [`The request includes my ${credential.environment === 'sandbox' ? 'sandbox' : 'live'} key. Treat it as a secret. Use it only through MANTRILO_API_KEY for a local smoke test. Do not echo it or write it into generated files.`]
      : []),
    'Use my existing server framework and read MANTRILO_API_KEY from its environment or secret store. Keep the key out of client bundles, source control, and logs. Apply the app’s existing access controls and validate user inputs before calling Mantrilo.',
    'Add a thin backend integration and connect the UI to it. Handle loading, empty results, and upstream errors. Respect Retry-After for rate limits and surface exhausted quota without retry loops. Use synthetic test inputs and return only the fields the UI needs.',
    'Show the files changed, environment setup, and one reproducible smoke test.',
  ].join('\n\n');
}

export const epicPromptFeatures: PromptFeature[] = epicBooks.map(({ id, title, chapters }) => ({
  id,
  name: title + ' reader',
  summary: `Build a reader for the ${chapters}-chapter English prose retelling of the ${title}.`,
  method: 'GET',
  path: `/v1/books/${id}`,
  followupPaths: [['First chapter', `/v1/books/${id}/chapters/1`]],
  inputs: 'Use the book’s chapters array to select a chapter number. Fetch that chapter without an offset.',
  render: 'For format "prose", show data.source and render each section in data.sections in order, using its title and paragraphs. The chapter is complete in one response and nextOffset is null.',
  liveOnly: true,
  docsUrl: `https://www.mantrilo.com/docs#epic-${id}`,
}));
