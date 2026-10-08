# Compatibility and validation

This document describes the repository's reproducible test baseline and the evidence required before claiming compatibility with another app. It is not a promise that every React Native, Expo, navigation, or iOS combination works. The changes documented here require `0.1.0-preview.2` or the matching source checkout; installing `0.1.0-preview.1` does not include them. Registry availability confirms publication.

## Locked baseline

| Part                              | Repository baseline                                 | Boundary                                                                                    |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| React Native                      | `0.88.0-rc.1`, New Architecture/Fabric              | Release candidate; other RN versions are unverified.                                        |
| React / React DOM / test renderer | `19.3.0`                                            | Keep the workspace on one React runtime.                                                    |
| Expo                              | Lockfile resolves `58.0.0` from `~58.0.0-preview.7` | The declared range alone is not a reproducible install; use the lockfile.                   |
| Expo Router                       | Direct example resolution `58.0.10` from `~58.0.8`  | SDK 58 uses Router's navigation exports in app code.                                        |
| React Native Screens              | Direct example resolution `4.28.0` from `~4.28.0`   | Router also locks a transitive `5.0.0-alpha.3`; this is not a single-Screens-runtime claim. |
| Safe Area Context                 | Direct example resolution `5.9.1` from `~5.9.1`     | The documented fixture uses screen-local measured insets.                                   |
| Node / Yarn                       | Node `v24.21.0`, Yarn `4.11.0`                      | `.nvmrc`, `packageManager`, and immutable installation define the development toolchain.    |
| Native iOS build                  | Xcode 27.1+, iOS 27.1 SDK                           | Runtime availability checks do not permit compilation with an older SDK.                    |
| Native Duo behavior               | iOS 27.1+, eligible Duo device/window state         | A simulator is useful for layout, not physical camera/display certification.                |
| Expo loading                      | Native development build                            | Expo Go and a JavaScript-only update cannot add the native module.                          |

The package's broad React/RN peer declarations allow evaluation; they do **not** assert that every peer version has been tested. The baseline is recorded in [compatibility-baseline.json](./compatibility-baseline.json). Updating it requires deliberate dependency/lockfile review and fresh validation, not merely changing the documented version numbers.

```sh
corepack enable
yarn install --immutable
yarn check:compatibility
```

The compatibility check compares root/example manifests, relevant Yarn resolutions, `.nvmrc`, and the Yarn version. It rejects drift in React, RN, Expo, renderer, RN tooling, Router, Screens, and Safe Area Context, plus multiple locked React/RN runtimes. After installation, the CLI/CI check also verifies the example's installed navigation package versions; the release verifier's pre-install check uses manifests and the lockfile only. These are repository **consistency** checks, not certification of an external app, native interaction, or hardware support.

## App and navigation coverage

| Integration                            | Current status                                                                                      | Evidence still required                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Official Duo Lab workspace             | Local validation, native build, and scoped navigation simulator checks passed; see the record below | Complete remaining manual/hardware checks and required CI on the exact release candidate commit.                                           |
| Expo Router native tabs + native stack | Scoped local push/back/tab/modal/fold checks passed using explicit inline horizontal presentation   | Other host hierarchies, interactive back gestures, live overflow menus, and accessibility remain unverified.                               |
| Bare React Native app                  | Package integration is documented; no separate bare-app compatibility matrix                        | Build and test the actual host, navigation hierarchy, scene lifecycle, and native permissions.                                             |
| Connie                                 | **Unverified**: app path, versions, and native/navigation configuration have not been inspected     | Inspect its manifest/lockfile and native host, then build and exercise the actual app. Do not infer compatibility from the reference demo. |
| Other RN/Expo/navigation versions      | **Unverified**                                                                                      | A passing test on one stack is not a support claim for another.                                                                            |
| Android and web                        | JavaScript layout/action fallbacks; CI has example build jobs                                       | Interaction/accessibility testing on the consuming platform; no native Duo telemetry or vertical UIKit rails.                              |
| Older or non-Duo iOS runtime           | Availability/capability fallbacks                                                                   | Test the intended runtime with a binary built using the required SDK.                                                                      |

Use `DuoNavigationToolbar` for screen actions inside an existing native navigation hierarchy. The navigator owns its headers, back stack, tabs, modals, and window-wide status-bar preferences; the adapter must not create a competing root controller. Use `DuoAdaptiveToolbar` for standalone bar ownership. See the [navigation integration guide](./NAVIGATION.md) for the ownership contract and working example. One provider should surround the app's stable state/navigation tree; folding should not remount that tree.

## What automated checks establish

`yarn validate` checks baseline consistency, lint, library/example types, repository tooling tests, library regression tests, and the real packed distribution. The required CI jobs additionally build the example for iOS, Android, and web. They do not run the manual checklist below.

