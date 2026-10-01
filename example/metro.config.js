const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Expo configures workspace resolution; this condition selects the package's
// live TypeScript source so editing the library updates the lab immediately.
config.resolver.unstable_conditionNames = [
  'cawrestler-react-native-duo-source',
  ...(config.resolver.unstable_conditionNames ?? []),
];

module.exports = config;
