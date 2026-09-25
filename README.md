# @cawrestler/react-native-duo

Build iPhone Duo experiences from React Native without writing your own UIKit or AVFoundation bridge.

The package exposes small, typed React components and hooks for Duo-aware layout, live hinge and reserved-region data, UIKit's adaptive vertical toolbar, companion scene accessories, and the inner/outer camera system. The same components remain safe to render on Android, web, older iOS versions, and non-Duo iPhones through documented fallbacks.

## What you get

| React Native API | Native API on iOS 27.1+ | Other platforms |
| --- | --- | --- |
| `DuoProvider` and `useDuo()` | `UIHingeInteraction`, reserved regions, Duo camera discovery, vertical-bar traits | Stable capability object with `isDuo: false` |
| `DuoArrangementView` | `UIArrangementViewController` with split and overlay arrangements | Flexbox split or overlay |
| `DuoAdaptiveToolbar` | UIKit navigation controller and adaptive vertical bar behavior | Horizontal React Native toolbar |
| `DuoCameraView` | Inner/outer Duo cameras, direction coordination, preview, and smart framing | Empty preview with an unsupported state callback |
| `DuoSceneAccessory` | `UISceneAccessory` for external-display and camera-capture surfaces | No visible output and an unsupported state callback |

Every API is fully typed. You can use the package with Expo development builds or a bare React Native app.

### Capability checklist

- **Device awareness:** detect whether the Duo API surface exists separately from whether the current hardware/window is actually Duo.
- **Live hinge:** availability, closed/partially-open/fully-open status, and angle in radians and degrees.
- **Reserved geometry:** active or inactive division and occlusion rectangles, including margins.
- **Window metrics:** point dimensions, display scale, safe-area insets, and the active vertical-bar edge.
- **Camera discovery:** stable IDs, names, positions, and physical inner/outer locations.
- **Adaptive layout:** native split and overlay arrangements, automatic or constrained axes, size preference, overlay edge, animation, and live pane state.
- **Adaptive toolbar:** system vertical placement, compression preference, per-item axis behavior, visibility priority, selected/disabled state, SF Symbols, and live orientation state.
- **Duo camera preview:** physical or direction-relative selection, session control, permission, mirroring, cover/contain sizing, direction maps, and smart-framing monitoring or application.
- **Companion surfaces:** external-display and camera-capture scene accessories with declarative text, symbol, and colors.
- **Cross-platform fallbacks:** complete state objects and usable JavaScript layout/toolbar behavior without scattered platform checks.

## Requirements

- React Native with the New Architecture enabled. The native views use Fabric.
- Xcode 27.1 or newer to compile the Duo SDK symbols.
- iOS 27.1 or newer for the native Duo implementations.
- A Duo simulator or device to exercise hardware-specific behavior.
- Expo Go is **not** supported because this package contains native code. Expo projects need a development build.

The package's iOS deployment target follows the host React Native app. Runtime availability checks keep older iOS versions on safe fallbacks, but building the native target still requires the iOS 27.1 SDK.

## Install

Choose the command used by your app:

```sh
npm install @cawrestler/react-native-duo
```

```sh
yarn add @cawrestler/react-native-duo
```

```sh
pnpm add @cawrestler/react-native-duo
```

### Expo

Add the config plugin to `app.json`. This supplies the camera usage description; native autolinking handles the views.

Expo SDK 57 projects built with the iOS 27 SDK must also opt into Expo's scene lifecycle. Install its build-properties plugin:

```sh
npx expo install expo-build-properties
```

Then configure both plugins:

```json
{
  "expo": {
    "plugins": [
      [
        "@cawrestler/react-native-duo",
        {
          "cameraPermission": "Allow this app to use the inner and outer cameras."
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "enableSceneSupport": true,
            "usePrecompiledModules": false
          }
        }
      ]
    ]
  }
}
```

Then create a native development build:

```sh
npx expo run:ios
```

`enableSceneSupport` prevents the iOS 27 launch-time scene-lifecycle failure. `usePrecompiledModules: false` builds Expo modules with the installed Xcode toolchain, which avoids Swift-module version mismatches on Xcode 27. Expo SDK 58 enables scene support by default, so apps on that release can omit the SDK 57 compatibility block.

If your project was already prebuilt before adding the package, regenerate it with `npx expo prebuild --clean` or reinstall its pods before rebuilding. JavaScript-only reloads cannot add this native module to an existing app binary.

