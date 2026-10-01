const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// The root library is an implicit workspace. Expo's on-demand filesystem can
// resolve it without watching it; include only its source, not native builds.
config.watchFolders = [
  ...new Set([
    ...(config.watchFolders ?? []),
    path.resolve(__dirname, '..', 'src'),
  ]),
];

// Expo configures workspace resolution; this condition selects the package's
// live TypeScript source so editing the library updates the lab immediately.
config.resolver.unstable_conditionNames = [
  'cawrestler-react-native-duo-source',
  ...(config.resolver.unstable_conditionNames ?? []),
];

module.exports = config;
