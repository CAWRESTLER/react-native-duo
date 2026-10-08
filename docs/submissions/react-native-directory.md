# React Native Directory submission

Add `@cawrestler/react-native-duo` to the end of `react-native-libraries.json` in [react-native-community/directory](https://github.com/react-native-community/directory):

```json
{
  "githubUrl": "https://github.com/CAWRESTLER/react-native-duo",
  "npmPkg": "@cawrestler/react-native-duo",
  "examples": [
    "https://github.com/CAWRESTLER/react-native-duo/tree/main/example",
    "https://github.com/CAWRESTLER/react-native-duo-expo-starter"
  ],
  "ios": true,
  "android": true,
  "web": true,
  "configPlugin": true,
  "newArchitecture": "new-arch-only"
}
```

**Notes for reviewers:** Native Duo behavior requires iOS 27.1+ and Xcode 27.1+. Since `0.1.0`, Android foldables get native hinge posture, hinge angle, and fold regions through Jetpack WindowManager, and arrangements split along the fold; other Android components and web use documented JavaScript fallbacks. The package requires the New Architecture (Fabric).

**Status:** merged in [react-native-community/directory#2868](https://github.com/react-native-community/directory/pull/2868). The directory reads the version, description, and topics from npm and GitHub automatically, so later releases don't need a directory PR unless a platform flag or example link changes.
