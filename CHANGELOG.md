# Changelog

## Unreleased

Changes after `0.1.0-preview.1` will be listed here.

## 0.1.0-preview.1 — 2026-10-01

Initial developer preview, prepared for the npm `next` channel. This is not a stable release; APIs and integration details may change before `0.1.0`. See [release notes](./RELEASE_NOTES.md) for the preview's requirements and limitations.

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
