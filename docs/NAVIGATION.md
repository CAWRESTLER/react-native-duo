# Native navigation and safe-area ownership

This integration is new in **`0.1.0-preview.2`**. Version `0.1.0-preview.1` does not include it. Install the exact version once available on npm, or use a local tarball before publication. This is a preview integration with the tested-host boundaries described below.

## Choose one controller owner

| Responsibility                                   | Existing native navigation app                                               | Standalone Duo host                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Routes, back gestures, native header/back button | React Navigation native-stack / Expo Router `Stack` (`react-native-screens`) | Your React state; no native route stack is provided                        |
| Tabs and their selection/history                 | Existing native tabs navigator                                               | `DuoAdaptiveToolbar` controlled `placement="tab"` items                    |
| Screen toolbar actions and overflow              | **`DuoNavigationToolbar`**, attached to the existing screen's `toolbarItems` | `DuoAdaptiveToolbar`'s own controller hierarchy                            |
| Vertical bar axis/status placement               | UIKit and the app's existing root/native controller preferences              | UIKit and the app's root; local opt-out does not change root status policy |
| iOS foreground safe insets                       | `DuoNavigationToolbar` in `safeArea` mode                                    | `DuoAdaptiveToolbar` in `safeArea` mode                                    |

Do not nest `DuoAdaptiveToolbar` inside native-stack simply to hide one of the headers. Use `DuoNavigationToolbar` **inside each native screen**. It does not create a navigation/tab controller, set controller delegates, synthesize a back action, change the header title, or replace tab selection. It does not import any navigation library; callers pass their own focus state, so it also works with Expo Router's navigation context rather than introducing a second context.

Native tab navigation (Expo Router `NativeTabs` or a screens-backed native tabs navigator) is required for UIKit-owned adaptive tabs. JavaScript bottom tabs remain JavaScript/horizontal tabs; this adapter does not magically convert them to a native vertical rail. UIKit decides whether tools/tabs combine, separate, or compress. This is not a promise of a particular rail appearance.

The tested tab layout has **one native stack inside each native tab**, not a header-hidden outer stack wrapped around tabs and their inner stacks:

```text
Root providers + Slot
└─ NativeTabs
   ├─ Notes native Stack → list / detail / plain / presented compose modal
   └─ Ownership native Stack
```

In the SDK 58 fixture, a hidden outer `Stack → NativeTabs → inner Stack` caused the inner action button not to appear even though its adapter reported `attached`. Removing that outer stack restored the vertical action. Present the modal from its owning inner stack, as this example does. `attached` confirms item ownership, not a guarantee that every custom/extra controller hierarchy exposes those items in its rendered bar. Apps requiring a different root hierarchy must validate it separately; the adapter does not replace or swizzle containers to force a result.

### Horizontal action presentation

`horizontalPresentation="navigator"` (default) uses the existing stack's own toolbar on both axes. In this SDK 58 native-tabs fixture, the wrapped stack exposes its vertical actions, but its horizontal toolbar remains detached even with `toolbarHidden=false` and the correct screen items. That is a presentation limitation, not proof that the adapter failed to attach.

The fixture explicitly uses **`horizontalPresentation="inline"`**. On the horizontal axis the package hosts a real UIKit `UIToolbar` above this screen's measured bottom safe area (including native tabs), and reserves its measured height once. On the vertical axis it removes the local toolbar and uses the existing navigation controller's adaptive actions. No extra navigation/tab controller or header is created. Empty, inactive, or conflicted adapters remove the local action bar. The navigator still owns header/back/tab/modal/status behavior. This is an explicit supported presentation alternative, not a claim that the wrapped navigator's horizontal toolbar has been repaired upstream.

Use `inline` with this fixture or another host where you deliberately want screen-local horizontal actions. Use `navigator` with a host whose native horizontal toolbar you have verified. Android/web already render a local RN action row; this iOS-only preference does not change that fallback. `state.actionPresentation` distinguishes `navigationController`, `inline`, `none`, and `fallback`; it describes the action host, not guaranteed visibility of every compressed native item.

