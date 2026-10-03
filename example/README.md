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

Metro selects and watches the root package's live `src/` files, so TypeScript/React changes to the library refresh the example without rebuilding the package. If you change `metro.config.js`, restart Metro once; native Objective-C++ changes still require a development-app rebuild.

## What to try

The navigation list stays on the left and detail stays on the right when the available Duo panes can fit both. Compact layouts expose a navigation button. Compare equivalent fold pose, window size, scroll position, tab, and appearance mode with the Swift lab when inspecting visual parity.

| Screen            | Controls and behavior to exercise                                                                                                                                                                                                                                             | Package API                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Overview**      | Change pose/window size and watch real native size classes, local dimensions, region counts, and application scene capability update.                                                                                                                                         | `DuoProvider`, `useDuo`, `DuoGeometryView`     |
| **Hinge**         | Fold the simulator to update angle/status. Enable manual preview and move the slider to test the illustration; it does not change the hardware hinge.                                                                                                                         | `useDuoHinge`                                  |
| **Regions**       | Toggle inactive regions, resize, and change pose. Orange division and pink occlusion overlays use coordinates measured in the displayed native view; inspect frame/margin/safe-area values below.                                                                             | `DuoGeometryView`                              |
| **Arrangements**  | Switch Automatic, Split, and Overlay for the player/queue. Fold/resize and inspect whether panes split, overlap, hide, or change z-index. Player artwork and the track queue resize to their native panes.                                                                    | `DuoArrangementView`                           |
| **Adaptive Bars** | Choose Workbench, Inbox, or Profile. Toggle vertical bars, change compression, press actions, and open overflow where the system exposes it. Open Duo Studio to try immersive artwork, safe/edge-to-edge content, hide/restore all app bars, and optional layout diagnostics. | `DuoAdaptiveToolbar`, `DuoGeometryView`        |
| **Scenes**        | Inspect scene capability, preview diagnostics, and enable the presentation companion when an eligible external display exists. The independent-window action is disabled and explains the remaining gap.                                                                      | `useDuo`, `DuoSceneAccessory`                  |
| **Camera**        | Select the virtual front, physical outer/inner front, or rear source; enable preview after a user-triggered permission request. Inspect direction coordination, aspect ratios, rotation, sensor compensation, smart framing, and the outer-display camera cue.                | `DuoCameraView`, `DuoSceneAccessory`, `useDuo` |

