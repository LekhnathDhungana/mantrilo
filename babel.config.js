module.exports = function (api) {
  api.cache(true);
  return {
    // `typeof window` is folded on web too, so server-only branches (every language's strings in
    // src/i18n/index.ts) are dropped from the browser bundle.
    presets: [['babel-preset-expo', { web: { minifyTypeofWindow: true } }]],
  };
};
