# React Native Duo Lab

This example is both a smoke test and a copyable, interactive catalog for every public API in `@cawrestler/react-native-duo`. Every lab scrolls and includes a plain-language explanation, live controls, native state, a complete prop reference, and a code sample.

## Run it

From the repository root:

```sh
corepack enable
yarn install
yarn example ios
```

Select an iPhone Duo simulator running iOS 27.1 or newer. The example is a native Expo development build; it will not run inside Expo Go.

The checked-in Expo config enables the scene lifecycle required by the iOS 27 SDK and builds Expo modules from source with the current Xcode toolchain. If the native project needs to be refreshed:

```sh
cd example
npx expo prebuild --clean
cd ..
yarn example ios
```

## Tour

- **Overview / Provider** explains `DuoProvider`, `useDuo`, `useDuoHinge`, `useDuoReservedRegions`, `useDuoCameras`, and `defaultDuoEnvironment` while displaying every live environment value.
- **Toolbar** explains and controls `DuoAdaptiveToolbar`, including vertical opt-in, compression, title visibility, item behavior, and live UIKit placement.
- **Layout** explains `DuoArrangementView` and lets you switch split/overlay arrangements, axes, pane size, overlay edge, and animation while inspecting UIKit's chosen state.
- **Camera** explains `DuoCameraView` and demonstrates user-triggered permission, physical or direction-relative selection, session state, mirroring, resize modes, direction maps, and smart framing.
- **Scenes** explains `DuoSceneAccessory`, registers either companion-surface kind, previews its declarative content, and shows registration and availability.

The toolbar at the edge of the app is itself `DuoAdaptiveToolbar`. Use it to move between labs, then change the Duo simulator's fold state, orientation, and window size to watch UIKit adapt it.

## Package components shown live

| Package export | Where to see it |
| --- | --- |
| `DuoProvider` | Wraps the complete application in `src/app/_layout.tsx`; documented on Overview. |
| `useDuo` and focused hooks | Overview shows every value and which hook to choose. |
| `DuoAdaptiveToolbar` | Wraps Expo Router in `demo-shell.tsx`; controlled on Toolbar. |
| `DuoArrangementView` | Interactive split/overlay surface on Layout. |
| `DuoCameraView` | Native preview and state panel on Camera. |
| `DuoSceneAccessory` | Interactive companion registration on Scenes and camera-capture integration on Camera. |

## Reading the result badges

- **Duo detected** means the current view hierarchy reports a hinge, reserved region, or Duo camera.
- **API ready · no Duo hardware** means iOS has the APIs but this simulator/device is not currently reporting Duo capabilities.
- **Fallback mode** means the app is on Android, web, or an iOS runtime without the Duo API surface.

Each lab ends with a small copyable JSX pattern. The full package guide and API notes are in the [root README](../README.md).

## Web and Android

The demo also renders on web and Android to make fallback behavior easy to inspect:

```sh
yarn example web
yarn example android
```

Those platforms intentionally report unsupported hardware APIs while retaining a functional arrangement and horizontal toolbar.
