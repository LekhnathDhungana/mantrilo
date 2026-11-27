module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_PUBLIC_CONSOLE_BASE_PATH;
  return baseUrl ? { ...config, experiments: { ...config.experiments, baseUrl } } : config;
};
