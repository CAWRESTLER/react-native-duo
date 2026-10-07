# @cawrestler/react-native-duo 0.1.0-preview.2

This developer preview builds on the first preview's native layout, hinge, toolbar, camera-preview, and companion-surface APIs. App developers compose React/TypeScript; the package provides the UIKit and AVFoundation bridge. Installing `0.1.0-preview.1` does not include the changes described here.

This is for evaluation, not a stable production-support promise. APIs and integration details may change before `0.1.0`. This release targets npm `next` and a GitHub prerelease; it is not a stable release. Because npm requires a `latest` tag, `latest` was later moved from `0.1.0-preview.1` to this preview (both tags point to `0.1.0-preview.2` as of 2026-10-07); that alias is not a stable-release claim. Registry availability, not the presence of these notes, confirms publication.

## Changes since preview.1

- **Navigator-owned integration:** `DuoNavigationToolbar` attaches screen actions to an existing native navigation stack without replacing its controllers. The host navigator retains header/back/tab/modal ownership; use screen focus to activate the appropriate toolbar. Explicit `horizontalPresentation="inline"` hosts a measured, screen-local UIKit action toolbar for wrapped native tabs whose horizontal stack toolbar does not render; vertical actions still use the existing stack. The default remains `navigator`. Standalone `DuoAdaptiveToolbar` remains available for screens that own their bars.
- **Isolated provider subscriptions:** existing hooks keep their signatures; new `useDuoGeometry()` and `useDuoWindow()` subscribe to their respective fields. Structurally shared snapshots keep unrelated narrow-hook consumers from rerendering on hinge-angle updates. `useDuo()` still observes the complete environment. A stable native-provider wrapper contains siblings and RN modals without an app-specific wrapper workaround; simulated fold/rotation tests verify draft state is not remounted by telemetry updates.
- **Camera lifecycle diagnostics and recovery:** additive optional `status`, `interrupted`, `interruptionReason`, `interruptionReasonCode`, and structured `errorDetails` distinguish interruption/runtime failure from an idle or stopped preview. The existing `error` string remains. Normal interruptions resume only a mounted, active, foreground, authorized session; media-services reset gets at most one automatic retry per explicit activation/configuration. Other fatal runtime failures require `active={false}` followed by `true`. Errors from asynchronous aspect-ratio and smart-framing application are reported. Diagnostics can persist after automatic recovery; inspect `running`/`status` rather than treating a non-null error as proof capture is still stopped.
- **Reproducible compatibility checks:** a recorded RN `0.88.0-rc.1` / React `19.3.0` / locked Expo `58.0.0` baseline is checked against manifests and Yarn resolutions in local validation, CI, and release verification. Checks do not certify all RN/Expo stacks or uninspected apps.
- **Explicit validation boundaries:** the compatibility guide documents fold/rotation/scroll/navigation/accessibility/draft-preservation checks and distinguishes automated, manual, and physical-device evidence. Connie remains unverified pending inspection of its actual host and versions.

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
- Node `v24.21.0` and Yarn `4.11.0` define the repository development toolchain. See the [compatibility guide](./docs/COMPATIBILITY.md) for what automated checks establish and the manual/device validation still required.
- Provider/navigation/camera bridge tests use mocked native hosts; the compiled camera-policy tests exercise restart guards, not AVFoundation devices. None establishes compatibility with Connie or other uninspected consuming apps, real navigation ownership, physical-camera recovery, accessibility, or a performance benchmark.
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
- **Simulator testing is not physical hardware certification.** Camera, companion-display, accessibility, and touch/scroll behavior must be checked on the intended device/runtime before shipping a consuming app. Complete and record the candidate's manual checklist; source tests and a successful build are not interaction or visual-parity evidence.

## Try the preview

Once this release is published, pin its exact version:

```sh
npm install @cawrestler/react-native-duo@0.1.0-preview.2
```

Use `@next` instead of the exact version to follow published previews. Verify availability with `npm view @cawrestler/react-native-duo dist-tags`; before publication, evaluate a locally built `.tgz` instead. In either case, follow the Expo or bare React Native setup and rebuild the native app before testing.

Use this version's [README](./README.md), [navigation guide](./docs/NAVIGATION.md), and [example guide](./example/README.md). The preview.1 reference remains available in its [versioned README](https://github.com/CAWRESTLER/react-native-duo/blob/v0.1.0-preview.1/README.md) and [versioned example guide](https://github.com/CAWRESTLER/react-native-duo/blob/v0.1.0-preview.1/example/README.md).

## Feedback

Report issues with the package and RN/Expo versions, Xcode/iOS version, device or simulator, fold pose/window size, affected screen, and reproduction steps. Screenshots or recordings of layout/interaction differences are especially useful. Please distinguish unsupported hardware from incorrect supported behavior.

[Report an issue](https://github.com/CAWRESTLER/react-native-duo/issues/new/choose).
