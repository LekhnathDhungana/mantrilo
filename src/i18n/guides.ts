import type { TFunction } from 'i18next';
import type { Guide } from '../../developer/src/data/integrations';
import en from './locales/en.json';

// Wording for the integration guides. The guide data in developer/src/data/integrations.ts is
// shared with the developer console, so the site keeps its translations in the locale files under
// guides.<id>, and builds the generic astrology input notes from guides.common templates the same
// way that file does. Operation names come from the API's published catalog and stay as they are.

const labelKeys = new Map(Object.entries(en.guides.labels).map(([key, text]) => [text, key]));

export function guideText(t: TFunction, guide: Guide) {
  const key = `guides.${guide.id}`;
  const text = (field: string, fallback: string) => t(`${key}.${field}`) || fallback;
  const label = guide.sampleLabel ? labelKeys.get(guide.sampleLabel) : undefined;
  return {
    name: guide.area === 'Astrology' ? guide.name : text('name', guide.name),
    summary: text('summary', guide.summary),
    render:
      guide.render === 'Inspect the calculation response.'
        ? t('guides.common.defaultRender')
        : text('render', guide.render),
    inputs: t(`${key}.inputs`) || composedInputs(t, guide),
    usage: t(`${key}.usage`) || t('guides.common.oneRequest'),
    sampleLabel: label ? t(`guides.labels.${label}`) : (guide.sampleLabel ?? t('code.response')),
    followup: (index: number, fallback: string) => text(`followups.${index}`, fallback),
  };
}

function composedInputs(t: TFunction, guide: Guide) {
  const { operation: _operation, ...input } = (guide.body ?? {}) as Record<string, unknown>;
  const parameters =
    input.parameters && typeof input.parameters === 'object' ? Object.keys(input.parameters) : [];
  const birth = /"(hour|datetime)"/.test(JSON.stringify(input));
  return [
    parameters.length
      ? t('guides.common.paramsList', { params: parameters.join(', ') })
      : t('guides.common.paramsEmpty'),
    birth ? t('guides.common.birth') : '',
    t('guides.common.synthetic'),
  ]
    .filter(Boolean)
    .join(' ');
}