| Check                                   | What it can establish                                                                                        | What it cannot establish                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Compatibility guard + immutable install | Reviewed version alignment and reproducible dependency resolution                                            | External-app compatibility or native runtime behavior                      |
| React/unit regression tests             | Provider subscription isolation, fallback/state contracts, pure layout/navigation calculations where covered | UIKit placement, real touch routing, or AVFoundation session behavior      |
| Native camera lifecycle tooling test    | Compiled policy-helper behavior for the modeled lifecycle transitions                                        | Real capture-device interruptions, permissions, or session recovery        |
| Packed-distribution smoke check         | Actual entry points/types, codegen/native files, podspec and working config-plugin resolution                | All host toolchains or end-to-end application behavior                     |
| iOS native build                        | Compilation/linking against the required SDK                                                                 | Folding, scrolling, accessibility, visual parity, or hardware presentation |
| Android build / web export              | Those example build pipelines resolve and compile                                                            | Emulated Duo hardware behavior or platform interaction quality             |
| Exact-commit release verification       | Reviewed version/notes, baseline alignment, successful required CI and explicit testing confirmation         | Independent verification of the maintainer's manual/device results         |

Only describe checks as passed when an actual run for the candidate commit has completed successfully. A configured workflow is not passing evidence. The iOS CI job requires the `xcode-27` runner with Xcode 27.1; an unavailable runner leaves the required check pending. Automated success does not certify visual parity with the Swift app or physical hardware.

## Local working-tree validation record

Checked **2026-10-02–03** on the uncommitted `navigation-provider-hardening` working tree, package version **`0.1.0-preview.2`**. This is local evidence, not a published release or successful exact-commit GitHub CI run. Repeat release checks after committing the candidate; subsequent implementation changes require fresh relevant testing.

- `yarn validate` passed: baseline/installed-version checks, lint (zero errors; seven existing inline-style warnings), library/example typechecks, **58 tooling tests**, **65 Jest tests**, library build, and actual packed-distribution smoke checks.
- The example's iOS development build compiled and installed using **Xcode 27.1 (27A9269), iOS 27.1 SDK/runtime, iPhone Duo simulator**, New Architecture/Fabric, and the locked baseline above. The installed native debug library matched the freshly built library's SHA-256 (`41688d7acc6b18dcfdf8d1f23dd3ea0a0e9e2f76321be02a665d179ca33558e2`), avoiding reliance on an older installed binary.
- The SDK 58 web export passed with **14 routes**. This is build evidence only; web/Android interactions and a local Android native build were not exercised in this run.

The **navigation fixture**, not every Duo Lab feature screen, was exercised with real simulator touches:

| Exercised path                                               | Observed result                                                                                                                                                                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open portrait Notes → native action → modal edit → Done      | The inline UIKit action opened the native modal. Editing the shared draft updated the original note; Done dismissed through the existing navigator.                                                                           |
| Notes → Ownership tab, including long-list touch drag        | The draft remained; the action-free screen removed the local action bar. Row 12 and the end marker were reachable.                                                                                                            |
| Open portrait → open landscape                               | The existing native vertical action/tab rails appeared and the draft remained. The scrolled Ownership view did not reset to the beginning; no exact end-anchor/offset guarantee is inferred after viewport resizing.          |
| Landscape native action → modal → Done                       | The vertical action opened the same native modal and returned correctly. The Expo development-menu floating button initially covered that target; moving the debug overlay away allowed the actual action tap to be verified. |
| Notes → nested detail → native back button                   | One navigator-owned header/back action remained; returning restored the note's inline actions and draft.                                                                                                                      |
| Notes → plain screen without an adapter; rotate; native back | No empty action bar remained on the plain screen, and popping restored Notes' action bar. Native header and tabs stayed navigator-owned.                                                                                      |
| Notes Open → Closed → Book → Open                            | The draft stayed intact and settled toolbar/inset state followed the simulator's actual axis/edge. Both leading and trailing vertical edges were observed.                                                                    |

In this fixture, measured portrait bottom insets were **131 points with the inline action** versus **83 without it**; the modal's no-action local bottom inset was **34**. Open-landscape vertical presentation reported **84 points on its current rail edge and 34 at the bottom**. These are observations on this setup, **not constants to copy into app padding**. Full foreground insets are measured by the adapter and applied once.

**Still unverified:** Connie's versions/native host; a separate bare-RN app; physical camera permission/denial/interruption/recovery; accessories/companion displays; VoiceOver, large text, Reduce Motion and focus restoration; keyboard/selection preservation through every transition; interactive back gestures; live overflow menus; rapid/continuous folding; older/non-Duo runtimes; Android/web interaction; and all-seven-screen Swift visual parity. The complete checklist below remains the release/consumer validation target rather than being marked passed by these scoped results.

## Manual regression checklist

Perform this on the exact native build being evaluated, not only a Metro reload. Record unsupported/unavailable paths as such instead of silently passing them.

