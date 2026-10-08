# Apple Duo API coverage matrix

This matrix maps **documented Apple iPhone Duo APIs** (iOS 27.1 / Xcode 27.1) to **`@cawrestler/react-native-duo`**. It is based on Apple's [Preparing your app for iPhone Duo](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo) guidance and the UIKit / AVFoundation symbols the package compiles against.

Legend:

| Status | Meaning |
| ------ | ------- |
| **Supported** | Wrapped with a typed React Native component or hook on iOS 27.1+ when built with the Duo SDK. |
| **Partial** | Some behavior is exposed; see notes for gaps vs the native API. |
| **Fallback** | Usable JavaScript layout or controls without native Duo behavior. |
| **Not supported** | No bridge; documented boundary or future work. |

Platform columns refer to the **package's public API**, not whether a generic RN app runs on that platform.

## Environment, hinge, and reserved regions

| Apple API (UIKit / SwiftUI) | Package API | iOS 27.1+ Duo | iOS &lt; 27.1 | Android / web |
| --------------------------- | ----------- | ------------- | -------------- | ------------- |
| `UIHingeInteraction` / SwiftUI `onHingeChange` | `DuoProvider`, `useDuo()`, `useDuoHinge()` | **Supported** — status, angle (rad/deg) | **Fallback** — `available: false`, unavailable status | **Android foldables: Supported** — posture from Jetpack WindowManager, angle from the hinge-angle sensor (API 30+) where present; web **Fallback** |
| `UIView.reservedRegions(ofKind:options:)` / SwiftUI `GeometryReader.reservedRegions` | `useDuoReservedRegions()`, `DuoGeometryView`, provider `geometry.reservedRegions` | **Supported** — division + occlusion, optional inactive (`includeInactiveRegions`) | **Fallback** — empty regions | **Android foldables: Supported** — the fold as a division/occlusion region via `useDuoReservedRegions()`, provider geometry, and view-local `DuoGeometryView`, optional inactive while flat; web **Fallback** |
| Size classes (`horizontalSizeClass` / `verticalSizeClass`) | `useDuo()` | **Supported** — native traits | **Fallback** — `unspecified` | **Fallback** — inferred unavailable |
| System vertical bar edge trait | `useDuo().verticalBarEdge` | **Supported** | **Fallback** — `unavailable` | **Fallback** |
| Duo camera discovery (`AVCaptureDevice` discovery for inner/outer/virtual front) | `useDuoCameras()` | **Supported** on eligible hardware | **Fallback** — empty list | **Fallback** |
| Window metrics / safe area | `useDuoWindow()`, provider `window` | **Supported** | **Partial** — metrics without Duo regions | **Fallback** |

**Guidance not duplicated in JS:** Apple recommends layout from **arrangements and reserved regions**, not hinge angle alone. The package exposes angle for diagnostics and effects; it does not auto-layout your UI from angle.

## Arrangements

| Apple API | Package API | iOS 27.1+ Duo | iOS &lt; 27.1 | Android / web |
| --------- | ----------- | ------------- | -------------- | ------------- |
| `UIArrangementViewController` split / overlay | `DuoArrangementView` | **Supported** — split, overlay, axes, fraction, overlay edge, animation, pane state | **Fallback** — flex split/overlay, `native: false` | **Fallback** |
| SwiftUI `ArrangementView` / `automaticArrangement` policy | `arrangement="automatic"` | **Partial** — uses UIKit default `UISplitArrangement` with both axes; not SwiftUI policy parity | **Fallback** | **Fallback** |

## Toolbars and navigation bars

| Apple API | Package API | iOS 27.1+ Duo | iOS &lt; 27.1 | Android / web |
| --------- | ----------- | ------------- | -------------- | ------------- |
| Navigation + toolbar items on a `UINavigationController` stack (vertical adaptive bars) | `DuoAdaptiveToolbar` | **Supported** — tabs, navigation groups, toolbar actions, overflow, compression, vertical symbols | **Partial** — horizontal UIKit chrome, `native: false` for Duo traits | **Fallback** — RN action/tab row |
| Screen-local actions on an **existing** native stack / Expo Router stack | `DuoNavigationToolbar` | **Supported** — `bottomBar` / `overflow`, focus ownership, inline horizontal toolbar option | **Fallback** | **Fallback** |
| `disablesVerticalBar` / `preferredVerticalBarBehavior` (component-local opt-out) | `verticalBehavior="disabled"` on `DuoAdaptiveToolbar` | **Supported** for this component's bars | **Partial** | N/A |
| Sheet `preferredPlacement` / SwiftUI `presentationPlacement` | — | **Not supported** — configure sheets in native host or future API | — | — |
| Custom `UIToolbar` / `UINavigationBar` / `UITabBar` instances | — | **Not supported by design** — use the package's controller-backed components or system navigation | — | — |