### Bare React Native

Add a camera usage description to `ios/<YourApp>/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Allow this app to use the inner and outer cameras.</string>
```

Install pods and rebuild the app:

```sh
cd ios
pod install
cd ..
npx react-native run-ios
```

No manual AppDelegate or Android registration is required.

## Quick start

Put `DuoProvider` near the root of the app. Its native sensor view must fill the window so hinge and reserved-region coordinates describe the same space as your content.

```tsx
import {
  DuoAdaptiveToolbar,
  DuoArrangementView,
  DuoProvider,
  useDuo,
} from '@cawrestler/react-native-duo';

export default function App() {
  return (
    <DuoProvider>
      <Workspace />
    </DuoProvider>
  );
}

function Workspace() {
  const duo = useDuo();

  return (
    <DuoAdaptiveToolbar
      items={[
        { id: 'library', title: 'Library', systemImage: 'books.vertical' },
        { id: 'compose', title: 'Compose', systemImage: 'square.and.pencil' },
      ]}
      onItemPress={(id) => console.log(id)}
    >
      <DuoArrangementView
        axes="automatic"
        primary={<Library />}
        secondary={<Editor hinge={duo.hinge} />}
      />
    </DuoAdaptiveToolbar>
  );
}
```

On a Duo, UIKit decides how the arrangement and toolbar adapt as the device folds, rotates, or changes window geometry. On other platforms the same JSX renders usable React Native fallbacks.

## Live environment and hooks

`useDuo()` returns one live `DuoEnvironment` object:

```tsx
function Diagnostics() {
  const {
    supportsDuoApis,
    isDuo,
    hinge,
    reservedRegions,
    verticalBarEdge,
    cameras,
    window,
  } = useDuo();

  // Render diagnostics or choose a feature based on capability.
}
```

- `supportsDuoApis` means the running iOS version supports the SDK surface.
- `isDuo` means the current hierarchy reports a hinge, reserved region, or Duo camera. Use this for device-aware UI; do not infer Duo from screen dimensions.
- `hinge` contains availability, status, and angle in radians and degrees.
- `reservedRegions` contains division and occlusion frames, margins, and active state.
- `verticalBarEdge` is `leading`, `trailing`, `unspecified`, or `unavailable`.
- `cameras` lists discoverable inner and outer camera devices.
- `window` contains points, scale, and safe-area insets.

Smaller hooks are also available when a component needs only one value:

```tsx
const hinge = useDuoHinge();
const regions = useDuoReservedRegions();
const cameras = useDuoCameras();
```

Set `includeInactiveRegions` only when you need regions that UIKit currently considers inactive:

```tsx
<DuoProvider includeInactiveRegions>{children}</DuoProvider>
```

## Adaptive arrangements

Use two ordinary React nodes. The iOS implementation places them in the primary and secondary positions of `UIArrangementViewController`.

```tsx
<DuoArrangementView
  arrangement="split"
  axes="automatic"
  primaryFraction={0.55}
  primary={<MainPane />}
  secondary={<DetailPane />}
  onStateChange={(state) => {
    console.log(state.primary.splitAxis, state.secondary.isHidden);
  }}
/>
```

Options:

- `arrangement`: `split` or `overlay`.
- `axes`: `automatic`, `horizontal`, `vertical`, or `both`.
- `primaryFraction`: preferred primary size from `0.05` to `0.95`.
- `overlayEdge`: `top`, `leading`, `bottom`, or `trailing`.
- `animated`: animate native arrangement changes; defaults to `true`.
- `onStateChange`: reports the native/fallback path, z-index, split axis, and visibility of each pane.

## Adaptive vertical toolbar

`DuoAdaptiveToolbar` hosts your content in UIKit so the system can move bar items to a vertical edge when appropriate.

```tsx
<DuoAdaptiveToolbar
  title="Project"
  compressionBehavior="preferBarItems"
  items={[
    {
      id: 'back',
      title: 'Back',
      systemImage: 'chevron.backward',
      axisBehavior: 'horizontalOnly',
      visibilityPriority: 'high',
    },
    {
      id: 'inspect',
      title: 'Inspect',
      systemImage: 'sidebar.trailing',
      axisBehavior: 'verticalPreferred',
    },
  ]}
  onItemPress={(id) => handleToolbarAction(id)}
  onStateChange={(state) => console.log(state.isVertical)}
>
  <AppContent />
</DuoAdaptiveToolbar>
```

