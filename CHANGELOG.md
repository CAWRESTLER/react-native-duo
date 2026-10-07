# Changelog

## Unreleased

### Added

- `DuoSceneAccessory` accepts React `children`, rendered into the connected external-display or camera-capture accessory scene and sized to it. State adds `connected` and `size`. Declarative `content` is unchanged and becomes optional when children are passed.
- [Apple Duo API coverage matrix](./docs/API_COVERAGE.md) with supported, partial, fallback, and not-supported rows vs UIKit / AVFoundation / scene APIs.
- `scripts/resolve-cxx.js` so native C++ policy tests compile on Linux CI and cloud environments where the default `c++` driver is Clang without libstdc++ headers.

### Changed

- Expo config plugin is registered through `package.json` `"expo"."plugin"` for standard autodiscovery alongside the documented `plugins` array entry.

## 0.1.0-preview.2 — 2026-10-03

Developer preview targeting npm `next`, not a stable release. Publication is a separate approved workflow step; preparing this changelog does not publish. Before release preparation, both npm tags pointed to `0.1.0-preview.1` as checked on 2026-10-03. This release does not move that initial preview's `latest` alias.

### Added

- Explicit compatibility baseline and app/pose/accessibility/draft-preservation checklist, separating automated checks, manual interaction, and hardware-only validation. Connie and other uninspected consuming apps remain unverified.
- Manifest/lockfile consistency guard for the locked React/RN/Expo workspace and its tooling, with regression tests for dependency drift, duplicate runtimes, and malformed/missing lock entries. The guard runs in local validation, existing CI, and release verification without publishing anything.
- `DuoNavigationToolbar` for screen actions attached to an existing native navigation stack, preserving navigator-owned headers, back stack, tabs, and modals instead of creating competing bar controllers.
- `useDuoGeometry()` and `useDuoWindow()` for provider-local geometry and window-only subscriptions, alongside the existing environment/hinge/region/camera hooks.
- Optional camera lifecycle diagnostics: `status`, interruption state/reason/code, and structured `errorDetails`, while retaining the compatible `error` message.

### Changed

- Release-channel guidance reflects the published preview's actual `latest` + `next` tags rather than describing it as unpublished or next-only. Future prereleases remain restricted to `next` by the publishing workflow.
- Provider updates structurally share unchanged snapshots and notify independent streams. Angle-only events no longer rerender unrelated narrow-hook consumers; `useDuo()` intentionally still receives the whole environment. A stable non-collapsable provider wrapper safely contains sibling views and RN modals without a consumer workaround.
- Camera session lifecycle observes interruptions, runtime errors, session start/stop, and app foreground/background state, with mounted/generation guards and cleanup. Normal interruptions resume only eligible active sessions; media-services-reset recovery is bounded to one automatic retry per explicit activation/configuration. Other fatal runtime failures require explicit stop/restart.
- Asynchronous aspect-ratio and smart-framing application failures report native errors. Diagnostics persist through automatic recovery until explicit configuration/retry; `running` and `status`, not absence of an error, indicate successful recovery.

### Validation boundaries

The native-tabs navigation fixture explicitly uses `horizontalPresentation="inline"` for screen-local horizontal UIKit actions; vertical actions remain on the existing stack. The wrapped stack's own horizontal toolbar did not render in the SDK 58 fixture, so this is a documented presentation alternative, not an upstream navigator repair or automatic visual-parity claim.

New rendered/provider tests check subscription isolation, wrapper/Modal shape, simulated fold/rotation draft preservation, navigation bridge behavior, and camera state forwarding. Compiled camera-policy tests check restart/generation guards. These do not certify an actual navigator, AVFoundation hardware, Connie, accessibility, or device performance; native builds and the recorded manual/device checklist remain required.

## 0.1.0-preview.1 — 2026-10-01

Initial developer preview, published with the intended npm `next` channel. Registry inspection on 2026-10-02 also found `latest` pointing to this same preview after the first publication; that alias does not make it stable. APIs and integration details may change before `0.1.0`. See the [versioned preview notes](https://github.com/CAWRESTLER/react-native-duo/blob/v0.1.0-preview.1/RELEASE_NOTES.md) for that release's requirements and limitations.

### Added

- Typed Duo environment provider and hooks for hinge state, reserved regions, cameras, window geometry, and adaptive bar placement.
- Native size-class and application scene capability reporting, plus view-local region measurement through `DuoGeometryView`.
- Fabric components for native arrangements, adaptive tabs and tools, camera preview and smart framing, and scene accessories.
- Coordinated native vertical toolbar/tab layouts for navigation actions, tools, and tabs, with content laid out inside the system's unobscured area. UIKit may show separate tool and tab groups when space permits.
- Component-local horizontal UIKit bars for vertical-bar opt-out, with the preferred system edge distinguished from the actual toolbar axis.
- Explicit safe-area/edge-to-edge toolbar content layouts and a decorative full-host background slot, with unchanged safe-area measurements for positioning foreground controls.
- Visibility-aware native toolbar spacing that removes phantom app rails on bar-free screens while preserving system safe areas, plus native-button-first touch routing for full-width React content.
- Alternate vertical toolbar symbols, explicit virtual/physical/rear camera sources, dynamic aspect ratios, preview rotation, and sensor-orientation compensation controls.
- Declarative companion-surface gradients, typography, symbols, and camera cue content, plus native toolbar tint.
- Native colors accept React Native/CSS `#RRGGBB` and `#RRGGBBAA` hex values and reject malformed colors.
- JavaScript arrangement and toolbar fallbacks for Android/web, plus native compatibility paths for older iOS runtimes.
- Expo camera-permission config plugin with explicit package exports.
- Seven-screen Duo Lab example based on the companion SwiftUI app, with live controls, native state, usage notes, and documented feature gaps.
- Full-host grouped backgrounds for normal Adaptive Bars screens, with safe-area foreground content.
- Duo Studio full-width canvas experiment with Day/Dusk/Night artwork, immersive edge-to-edge/bar-free defaults, local region-aware controls, a scrollable options sheet, and opt-in host/content diagnostics. Exiting restores the Workbench's safe layout and bars without changing public package defaults.
- Example Metro source watching for live package edits, with a regression check that preserves Expo's default watch folders.
- Release checks for the actual npm tarball, including entry points, types, native/codegen files, plugin resolution, and exclusion of demo/build files.
- Declaration builds exclude tests and mocks, preventing example-only helpers imported by tests from leaking into the published package.
- Explicit preview versioning and `next` publication defaults, reviewed version-matched GitHub release notes, and release-note checks in the publication/distribution safeguards.

### Requirements and limits

This package requires the New Architecture and the iOS 27.1 SDK to compile its native iOS implementation. The demo uses React Native `0.88.0-rc.1`, React `19.3.0`, and Expo `58.0.0` as locked in this repository; other combinations are not a compatibility guarantee. Independent React Native scene sessions, photo/video capture, JavaScript camera frames, and full SwiftUI scene/automatic-arrangement policy parity are not part of this preview. Android/web provide layout and toolbar fallbacks, not native Duo features.
