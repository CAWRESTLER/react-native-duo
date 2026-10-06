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

**Notes for reviewers:** Native Duo behavior requires iOS 27.1+ and Xcode 27.1+. Android and web install and render with documented JavaScript fallbacks (no native Duo UI). The package requires the New Architecture (Fabric).

If `react-native-duo-expo-starter` is not published yet, omit that example URL or publish the template repo first.

Prepared patch branch (local): `add-cawrestler-react-native-duo` against directory `main`.
