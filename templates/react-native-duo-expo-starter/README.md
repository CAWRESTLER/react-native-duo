# react-native-duo-expo-starter

Minimal [Expo Router](https://docs.expo.dev/router/introduction/) template with the **New Architecture** enabled and [`@cawrestler/react-native-duo`](https://www.npmjs.com/package/@cawrestler/react-native-duo) wired up.

- [`DuoProvider`](https://github.com/CAWRESTLER/react-native-duo) at the root
- **Arrangement** tab — `DuoArrangementView` split demo with live hinge readout
- **Toolbar** tab — `DuoNavigationToolbar` on an Expo Router screen (native header + tabs stay navigator-owned)

Full API lab and docs: [CAWRESTLER/react-native-duo](https://github.com/CAWRESTLER/react-native-duo)

## Requirements

- Node 20+
- Xcode **27.1+** for native Duo APIs (pick the **iPhone Duo** simulator)
- Expo development build — **Expo Go is not supported** (native module)

## Install and run

```sh
git clone https://github.com/CAWRESTLER/react-native-duo-expo-starter.git
cd react-native-duo-expo-starter
npm install
npx expo run:ios
```

Choose **iPhone Duo** when prompted. Rebuild the dev client after upgrading `@cawrestler/react-native-duo`.

## Package

This template depends on the published npm package:

```sh
npm install @cawrestler/react-native-duo@next
```

Preview releases use the `next` dist-tag. See the [library README](https://github.com/CAWRESTLER/react-native-duo#readme) for Expo config plugin details, compatibility notes, and Android/web fallback behavior.

## License

MIT — see [LICENSE](./LICENSE).