`systemImage` is an SF Symbol name. `verticalBehavior="disabled"` opts out of the vertical bar. `compressionBehavior` can be `automatic`, `preferBarItems`, or `preferTabBar`. Item `visibilityPriority` can be `low`, `standard`, or `high`.

The system, not the package, chooses whether a vertical bar is appropriate. A regular portrait phone may correctly remain horizontal.

## Duo cameras and smart framing

Choose a physical camera with `location`, or let the direction coordinator keep the preview facing `forward` or `backward` relative to the current view as the hardware changes.

```tsx
const [permissionRequested, setPermissionRequested] = useState(false);
const [camera, setCamera] = useState<DuoCameraViewState>();

<Button
  title="Enable camera"
  onPress={() => setPermissionRequested(true)}
/>

<DuoCameraView
  direction="forward"
  active
  requestPermission={permissionRequested}
  resizeMode="cover"
  smartFraming="monitor"
  onStateChange={setCamera}
  style={{ flex: 1 }}
/>
```

Camera permission is requested only on the transition of `requestPermission` from `false` to `true`. Make that transition in direct response to a user action. The config plugin adds the usage string but never prompts the user by itself.

Camera selection:

- `direction="forward" | "backward"` follows the direction map and takes precedence over `location`.
- `location="inner" | "outer"` selects a physical Duo camera when `direction` is omitted.
- `mirrored` controls preview mirroring.
- `active` starts or stops the capture session as the component enters or leaves the window.

Smart framing modes:

- `off`: no monitor.
- `monitor`: report the recommended aspect ratio and zoom without changing the camera.
- `apply`: monitor and apply the recommendation to the capture device.

`DuoCameraView` is currently a preview and device-selection component. It does not capture photos, record video, or provide frames to JavaScript.

## Companion scene accessories

Register declarative content for the Duo external-display or camera-capture accessory surface:

```tsx
<DuoSceneAccessory
  kind="externalDisplay"
  enabled={presentationIsReady}
  content={{
    title: 'Presentation ready',
    subtitle: 'Controlled from the phone',
    systemImage: 'display.2',
    backgroundColor: '#07111F',
    foregroundColor: '#67E8F9',
  }}
  onStateChange={(state) => console.log(state.available)}
/>
```

`kind` is `externalDisplay` or `cameraCapture`. The package owns registration and cleanup. Accessory content is intentionally declarative—title, subtitle, SF Symbol, and colors—because the accessory scene has a separate native lifecycle and cannot host the calling React tree directly.

## Complete API reference

The examples above show the normal usage path. This section lists every public capability and callback so you can use the package without reading its native implementation.

### `DuoProvider`

Render one provider near the application root and allow it to fill the window.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | Application content that can consume Duo context. |
| `includeInactiveRegions` | `boolean` | `false` | Includes reserved regions UIKit currently considers inactive. |
| `onEnvironmentChange` | `(environment: DuoEnvironment) => void` | — | Observes the complete environment outside React context. |
| `style` | `StyleProp<ViewStyle>` | — | Styles the full-window native observer host. |

Context exports:

| Export | Returns | Use it when |
| --- | --- | --- |
| `useDuo()` | `DuoEnvironment` | A screen needs several Duo capabilities. |
| `useDuoHinge()` | `DuoHingeState` | Only fold status or angle affects the component. |
| `useDuoReservedRegions()` | `DuoReservedRegion[]` | Content needs to avoid division or occlusion geometry. |
| `useDuoCameras()` | `DuoCameraDevice[]` | A picker or diagnostic needs camera discovery. |
| `defaultDuoEnvironment` | `DuoEnvironment` | Tests, reducers, or initial state need a complete safe fallback. |

`DuoEnvironment` fields:

| Field | Meaning |
| --- | --- |
| `supportsDuoApis` | The runtime supports the compiled iOS Duo API surface. |
| `isDuo` | The current hierarchy exposes a hinge, reserved region, or Duo camera. |
| `platform` | `ios`, `android`, `web`, or `unknown`. |
| `hinge` | `available`, `status`, `angleRadians`, and `angleDegrees`. |
| `reservedRegions` | Each region's `id`, `kind`, `frame`, `margins`, and `isActive`. |
| `verticalBarEdge` | `leading`, `trailing`, `unspecified`, or `unavailable`. |
| `cameras` | Camera `id`, `name`, `location`, and conventional `position`. |
| `window` | Width, height, scale, and safe-area insets in the observed window. |