| Area                       | Exercise                                                                                                                             | Expected result                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folding and local geometry | Open → partial/Book → compact → Open, including a slow fold and rapid changes; repeat on a long screen                               | Sidebar/content follow actual window/pane bounds; settled region state is fresh; cards and controls stay clear of bars. Local region frames may extend beyond the measured view—clip/intersect them when positioning content.                      |
| Rotation and resizing      | Rotate in every supported pose; repeat with keyboard, modal, and long content visible                                                | Layout/insets update without blank content, duplicate bars, or stale widths.                                                                                                                                                                       |
| Scroll and touches         | Drag to the bottom of every long screen; tap controls near both pane/rail edges and reopen overflow menus                            | Content scrolls and all reachable controls remain interactive; no transparent native host intercepts content unexpectedly.                                                                                                                         |
| Navigation ownership       | Push detail, interactively go back, switch native tabs, present/dismiss a modal, and fold/rotate during those actions                | The existing navigator keeps one header/back stack/tab set; screen actions attach only while the screen is active.                                                                                                                                 |
| Toolbar actions            | Select every action/tab; keep an overflow menu open while telemetry changes; toggle horizontal opt-out where supported               | One callback per selection; live menus do not dismiss solely because unrelated telemetry changes; local bar axis/insets agree with presentation.                                                                                                   |
| Draft/state preservation   | Enter recognizable draft text; keep selection/keyboard active, fold/rotate, switch tabs, push/back, and dismiss a modal              | Draft and intended screen state survive environment updates. Intentional navigation unmounts still need host-app state ownership; the package cannot preserve arbitrary unmounted state.                                                           |
| Accessibility              | VoiceOver on both axes, large text, contrast settings, Reduce Motion, keyboard/focus navigation where applicable                     | Actions have meaningful labels, reachable focus order, readable content, and usable targets; folding preserves sensible focus.                                                                                                                     |
| Camera lifecycle           | User-triggered permission, denial, background/foreground, inactive screen, source switching, stop/restart, and interruption/recovery | No unsolicited permission prompt; inactive views stop; reported status/interruption/error matches reality; no hidden camera session keeps running.                                                                                                 |
| Companion accessories      | Register/update/unregister each supported kind with the necessary camera/display connection                                          | Reported support and presentation are distinguished; declarative content and React children update; React children fill the connected scene and follow its size; unsupported paths are explained. No independent React-rendered window is implied. |
| Fallbacks                  | Non-Duo/older iOS, Android, web                                                                                                      | Stable fallback state and usable documented layout/actions, without claiming native Duo capabilities.                                                                                                                                              |

For Swift comparison, use the same runtime, window size, pose, selected screen, and options. Compare Overview, Hinge, Regions, Arrangements, Adaptive Bars, Scenes, and Camera. Record differences in geometry, typography, navigation, scrolling, and callbacks; UIKit and SwiftUI policy differences must remain explicit rather than being called identical.

## Hardware-only boundaries

Physical front/outer/inner camera discovery, direction mapping, dynamic aspect ratios, sensor compensation, smart framing, actual interruptions/recovery, companion displays, camera-capture accessories, touch ergonomics, and device accessibility require the intended hardware/runtime. Permission or registration success is not proof that a surface is currently eligible to present. Simulator tests must not be reported as physical-device certification.

Independent React-rendered scene sessions, photo/video capture, and camera frames delivered to JavaScript remain outside the package's supported API. `supportsMultipleWindows` only reports the host/runtime declaration, not successful creation of independent RN windows.

## Record a compatibility result

Include this evidence in the release PR or consuming-app issue. Community reports can use the [compatibility report template](https://github.com/CAWRESTLER/react-native-duo/issues/new?template=compat_report.yml).

- Candidate commit and package version or local tarball hash; note whether it is published or unreleased.
- Host app name/path (when sharing it is appropriate), lockfile, React/RN/Expo/navigation versions, New Architecture setting, Xcode/SDK and iOS version.
- Device/simulator and tested poses/window sizes; camera/display connections and permission state.
- Actual automated commands/jobs, outcomes, and logs for that commit.
- Manual rows exercised, observed outcome, screenshots/recordings, skipped paths, and remaining defects.

A useful conclusion is “build and checklist passed on this exact setup, with these hardware paths unverified,” not “all RN apps supported.” The publishing workflow requires an explicit testing confirmation and successful exact-commit CI; reviewing the recorded manual evidence remains a maintainer responsibility.

## Published channels and release availability

Read-only registry inspection on **2026-10-07** found both `latest` and `next` pointing to `0.1.0-preview.2`. npm keeps a `latest` tag on every package (an attempt to remove the first preview's alias returned HTTP 400), so until a stable `0.1.0` exists, `latest` tracks the newest preview rather than an older one. `latest` does not make this preview a stable release. npm's unqualified install selects `latest`; see the [official dist-tag documentation](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

Pin `@cawrestler/react-native-duo@0.1.0-preview.1` to reproduce the first preview, or `@cawrestler/react-native-duo@0.1.0-preview.2` for these changes. Use `@next` to follow previews, subject to that tag's current registry value. The release workflow publishes prereleases to `next`; a maintainer then moves `latest` to the same preview with `npm dist-tag` until a stable release exists. Verify current availability with `npm view @cawrestler/react-native-duo dist-tags`; use the matching checkout or a locally built tarball before publication. No compatibility check publishes a package or changes registry tags.
