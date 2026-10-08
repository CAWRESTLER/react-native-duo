# API stability

> **Status: proposal.** The maintainer has not confirmed this classification yet. Until `0.1.0` ships, every API can still change.

Before `0.1.0`, each public export is labeled **stable** or **experimental**:

- **Stable:** Breaking changes after `0.1.0` need a major version (or, while `0.x`, a minor version with a changelog migration note).
- **Experimental:** May change in any minor release. These exports carry an `@experimental` JSDoc tag, so editors show the label in hover info.

## Proposed classification

| Export                                                              | Proposed status | Reason                                                                                                                           |
| ------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DuoProvider`                                                       | Stable          | Small surface, unchanged since preview.1 apart from additive subscription work.                                                  |
| `useDuo`, `useDuoHinge`, `useDuoReservedRegions`                    | Stable          | Read-only state with documented fallbacks.                                                                                       |
| `useDuoGeometry`, `useDuoWindow`                                    | Stable          | Read-only state; added in preview.2 without changes since.                                                                       |
| `DuoGeometryView`                                                   | Stable          | View-local measurement with a JavaScript fallback.                                                                               |
| `DuoArrangementView`                                                | Stable          | Maps directly to `UIArrangementViewController`; the props mirror UIKit's.                                                        |
| `defaultDuoEnvironment` and exported types                          | Stable          | Shapes the stable hooks return.                                                                                                  |
| `DuoAdaptiveToolbar`                                                | Experimental    | Largest prop surface; placement, compression, and content-layout options are still settling.                                     |
| `DuoNavigationToolbar`                                              | Experimental    | Depends on navigator internals; `horizontalPresentation="inline"` is a workaround for wrapped native tabs.                        |
| `DuoCameraView`, `useDuoCameras`                                    | Experimental    | Hardware-only paths (physical cameras, smart framing, interruptions) are unverified on a device.                                  |
| `DuoSceneAccessory`                                                 | Experimental    | React `children` support is new, and connecting a real accessory scene is unverified on a device.                                 |
| `@cawrestler/react-native-duo/jest` (`setMockDuoEnvironment`, etc.) | Experimental    | New test helper.                                                                                                                 |

## Open naming questions (maintainer decision)

These are breaking renames if they change after `0.1.0`. Decide them before stabilizing:

1. **`DuoAdaptiveToolbar` vs `DuoNavigationToolbar`.** The names don't make clear that one owns its bars and the other attaches to a navigator. Options: keep both; rename to `DuoToolbarHost` / `DuoScreenToolbar`; or document the split only.
2. **Duplicate geometry.** `useDuo().reservedRegions` and `useDuo().geometry.reservedRegions` both exist, and `geometry` overlaps with `window` for width and height. Keep both, or drop the top-level `reservedRegions` from the environment?
3. **Hinge angle units.** `hinge.angleRadians` and `hinge.angleDegrees` are both always present. Keep both, or keep one?
4. **`isDuo` vs `supportsDuoApis`.** These are easy to confuse: one means the device or window is a Duo, the other that the runtime has the SDK. Possible renames: `isDuoDevice` / `hasDuoSdk`.
5. **Scene accessory kinds.** `kind="externalDisplay"` maps to Apple's `externalNonInteractive…` accessory. Keep the shorter name, or match Apple's?
6. **`DuoSceneAccessory` `content`.** With React `children` available, should the declarative `content` stay a first-class option, or become just the fallback and background?

Record each decision in the CHANGELOG. Once the classification is confirmed, change the status line at the top of this page.