## Per-screen usage

Bare React Navigation native-stack example (use your installed navigation library's imports):

```tsx
import { useIsFocused } from '@react-navigation/native';
import { DuoNavigationToolbar } from '@cawrestler/react-native-duo';
import { ScrollView, Text } from 'react-native';

function NoteScreen({ navigation }) {
  const focused = useIsFocused();
  return (
    <DuoNavigationToolbar
      active={focused}
      items={[{ id: 'edit', title: 'Edit', systemImage: 'square.and.pencil' }]}
      onItemPress={() => navigation.navigate('EditNote')}
      onStateChange={(state) => console.log(state.attachment)}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
      >
        <Text>Your content</Text>
      </ScrollView>
    </DuoNavigationToolbar>
  );
}
```

In Expo SDK 58, import `useIsFocused`, `Stack`, `Link`, and `router` from **`expo-router`**, not external `@react-navigation/*` packages. See [Expo Router's SDK 58 API](https://docs.expo.dev/versions/v58.0.0/sdk/router/).

Allowed item placements are `bottomBar` (default) and `overflow`. Symbols, vertical symbols, badges, selection/disabled states, axis behavior, visibility priority, and menus use the same item fields as `DuoAdaptiveToolbar`. The adapter filters header/tab placements even for untyped JavaScript. Configure header actions/back buttons through the navigator's normal header APIs instead. Do not also configure Expo `Stack.Toolbar` or another native `toolbarItems` provider on the same screen.

`active` defaults to true for a simple single screen, but **always pass focus state for navigators that retain offscreen screens**. One adapter can own a screen's toolbar. It releases its items on blur, native detachment, and recycling; an outgoing screen never hides the incoming screen's toolbar. It refuses to replace another owner and restores only properties still owned by it.

`onStateChange` returns `DuoNavigationToolbarState`: the usual native/axis/content-size/insets fields plus `attachment`:

- `attached`: actions belong to the current native-stack screen, including the empty-action case.
- `inactive`: blurred/detached/non-top screen; no native toolbar ownership.
- `missingNativeStack`: not inside a native screen with a `UINavigationController`. Use native-stack or the standalone host instead.
- `conflict`: another adapter/native toolbar owner is present. Remove the competing toolbar; the package does not steal it.
- `fallback`: Android/web render ordinary RN actions without adding another header or tab bar.

`compressionBehavior` is a UIKit preference applied only while the adapter owns the screen's actions. Root vertical/status policy, header visibility, tab visibility, and route transitions belong to the navigator. No global controller swizzling is used.

## A complete executable example

Run the repository example and open **Overview → Native navigation integration → Open navigation example**. The implementation is included, typechecked, and built with the example:

```text
example/src/app/_layout.tsx                   root SafeAreaProvider + DuoProvider + StatusBar
example/src/app/navigation/_layout.tsx        shared DraftProvider + Slot, no outer native stack
example/src/app/navigation/(tabs)/_layout.tsx native tabs (iOS), ordinary tabs fallback
example/src/app/navigation/(tabs)/notes/      nested native stack, detail, plain screen/back gesture
example/src/app/navigation/(tabs)/settings/   no-action screen and ownership explanation
example/src/app/navigation/(tabs)/notes/compose.tsx modal-local SafeAreaProvider, inherited draft
example/src/components/navigation/           per-screen adapter, scroll policy, shared draft
```

The root `SafeAreaProvider` measures; it does **not** pad or shrink the window. `DuoProvider` also does not pad. Its stable non-collapsing child host accepts the root `StatusBar` and route slot as siblings, so consumers no longer supply a workaround view solely to satisfy the native observer. `StatusBar` controls appearance, not the adaptive bar's axis. Preserve the existing navigator/native root's status-bar preferences.

Root status placement is intentionally inherited from UIKit/the native host in this example, rather than forced by each route. Keep a single root `StatusBar` for appearance unless a focused screen intentionally overrides it through the navigator. Neither `DuoProvider` nor this adapter exposes a root placement override or moves the system status area; this is not a padding setting. A custom native host's vertical-bar preference remains that host's responsibility. Do not add a standalone Duo controller around an existing stack merely to change it.

Each native tab contains its existing `Stack`; the notes stack declares the compose route with `presentation: 'modal'`. Native tabs use `disableAutomaticContentInsets` so the first descendant scroll view is not automatically inset by the tabs infrastructure. On iOS `DuoNavigationToolbar` uses the actual host view's safe area, including the containing header, native toolbar/tabs, and system areas. Its wrapper applies those insets **once**. There is no fixed 84-point rail estimate in this adapter and no additional header/tab padding in the screen.

The shared page explicitly disables automatic scroll-content and scroll-indicator adjustment. Its ordinary 20-point page spacing is visual spacing, **not** another system-safe inset. Native-stack already positions non-transparent header content as appropriate; the adapter measures only the safe area remaining in its actual view bounds, not a root-window inset guessed for a nested view.

The iOS form scroll view separately enables `automaticallyAdjustKeyboardInsets` for the software keyboard. Keyboard avoidance is not a second application of toolbar/system safe-area padding. Android keeps its normal host keyboard-resize policy; verify that policy in a consuming app.

The plain screen deliberately has **no adapter**. Its `SafeAreaView` protects the remaining left/right/bottom edges; its non-transparent native header owns the top. Pushing it must release the outgoing action toolbar. Popping must restore the note screen's actions without creating another header or tab controller. Navigation-wide visibility restoration is guarded so it does not overwrite another adapter or a navigator's changed visibility.

On Android/web the example adds device left/right/bottom protection with `react-native-safe-area-context`; the fallback handles only its own horizontal action row. The native stack owns the non-transparent header's top space. For a headerless/translucent fallback screen, also protect the top edge yourself. Do not copy zero-edge iOS settings to a fallback screen without that protection.

The modal is a **real navigation presentation**, not an accessory scene or independent React window. It has its own `SafeAreaProvider` because the presented view has different coordinates. Its Done header action belongs to the modal navigator. Do not add root-window insets to a modal's local content. A React Native `Modal` should likewise mount its own local safe-area provider and its own content layout; it should not reuse the presenting screen's `contentInsets`.

## Explicit alternatives

- `contentLayout="safeArea"` (default): package owns foreground insets. Do not nest another padded `SafeAreaView`, add `contentInsets` to children again, or enable automatic scroll adjustment for that same content.
- `background`: non-interactive, accessibility-hidden decorative content covers the entire host; readable/interactive foreground remains safe.
- `contentLayout="edgeToEdge"`: app owns foreground protection. Use **this host's** reported insets or `DuoGeometryView` for local reserved regions. Do not substitute provider/window coordinates for a nested view. This does not hide app/system bars.
- No actions: pass `items={[]}`. Native header/tabs still belong to the navigator; the adapter does not invent a separate action rail.
- `horizontalPresentation="inline"`: a local native horizontal action bar with measured inset ownership, while the existing stack retains adaptive vertical actions. See the fixture limitation above before choosing a host mode.

Use the ordinary safe mode for forms/lists. Use edge-to-edge only when the screen explicitly positions its controls around reserved areas. Do not change modes, route keys, or provider placement just because the hinge angle changes.

## Drafts, scrolling and accessibility

The example keeps its draft **above tab/stack routes**, keyed to the logical document rather than a fold pose. Typing in the list or modal updates the same draft; switching tabs, pushing/popping, and folding must not reset it. This demonstrates in-memory navigation preservation, not disk persistence or crash recovery; production apps should persist drafts through their own data layer.

The note field has an explicit accessibility label and retains normal dynamic text behavior. Native action accessibility labels are the item titles. Test VoiceOver traversal, focus restoration after modal/back dismissal, disabled actions, large text, and long-list scrolling in every supported pose; JS-rendered regressions cannot certify UIKit gestures or hardware accessibility. Follow [the compatibility checklist](./COMPATIBILITY.md) before releasing a consuming app.
