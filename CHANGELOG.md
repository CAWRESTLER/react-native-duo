# Changelog

## Unreleased

Initial `0.1.0` release candidate:

- Typed Duo environment provider and hooks for hinge state, reserved regions, cameras, window geometry, and adaptive bar placement.
- Native size-class and application scene capability reporting, plus view-local region measurement through `DuoGeometryView`.
- Fabric components for native arrangements, adaptive tabs and tools, camera preview and smart framing, and scene accessories.
- A single native vertical rail for navigation actions, tools, and tabs, with content laid out inside the system's unobscured area.
- Component-local horizontal UIKit bars for vertical-bar opt-out, with the preferred system edge distinguished from the actual toolbar axis.
- Alternate vertical toolbar symbols, explicit virtual/physical/rear camera sources, dynamic aspect ratios, preview rotation, and sensor-orientation compensation controls.
- Declarative companion-surface gradients, typography, symbols, and camera cue content, plus native toolbar tint.
- Native colors accept React Native/CSS `#RRGGBB` and `#RRGGBBAA` hex values and reject malformed colors.
- JavaScript arrangement and toolbar fallbacks for Android/web, plus native compatibility paths for older iOS runtimes.
- Expo camera-permission config plugin with explicit package exports.
- Seven-screen Duo Lab example based on the companion SwiftUI app, with live controls, native state, usage notes, and documented feature gaps.
- Release checks for the actual npm tarball, including entry points, types, native/codegen files, plugin resolution, and exclusion of demo/build files.

This package requires the New Architecture and the iOS 27.1 SDK to compile its native iOS implementation. Separate React Native scene sessions, photo/video capture, and full SwiftUI scene/automatic-arrangement policy parity are not part of this release.
