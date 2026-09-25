const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin for react-native-duo.
 * Native views autolink automatically; this plugin only provides host permissions.
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