The full props/state reference and copyable package examples are in the [root README](../README.md#complete-api-reference). Screen descriptions explain why a feature exists; live state shows whether the current runtime, device, and accessory support it.

## Full-width canvas experiment

Ordinary Adaptive Bars retains the Swift lab's Workbench, Inbox, and Profile tabs. Its grouped background fills the entire toolbar host, including behind the chrome, while the foreground stays in `safeArea`. The full-width experiment deliberately uses a different, immersive layout:

1. In **Workbench**, open **More → Full-width canvas**, or scroll down and choose **Open canvas experiment**. **Duo Studio** opens with a calm landscape, **Edge to edge** content, and all app bars hidden. Layout diagnostics are off by default.
2. Choose **Day**, **Dusk**, or **Night** to change the artwork. The landscape continues behind reserved areas; **Back to Workbench** and **Canvas options** stay protected from them.
3. Open **Canvas options**. On iOS this is a native page sheet with scrollable controls. Choose **Safe area** or **Edge to edge** and use **Show all app bars** / **Hide all app bars**. Content mode and bar visibility are independent: edge-to-edge content can draw behind visible bars, while safe-area content can still have system insets with app bars hidden.
4. Enable **Show layout diagnostics** only when you want the grid and outlines. Purple marks the host bounds; green marks the React content bounds. Try the content modes and bar states while folding or resizing.
5. Close options to return to the artwork. **Back to Workbench** exits, restores every app bar, and returns to safe-area content. Selecting a visible native tab also exits the experiment.

The package options used by this experiment are:

```tsx
<DuoAdaptiveToolbar
  items={barsHidden ? [] : items}
  showsNavigationBar={!barsHidden}
  contentLayout={contentLayout} // 'safeArea' (default) or 'edgeToEdge'
  background={<YourCanvasArtwork />}
  onStateChange={setToolbarState}
>
  <ToolbarCanvas /* interactive content */ />
</DuoAdaptiveToolbar>
```

`background` is decorative and non-interactive. It fills the **entire toolbar host** in either mode, while `contentLayout` controls the interactive children. `contentSize` always reports that host's dimensions, and `contentInsets` always describes its unobscured content zone; changing modes does not redefine those measurements. Use a background behind safely laid-out foreground content for normal screens, as in Apple's [background layout example](https://developer.apple.com/documentation/swiftui/adding-a-background-to-your-view). Use edge-to-edge foreground content only when the screen explicitly positions its own important controls.

Duo Studio measures a local `DuoGeometryView` and uses active reserved-region frames to place its controls. A camera region confined to the top can move controls down rather than consuming a full-height strip on the right. An interior division can select an unobscured lane, while the decorative artwork still spans the host. Region frames are already margin-inclusive, so the example does not apply those margins again. This is a layout policy for this small set of canvas controls, not a general-purpose collision solver.

Before local measurements are available, or on fallback platforms, control placement conservatively uses the larger of the toolbar's reported native insets and `useSafeAreaInsets()` from `react-native-safe-area-context`. In safe-area mode it adds only protection not already applied by the package, avoiding double padding. See [the canvas implementation](src/components/labs/toolbar-canvas.tsx) for the complete example. The immersive defaults and region-aware controls are demo choices; the public package still defaults to `contentLayout="safeArea"`.

Hiding app bars does **not** hide the system status bar, camera area, home indicator, or other system-reserved regions. Full width is relative to this toolbar host: a visible sidebar and any parent layout still constrain it. Inbox and Profile continue to have tabs/navigation; they are not bar-free examples. The fallback hosts can demonstrate the content modes and ordinary buttons, but native Duo rails and system inset reporting require supported iOS.

## Native navigation integration

Open **Overview → Native navigation integration → Open navigation example**. This separate flow uses existing native tabs, nested native stacks/back buttons, and a real modal; `DuoNavigationToolbar` attaches only screen actions without creating another controller hierarchy.

Its navigation root is `DraftProvider + Slot`. Each native tab owns one stack, and the notes stack presents its compose modal. A hidden outer stack around the tabs can compete for the adaptive bar; don't add one to this fixture just to present a modal.

This fixture opts into `horizontalPresentation="inline"`: the package displays a native screen-local action toolbar above the measured tab safe area when horizontal, and uses the existing stack's vertical rail when vertical. The SDK 58 native-tabs wrapper did not display the stack's own horizontal toolbar, despite correct item attachment. This option does not create another header, back stack, or tab controller. The diagnostic includes the current action host so that limitation stays explicit.

Edit the shared draft, scroll to the last row, fold/rotate, switch tabs, push detail and go back, then edit/dismiss the modal. Confirm the same draft, usable scrolling, a single header/back action, and correct toolbar ownership. The diagnostic displays `attachment` and actual applied insets; **Ownership** has no Duo actions so you can check for phantom toolbar space. Native tabs own selection; Duo does not shadow it with React-selected toolbar tabs.

iOS adapter-backed screens have one foreground safe-area owner: `DuoNavigationToolbar`. The plain screen deliberately has no adapter and uses its own `SafeAreaView`. Native tabs' automatic inset adjustment and the child scroll view's automatic content/indicator adjustments are disabled. Root `SafeAreaProvider` measures without padding; modals have their own provider. Android/web add device edge protection around their horizontal fallback. The draft context sits above the route tree; it demonstrates in-memory preservation, not persistence after process termination. See the [complete safe-area/navigation guide](../docs/NAVIGATION.md) and [compatibility checklist](../docs/COMPATIBILITY.md).

## Source map

| File                                     | Purpose                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/app/_layout.tsx`                    | Expo Router root, safe-area setup, and the shared `DuoProvider`.                                |
| `src/app/index.tsx`                      | Opens the complete lab application.                                                             |
| `src/components/duo-labs.tsx`            | Selects one of the seven lab screens.                                                           |
| `src/components/duo-shell.tsx`           | Adaptive sidebar, compact navigation, and shared detail layout.                                 |
| `src/components/duo-ui.tsx`              | Swift-style cards, symbols, metrics, controls, colors, and scroll containers.                   |
| `src/components/labs/*-lab.tsx`          | The actual examples of package components and callbacks.                                        |
| `src/components/labs/toolbar-canvas.tsx` | Duo Studio artwork, region-aware canvas controls, options sheet, and opt-in layout diagnostics. |
| `src/components/labs/canvas-layout.ts`   | Pure, tested control-lane placement around local reserved regions, with safe-inset fallback.    |
| `src/app/navigation/`                    | Native tabs, nested stack/detail, and a real modal route.                                       |
| `src/components/navigation/`             | Screen toolbar/inset ownership, shared draft, and scrolling/accessibility exercise.             |

## Capabilities and remaining gaps

`supportsDuoApis` indicates runtime API availability; `isDuo` indicates that the current hierarchy reports Duo hinge, region, or camera capabilities. `supported`, `available`, and `running`/`registered` are different states. A simulator can support an API while lacking a camera or external display.

`supportsMultipleWindows` reports the app/runtime's scene declaration. It does not implement SwiftUI `WindowGroup` or open a second independent React Native scene. **Preview diagnostics** is an in-app preview, and **Open diagnostics window** remains disabled. The real external-display and camera-capture accessories use their own native lifecycle with declarative content.

Automatic arrangement uses UIKit's default split sizing with both axes allowed. UIKit does not expose SwiftUI's exact `automaticArrangement` policy. Camera support provides preview and device controls; photo/video capture and JavaScript frame delivery are outside this package.

Adaptive-bar compression is a preference for limited vertical space, not an unconditional hide/show switch. UIKit may show both tools and tabs when they fit. In vertical layouts with tabs, the package groups app actions in the native toolbar so they can compress together; horizontal and camera-only layouts retain leading and pinned navigation actions. The original Duo Lab uses Expo Router's `Slot` to avoid a second, header-hidden native navigation controller competing for the same rail. The separate navigation fixture uses native tabs and stacks rather than the lab's standalone bar host.

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
