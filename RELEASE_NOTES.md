# @cawrestler/react-native-duo 0.1.0

The first stable release of the React Native bridge to Apple's iPhone Duo APIs: arrangements, adaptive vertical toolbars, hinge and reserved regions, inner/outer cameras, and scene accessories. This release also adds Android foldable support, so the same provider and arrangement code adapts to Pixel Fold–class devices.

`0.1.0` is published on npm's `latest` tag. The exports labeled **stable** in [API stability](./docs/API_STABILITY.md) follow semantic versioning from here: breaking changes need a new minor version while the package is `0.x`, with a changelog migration note. Exports labeled **experimental** (`@experimental` in editor hover info) may still change in any minor release.

## What's new since 0.1.0-preview.2

- **Android foldables.** On devices Jetpack WindowManager supports, `DuoProvider` is native on Android. It reports hinge posture (`fullyOpen` / `partiallyOpen`, or `closed` from the hinge-angle sensor), the hinge angle where the device has a hinge-angle sensor, and the fold as a reserved region that is active while it separates content. `DuoArrangementView` places its panes on either side of an active fold. `isDuo` and `supportsDuoApis` stay `false` on Android because they describe iPhone Duo; check `hinge.available` for foldable-aware layouts.
- **React content in scene accessories.** `DuoSceneAccessory` accepts React `children` and renders them into the connected external-display or camera-capture scene at its size. State adds `connected` and `size`. Declarative `content` still works and becomes optional when you pass children.
- **Jest mock.** `@cawrestler/react-native-duo/jest` renders components with the JavaScript fallbacks. `setMockDuoEnvironment` simulates a Duo, a hinge pose, or reserved regions mid-test.
- **API stability labels.** Each export is classified as stable or experimental in [docs/API_STABILITY.md](./docs/API_STABILITY.md).
- **End-to-end tests.** Maestro flows for the Duo Lab example (`yarn example e2e`) cover arrangement switching, toolbar placement, and scene accessory registration on the iPhone Duo simulator.
- **Release-channel docs** match the registry, and the README has a demo GIF and a compatibility report issue template.

## Install

```sh
npm install @cawrestler/react-native-duo
```

Expo apps need a development build (Expo Go can't load native code). Add the config plugin and rebuild after installing. See the [README](./README.md) for Expo and bare React Native setup.

## Requirements and compatibility

- React Native's New Architecture (Fabric) must be enabled.
- iOS: building needs Xcode 27.1+ and the iOS 27.1 SDK. Native Duo features need iOS 27.1+ on iPhone Duo; older iOS runtimes use compatibility paths.
- Android: foldable support uses `androidx.window` 1.3.0, and the hinge angle needs API 30+ on a device with a hinge-angle sensor. Phones without a hinge get the same fallback values as before.
- The tested baseline is React Native `0.88.0-rc.1`, React `19.3.0`, and Expo `58.0.0`, as resolved by the repository lockfile. Other combinations are not a tested compatibility guarantee; see the [compatibility guide](./docs/COMPATIBILITY.md).

## What was tested for this release

- Automated: lint, type checks, 77 Jest tests (library, Jest mock, fold split, scene accessory, provider, navigation, camera state), 59 tooling and release-safeguard tests, and the packed-tarball check. CI builds the example on Android, iOS (Xcode 27.1), and web.
- iPhone Duo simulator (Xcode 27.1): the Maestro flows pass, and the React-content scene accessory registers and reports that no scene is connected.
- Pixel Fold emulator (Android 16 / API 36): hinge posture and angle are reported (`partiallyOpen`, 90°) and the fold arrives as an active division region.

## Known limitations

- **Not verified on physical hardware:** iPhone Duo cameras, smart framing, and interruption recovery; accessory scenes actually connecting (the simulator can't attach an external display or run camera capture); and Android foldable hardware. Test these on the intended devices before shipping.
- **No independent React Native windows.** `supportsMultipleWindows` reports the app's declaration; the package doesn't open additional React-rendered scenes.
- **No camera capture pipeline.** No photos, video recording, or frames delivered to JavaScript.
- **Accessory content is noninteractive** and shares the calling React tree.
- **Android is foldables-first.** Toolbars, cameras, scene accessories, and `DuoGeometryView` still use the JavaScript fallbacks on Android.
- **Automatic arrangement and bar placement are system policy.** The package doesn't promise identical decisions to SwiftUI's `automaticArrangement`, and toolbar compression is a preference, not a guarantee.

See the [changelog](./CHANGELOG.md) for the full list of changes.
