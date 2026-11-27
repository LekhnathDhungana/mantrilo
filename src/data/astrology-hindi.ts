// Astrology operations that can answer in Hindi, and the field under `parameters` that asks for
// it. Each passes the field straight to the calculation provider, which accepts only "en" or "hi";
// codes, scores and other calculated values stay the same in both languages. Other operations
// answer in English. What each one translates is under astroHindi.ops.<operation> in the locales.

export const hindiOperations: Record<string, 'lang' | 'language'> = {
  'vedic-daily-sign': 'lang',
  'vedic-daily-bulk': 'lang',
  'western-daily-sign': 'lang',
  'vedic-muhurat': 'language',
  'vedic-compatibility': 'language',
};

/** The parameter that selects Hindi, such as `"lang": "hi"`, or null for English-only operations. */
export const hindiField = (operation: string) =>
  hindiOperations[operation] ? `"${hindiOperations[operation]}": "hi"` : null;