### `DuoArrangementView`

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `primary` | `ReactNode` | required | Primary React surface. |
| `secondary` | `ReactNode` | required | Secondary React surface. |
| `arrangement` | `split \| overlay` | `split` | Chooses side-by-side or layered presentation. |
| `axes` | `automatic \| horizontal \| vertical \| both` | `automatic` | Constrains axes UIKit can use. |
| `primaryFraction` | `number` | `0.5` | Preferred primary size, clamped to `0.05...0.95`. |
| `overlayEdge` | `top \| leading \| bottom \| trailing` | `trailing` | Positions the secondary overlay. |
| `animated` | `boolean` | `true` | Animates arrangement changes. |
| `onStateChange` | `(state: DuoArrangementState) => void` | — | Reports the chosen arrangement and live pane state. |
| `style` | `StyleProp<ViewStyle>` | — | Styles the arrangement host. |
| `primaryStyle` | `StyleProp<ViewStyle>` | — | Styles the primary wrapper. |
| `secondaryStyle` | `StyleProp<ViewStyle>` | — | Styles the secondary wrapper. |

Each pane in `DuoArrangementState` reports `zIndex`, `splitAxis`, and `isHidden`; the top-level `native` flag distinguishes `UIArrangementViewController` from the JavaScript fallback.

### `DuoAdaptiveToolbar`

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | Content hosted by the native navigation controller. |
| `items` | `DuoToolbarItem[]` | required | Toolbar actions. |
| `title` | `string` | — | Navigation title when the navigation bar is shown. |
| `verticalBehavior` | `automatic \| disabled` | `automatic` | Lets UIKit adapt vertically or opts out. |
| `compressionBehavior` | `automatic \| preferBarItems \| preferTabBar` | `automatic` | Chooses what UIKit preserves when vertical space is constrained. |
| `showsNavigationBar` | `boolean` | `true` | Shows or hides the navigation title bar. |
| `onItemPress` | `(id: string) => void` | — | Receives the selected item ID. |
| `onStateChange` | `(state: DuoToolbarState) => void` | — | Reports native mode, vertical placement, and edge. |
| `style` | `StyleProp<ViewStyle>` | — | Styles the native toolbar host. |
| `contentStyle` | `StyleProp<ViewStyle>` | — | Styles the React content wrapper. |

Every `DuoToolbarItem` supports:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable callback identity. |
| `title` | `string` | Accessible and fallback label. |
| `systemImage` | `string` | SF Symbol name on iOS. |
| `axisBehavior` | `automatic \| horizontalOnly \| verticalPreferred` | Guides item placement as the bar changes axis. |
| `visibilityPriority` | `low \| standard \| high` | Controls which actions survive compression. |
| `disabled` | `boolean` | Disables the action. |
| `selected` | `boolean` | Displays the selected state. |

### `DuoCameraView`

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `location` | `inner \| outer` | `outer` | Selects a physical Duo camera when `direction` is absent. |
| `direction` | `forward \| backward` | — | Tracks the camera that faces that direction and overrides `location`. |
| `active` | `boolean` | `true` | Runs or pauses the capture session. |
| `requestPermission` | `boolean` | `false` | Requests access on a user-triggered transition to `true`. |
| `mirrored` | `boolean` | `false` | Mirrors the native preview. |
| `resizeMode` | `cover \| contain` | `cover` | Chooses preview-layer aspect handling. |
| `smartFraming` | `off \| monitor \| apply` | `off` | Disables, observes, or applies framing recommendations. |
| `onStateChange` | `(state: DuoCameraViewState) => void` | — | Reports permission, device, direction, session, and smart framing. |
| `style` | `StyleProp<ViewStyle>` | — | Sizes and positions the preview. |

`DuoCameraViewState` reports `supported`, `available`, `running`, `permission`, physical `location`, current `direction`, forward/backward camera ID maps, selected device ID/name, smart-framing support/monitoring/mode/recommendation, and a nullable error message.

Permission values are `undetermined`, `denied`, `restricted`, or `granted`. A smart-framing recommendation contains an aspect-ratio string and zoom factor.

