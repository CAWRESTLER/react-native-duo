const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin for `@cawrestler/react-native-duo`.
 *
 * Native Fabric views autolink through React Native; this plugin configures host
 * permissions. On Expo SDK 57, also add `expo-build-properties` with
 * `ios.enableSceneSupport: true` (SDK 58 enables scene support by default).
 *
 * @type {import('@expo/config-plugins').ConfigPlugin<{ cameraPermission?: string }>}
 */
module.exports = function withReactNativeDuo(config, options = {}) {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSCameraUsageDescription =
      options.cameraPermission ||
      nextConfig.modResults.NSCameraUsageDescription ||
      'Allow this app to use the inner and outer cameras on iPhone Duo.';
    return nextConfig;
  });
};