## Scenes, accessories, and multiple windows

| Apple API | Package API | iOS 27.1+ Duo | iOS &lt; 27.1 | Android / web |
| --------- | ----------- | ------------- | -------------- | ------------- |
| `UISceneAccessory` external display | `DuoSceneAccessory` `kind="externalDisplay"` | **Supported** — declarative native content or React children | **Fallback** — `supported: false` | **Fallback** |
| `UISceneAccessory` camera capture accessory | `DuoSceneAccessory` `kind="cameraCapture"` | **Supported** — declarative native content or React children | **Fallback** | **Fallback** |
| `UIApplication.supportsMultipleScenes` | `useDuo().supportsMultipleWindows` | **Supported** — read-only declaration | **Fallback** | **Fallback** |
| `UIWindowSceneActivation` / SwiftUI `WindowGroup`, `openWindow` | — | **Not supported** — no second React Native window or scene host | — | — |
| React tree inside accessory scene | `DuoSceneAccessory` `children` | **Supported** — children from the calling tree are reparented into the accessory window and sized to it; noninteractive | **Fallback** — children not rendered | **Fallback** — children not rendered |

## Camera (AVFoundation)

| Apple API | Package API | iOS 27.1+ Duo | iOS &lt; 27.1 | Android / web |
| --------- | ----------- | ------------- | -------------- | ------------- |
| Virtual front / inner / outer discovery | `useDuoCameras()`, `DuoCameraView` `source` / `location` | **Supported** on eligible hardware | **Fallback** | **Fallback** |
| `AVCaptureDeviceDirectionCoordinator` | `DuoCameraView` `direction="forward" \| "backward"` | **Supported** | **Fallback** | **Fallback** |
| Preview layer + session lifecycle | `DuoCameraView` `active`, lifecycle `status` / interruptions | **Supported** | **Fallback** | **Fallback** |
| Dynamic aspect ratio selection | `dynamicAspectRatio` + state `aspectRatios` | **Supported** where device exposes ratios | **Fallback** | **Fallback** |
| Smart framing monitor / apply | `smartFraming` prop | **Supported** where API exists | **Fallback** | **Fallback** |
| Photo capture, video recording, sample buffers to JS | — | **Not supported** — preview and device control only | — | — |

## Expo and host integration

| Concern | Package support |
| ------- | ---------------- |
| Autolinking (Fabric views, podspec) | **Supported** — standard React Native autolinking |
| Config plugin | **Supported** — `app.plugin.js` sets `NSCameraUsageDescription`; optional `cameraPermission` string |
| iOS 27 scene lifecycle (Expo SDK 57) | **Documented** — host must enable `expo-build-properties` `ios.enableSceneSupport`; SDK 58 defaults it on |
| Expo Go | **Not supported** — development build required |

## Verification sources

- Native implementations: `ios/RNDuoEnvironmentView.mm`, `RNDuoArrangementView.mm`, `RNDuoToolbarView.mm`, `RNDuoNavigationToolbarView.mm`, `RNDuoCameraView.mm`, `RNDuoSceneAccessoryView.mm`.
- TypeScript public surface: `src/types.ts`, `src/index.tsx`.
- Automated checks: `yarn validate` (does not replace Duo hardware or App Store certification).

## Hardware- and SDK-only gaps (TODO / maintainer)

These require **physical iPhone Duo**, **Apple SDK access**, or **product decisions**; the package documents them rather than simulating success:

- Physical inner/outer camera switching under real fold motion and permission edge cases.
- External display and camera-capture accessory **presentation** on connected hardware.
- Parity with every SwiftUI-only policy (`automaticArrangement`, sheet placement, `WindowGroup`).
- Independent React Native windows tied to `UIWindowSceneActivation`.
- Photo/video capture and frame delivery to JavaScript.

When adding APIs, update this matrix and the [compatibility guide](./COMPATIBILITY.md) in the same pull request.
