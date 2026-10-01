# Duo Lab RN

This is the official `@cawrestler/react-native-duo` example: a React Native recreation of the seven-screen SwiftUI iPhone Duo lab. It uses the local package workspace, so the same native bridge and public components are exercised here and by package consumers. The application source lives in this `example/` directory; reusable native code lives in the repository's root `ios/` directory.

## Run it

Install and run from the repository root with the Node version in `.nvmrc`:

```sh
corepack enable
yarn install --immutable
yarn example ios --device "iPhone Duo"
```

Use Xcode 27.1+ and a Duo simulator running iOS 27.1+. The example uses Expo SDK 58 and React Native 0.88 release candidate; keep the locked versions together. It needs a native development build because the package contains Fabric components. Expo Go cannot load them.

For subsequent JavaScript-only sessions, start Metro with `yarn example start` and open the installed Duo Lab RN development app. After changing native package code, codegen props, or native app configuration, rebuild:

```sh
yarn example:ios:clean --device "iPhone Duo"
```

The clean command regenerates the example's native platform projects before rebuilding. A JavaScript reload cannot update the native views already installed on the simulator.

## What to try

The navigation list stays on the left and detail stays on the right when the available Duo panes can fit both. Compact layouts expose a navigation button. Compare equivalent fold pose, window size, scroll position, tab, and appearance mode with the Swift lab when inspecting visual parity.

| Screen | Controls and behavior to exercise | Package API |
| --- | --- | --- |
| **Overview** | Change pose/window size and watch real native size classes, local dimensions, region counts, and application scene capability update. | `DuoProvider`, `useDuo`, `DuoGeometryView` |
| **Hinge** | Fold the simulator to update angle/status. Enable manual preview and move the slider to test the illustration; it does not change the hardware hinge. | `useDuoHinge` |
| **Regions** | Toggle inactive regions, resize, and change pose. Orange division and pink occlusion overlays use coordinates measured in the displayed native view; inspect frame/margin/safe-area values below. | `DuoGeometryView` |
| **Arrangements** | Switch Automatic, Split, and Overlay for the player/queue. Fold/resize and inspect whether panes split, overlap, hide, or change z-index. Player artwork and the track queue resize to their native panes. | `DuoArrangementView` |
| **Adaptive Bars** | Choose Workbench, Inbox, or Profile. Toggle vertical bars, change compression, press actions, and open overflow where the system exposes it. Tabs, badges, actions, and alternate vertical symbols share one UIKit bar hierarchy. | `DuoAdaptiveToolbar` |
| **Scenes** | Inspect scene capability, preview diagnostics, and enable the presentation companion when an eligible external display exists. The independent-window action is disabled and explains the remaining gap. | `useDuo`, `DuoSceneAccessory` |
| **Camera** | Select the virtual front, physical outer/inner front, or rear source; enable preview after a user-triggered permission request. Inspect direction coordination, aspect ratios, rotation, sensor compensation, smart framing, and the outer-display camera cue. | `DuoCameraView`, `DuoSceneAccessory`, `useDuo` |

The full props/state reference and copyable package examples are in the [root README](../README.md#complete-api-reference). Screen descriptions explain why a feature exists; live state shows whether the current runtime, device, and accessory support it.

## Source map

| File | Purpose |
| --- | --- |
| `src/app/_layout.tsx` | Expo Router root, safe-area setup, and the shared `DuoProvider`. |
| `src/app/index.tsx` | Opens the complete lab application. |
| `src/components/duo-labs.tsx` | Selects one of the seven lab screens. |
| `src/components/duo-shell.tsx` | Adaptive sidebar, compact navigation, and shared detail layout. |
| `src/components/duo-ui.tsx` | Swift-style cards, symbols, metrics, controls, colors, and scroll containers. |
| `src/components/labs/*-lab.tsx` | The actual examples of package components and callbacks. |

## Capabilities and remaining gaps

`supportsDuoApis` indicates runtime API availability; `isDuo` indicates that the current hierarchy reports Duo hinge, region, or camera capabilities. `supported`, `available`, and `running`/`registered` are different states. A simulator can support an API while lacking a camera or external display.

`supportsMultipleWindows` reports the app/runtime's scene declaration. It does not implement SwiftUI `WindowGroup` or open a second independent React Native scene. **Preview diagnostics** is an in-app preview, and **Open diagnostics window** remains disabled. The real external-display and camera-capture accessories use their own native lifecycle with declarative content.

Automatic arrangement uses UIKit's default split sizing with both axes allowed. UIKit does not expose SwiftUI's exact `automaticArrangement` policy. Camera support provides preview and device controls; photo/video capture and JavaScript frame delivery are outside this package.

Adaptive-bar compression is a preference for limited vertical space, not an unconditional hide/show switch. UIKit may show both tools and tabs when they fit. In vertical layouts with tabs, the package groups app actions in the native toolbar so they can compress together; horizontal and camera-only layouts retain leading and pinned navigation actions. This example uses Expo Router's `Slot` to avoid a second, header-hidden native navigation controller competing for the same rail.

Disabling vertical bars switches this component to native horizontal UIKit bars; it does not change the app's status-bar axis. The placement card reads `DuoToolbarState.isVertical`, while `verticalBarEdge` remains the system-preferred trait and can still report a vertical edge.

## Troubleshooting and validation

- If the native views are missing or taps/scrolling are inert after changing native code, quit the old simulator app and run the clean native build above.
- If Metro selects a different port, launch the development app against the server URL printed by that Metro session.
- If no camera is available, test on a Duo device or a simulator configured with an eligible camera feed. Permission alone does not create capture hardware.
- If an accessory is unavailable, connect an eligible display or exercise the camera-capture surface in the matching device pose. Registration is not a guarantee that the system will present the accessory immediately.
- To compare visuals, use the same simulator/device, pose, appearance, font scale, and selected state as the Swift lab.

From the root, run the repeatable checks:

```sh
yarn typecheck
yarn example typecheck
yarn lint
yarn test --runInBand
yarn pack:check
```

The example also offers Android and web fallback views:

```sh
yarn example android
yarn example web
yarn example build:web
```

These paths retain ordinary layout and labeled toolbar/tab interactions. Native Duo telemetry, vertical rails, SF Symbols, capture devices, and companion scenes require the supported iOS runtime and hardware. The example is included in the GitHub repository and excluded from the npm tarball.