### `DuoSceneAccessory`

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `kind` | `externalDisplay \| cameraCapture` | required | Chooses the companion system surface. |
| `content` | `DuoSceneAccessoryContent` | required | Declarative title, subtitle, SF Symbol, and colors. |
| `enabled` | `boolean` | `true` | Registers or unregisters the accessory. |
| `onStateChange` | `(state: DuoSceneAccessoryState) => void` | — | Reports support, registration, availability, enabled state, and kind. |

`content.title` is required. `subtitle`, `systemImage`, `backgroundColor`, and `foregroundColor` are optional. Colors use React Native-compatible color strings such as `#07111F`.

### Styling and composition rules

- Give `DuoProvider` and `DuoAdaptiveToolbar` bounded, normally full-screen layouts; their native controllers need real window geometry.
- Give `DuoArrangementView` an explicit height when it lives inside a `ScrollView`, or use `flex: 1` in a bounded parent.
- Give `DuoCameraView` a non-zero size. It does not choose a height by itself.
- Keep camera permission user-triggered. Setting a usage string does not grant or request permission.
- Treat state callbacks as capability results, not errors: unsupported hardware is a normal state.

## Fallback behavior

The package is designed so shared app code does not need platform guards:

- iOS before 27.1 uses the JavaScript arrangement and toolbar implementations.
- Android and web use the same JavaScript fallbacks.
- Camera and scene accessory components report `supported: false` where native APIs are unavailable.
- Hooks return complete objects with empty lists and explicit unavailable states; values are never omitted just because a platform lacks Duo hardware.

Use `supportsDuoApis`, `isDuo`, or each component's state callback when a feature truly requires Duo hardware.

## Run the demo app

The repository includes a focused Expo Router lab with five scrollable screens. Every component has an explanation, interactive controls, live native state, complete prop reference, and copyable usage sample:

1. **Overview** — `DuoProvider`, all four hooks, live hinge/region/camera data, and the complete export map.
2. **Toolbar** — `DuoAdaptiveToolbar`, vertical behavior, compression, title bar, item capabilities, and native edge state.
3. **Layout** — `DuoArrangementView`, split/overlay controls, axes, sizing, animation, and pane state.
4. **Camera** — `DuoCameraView`, physical/directional selection, permission, mirroring, sizing, and smart framing.
5. **Scenes** — `DuoSceneAccessory`, external-display and camera-capture registration and availability.

```sh
git clone https://github.com/CAWRESTLER/react-native-duo.git
cd react-native-duo
corepack enable
yarn install
yarn example ios
```

Choose an iPhone Duo simulator in Xcode or pass it to Expo's device picker. See the [example guide](./example/README.md) for a tour and troubleshooting.

## API exports

```ts
DuoProvider
useDuo
useDuoHinge
useDuoReservedRegions
useDuoCameras
DuoArrangementView
DuoAdaptiveToolbar
DuoCameraView
DuoSceneAccessory
```

All public prop, state, and value types are exported from the package root.

## Troubleshooting

**The app says fallback mode on iOS**

Confirm the app was compiled with Xcode 27.1+ and is running iOS 27.1+. A normal iPhone can support the APIs while still reporting `isDuo: false`.

**The toolbar never becomes vertical**

Keep `verticalBehavior="automatic"`, render the toolbar as a full-screen container, and test multiple Duo fold/window states. UIKit makes the final placement decision.

**The Expo app cannot find the native view**

Expo Go cannot load it. Rebuild a development client after installation with `npx expo run:ios` or an EAS development build.

**The app exits with “UIScene life cycle is required”**

On Expo SDK 57, add the `expo-build-properties` settings from the installation section, run `npx expo prebuild --clean`, and rebuild. Expo SDK 58 enables scene support by default.

**Camera permission does not appear**

Add the Expo config plugin or `NSCameraUsageDescription`, rebuild the native app, and change `requestPermission` from `false` to `true` after a tap.

**Yarn says this directory belongs to a parent project**

This repository includes its own `yarn.lock`. Run Yarn from the repository root rather than from its parent directory.

## Contributing and releases

- [Development and release workflow](./CONTRIBUTING.md)
- [Issue tracker](https://github.com/CAWRESTLER/react-native-duo/issues)
- [Code of conduct](./CODE_OF_CONDUCT.md)

The npm package includes the podspec, iOS sources, Android fallback package, Expo config plugin, JavaScript, and TypeScript declarations. React Native autolinking consumes the podspec directly, so users do not need a separate CocoaPods installation.

## License

MIT
