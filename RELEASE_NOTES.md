# @cawrestler/react-native-duo 0.1.0-preview.1

The first developer preview brings iPhone Duo's native layout, hinge, toolbar, camera-preview, and companion-surface APIs to React Native through typed components and hooks. App developers compose React/TypeScript; the package provides the UIKit and AVFoundation bridge.

This is an evaluation release, not a stable production-support promise. APIs and integration details may change before `0.1.0`. The npm channel is `next`, and the GitHub release is a prerelease.

## Highlights

- **Live Duo environment:** `DuoProvider`, `useDuo()`, `useDuoHinge()`, `useDuoReservedRegions()`, and `useDuoCameras()` expose capability detection, hinge angle/status, native size classes, camera discovery, and window metrics.
- **View-local geometry:** `DuoGeometryView` measures reserved regions and safe areas in the coordinates of the actual content view, including inactive regions when requested.
- **Adaptive panes:** `DuoArrangementView` hosts ordinary React content in UIKit split or overlay arrangements, with axis, size, animation, and live visibility controls.
- **Native adaptive bars:** `DuoAdaptiveToolbar` provides actions, tabs, selection, badges, overflow, alternate vertical symbols, and compression preferences. UIKit chooses the placement and may show separate toolbar/tab groups when both fit.
- **Safe content and full-width backgrounds:** `contentLayout="safeArea"` remains the default. The decorative `background` slot fills the host; `contentLayout="edgeToEdge"` enables intentionally immersive content. Removing app bars no longer reserves a phantom app rail, while system-reserved areas remain protected. Reported host dimensions and safe insets remain available in both modes.
- **Camera preview:** `DuoCameraView` exposes physical and direction-relative camera selection, permission, session control, preview sizing/rotation, supported dynamic aspect ratios, sensor compensation, and smart-framing monitoring/application where available.
- **Companion surfaces:** `DuoSceneAccessory` registers native external-display or camera-capture accessories with declarative text, SF Symbols, colors, gradients, and typography.
- **Duo Lab RN:** the repository includes seven guided screens modeled on the SwiftUI lab, plus the Duo Studio canvas experiment with Day/Dusk/Night artwork, region-aware controls, bar visibility options, and opt-in layout diagnostics.

The distribution includes JavaScript, TypeScript declarations, Fabric/codegen sources, native implementations, the podspec, and the Expo camera-permission plugin. The demo stays in the GitHub repository, not the npm package.

## Requirements and compatibility

- React Native's New Architecture/Fabric must be enabled.
- Building the native iOS implementation requires Xcode 27.1+ and the iOS 27.1 SDK. Native Duo features require iOS 27.1+ and eligible hardware/window state.
- The reproducible demo baseline is React Native `0.88.0-rc.1`, React `19.3.0`, and Expo `58.0.0`, as resolved by the repository lockfile. Other version combinations are not a tested compatibility guarantee.
- Expo apps require a native development build; Expo Go cannot load the package. Rebuild after installing or changing native sources/codegen.
- Android/web provide React Native arrangement and horizontal toolbar fallbacks. Older iOS runtimes use compatibility paths, but an older SDK cannot compile the Duo native source. Fallbacks do not emulate Duo hardware telemetry, vertical UIKit rails, cameras, or scene accessories.
- Camera and companion-surface availability depends on the device, permission, display connections, and system eligibility. API support or successful registration alone does not mean the feature can currently be presented.

## Known limitations

- **Independent React Native windows are not implemented yet.** `supportsMultipleWindows` reports the app/runtime declaration; it does not open or coordinate additional React-rendered scenes. The demo's diagnostics preview is an in-app modal. SwiftUI's `WindowGroup` equivalent requires separate native scene-hosting and RN/Expo lifecycle work, not a JavaScript setting.
- **No camera capture pipeline.** This preview does not take photos, record video, or deliver camera frames to JavaScript.
- **Accessories use declarative native content.** They do not host another React component tree.
- **Automatic arrangement is UIKit policy.** The package does not promise identical decisions to SwiftUI's `automaticArrangement` in every fold/window state, nor complete visual parity with the SwiftUI app.
- **Bar placement remains system-owned.** Compression is a preference, not an unconditional hide/show instruction. Vertical-bar opt-out affects the component's controls, not the app's window-wide status-bar axis.
- **Edge-to-edge is opt-in.** Apps must position important controls around safe areas and reserved regions. Duo Studio's small control-lane policy is an example, not a general collision-layout engine; it does not change the package's safe defaults.
- **Simulator testing is not physical hardware certification.** Camera, companion-display, accessibility, and touch/scroll behavior should be checked on the intended device/runtime before shipping a consuming app. In particular, native drag scrolling still needs manual release confirmation.

## Try the preview

After the maintainer publishes this version, pin it for reproducible evaluation:

```sh
npm install @cawrestler/react-native-duo@0.1.0-preview.1
```

Use `@next` instead of the exact version to follow future previews. Until publication, build and install a local `.tgz` using the README's distribution instructions. In either case, follow the Expo or bare React Native setup and rebuild the native app before testing.

The [README](https://github.com/CAWRESTLER/react-native-duo/blob/v0.1.0-preview.1/README.md) contains the complete API reference. The [example guide](https://github.com/CAWRESTLER/react-native-duo/blob/v0.1.0-preview.1/example/README.md) explains each experiment and how to compare fold states with the SwiftUI lab.

## Feedback

Report issues with the package and RN/Expo versions, Xcode/iOS version, device or simulator, fold pose/window size, affected screen, and reproduction steps. Screenshots or recordings of layout/interaction differences are especially useful. Please distinguish unsupported hardware from incorrect supported behavior.

[Report an issue](https://github.com/CAWRESTLER/react-native-duo/issues/new/choose).
