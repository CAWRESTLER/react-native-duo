import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { useEffect, useState, type ReactElement } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import { DuoNavigationToolbar as NativeToolbar } from '../DuoNavigationToolbar.ios';
import NativeDuoNavigationToolbarView from '../native/DuoNavigationToolbarNativeComponent';
import type {
  DuoNavigationToolbarItem,
  DuoNavigationToolbarState,
} from '../types';

jest.mock('../native/DuoNavigationToolbarNativeComponent', () => ({
  __esModule: true,
  default: 'RNDuoNavigationToolbarView',
}));

// Explicit generic imports prevent the iOS-focused RN preset from resolving
// the fallback adapter's nested toolbar back to a native component.
jest.mock('../DuoAdaptiveToolbar', () =>
  jest.requireActual('../DuoAdaptiveToolbar.tsx')
);
const { DuoNavigationToolbar: FallbackToolbar } = jest.requireActual<
  typeof import('../DuoNavigationToolbar')
>('../DuoNavigationToolbar.tsx');

// React's test renderer exposes the component inside memo, not its wrapper.
const PressableType =
  (Pressable as unknown as { type?: typeof Pressable }).type ?? Pressable;

const items: DuoNavigationToolbarItem[] = [
  { id: 'save', title: 'Save draft', placement: 'bottomBar' },
];

const attachedState: DuoNavigationToolbarState = {
  native: true,
  attachment: 'attached',
  isVertical: true,
  verticalBarEdge: 'trailing',
  contentInsets: { top: 44, right: 72, bottom: 0, left: 0 },
  contentSize: { width: 900, height: 688 },
};

let renderer: ReactTestRenderer | undefined;

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
});

async function mount(element: ReactElement) {
  await act(async () => {
    renderer = create(element);
  });
  return renderer!;
}

async function emitState(state: DuoNavigationToolbarState | string) {
  await act(async () => {
    renderer!.root
      .findByType(NativeDuoNavigationToolbarView)
      .props.onStateChange({
        nativeEvent: {
          payload: typeof state === 'string' ? state : JSON.stringify(state),
        },
      });
  });
}

function contentHost(tree: ReactTestRenderer) {
  const content = tree.root
    .findByType(NativeDuoNavigationToolbarView)
    .findAllByType(View)
    .find(
      (view) =>
        view.props.collapsable === false &&
        view.props.pointerEvents !== 'none' &&
        StyleSheet.flatten(view.props.style)?.position === 'absolute'
    );
  if (!content) throw new Error('Missing stable toolbar content host');
  return content;
}

function runtimeItems() {
  return [
    { id: 'tab', title: 'Navigator-owned tab', placement: 'tab' },
    {
      id: 'back',
      title: 'Navigator-owned back',
      placement: 'cancellationAction',
    },
    {
      id: 'header',
      title: 'Navigator-owned header',
      placement: 'pinnedTrailing',
    },
    ...items,
    { id: 'default', title: 'Default action' },
    { id: 'overflow', title: 'More actions', placement: 'overflow' },
  ] as unknown as DuoNavigationToolbarItem[];
}

describe('DuoNavigationToolbar native bridge', () => {
  it('keeps exactly one non-collapsing native child with decorative background and arbitrary siblings/modals', async () => {
    const tree = await mount(
      <NativeToolbar items={items} background={<View testID="decoration" />}>
        <View testID="first-sibling" />
        <View testID="second-sibling" />
        <Modal visible>
          <View testID="modal-content" />
        </Modal>
      </NativeToolbar>
    );
    const native = tree.root.findByType(NativeDuoNavigationToolbarView);
    expect(native.children).toHaveLength(1);
    const host = native.children[0] as ReactTestInstance;
    expect(host.type).toBe(View);
    expect(host.props.collapsable).toBe(false);
    expect(host.props.pointerEvents).toBe('box-none');
    const content = contentHost(tree);
    expect(content.findByProps({ testID: 'first-sibling' })).toBeDefined();
    expect(content.findByProps({ testID: 'second-sibling' })).toBeDefined();
    expect(content.findByProps({ testID: 'modal-content' })).toBeDefined();
    expect(content.findAllByType(Modal)).toHaveLength(1);
    const decoration = host.findByProps({ testID: 'decoration' }).parent!;
    expect(decoration.props.pointerEvents).toBe('none');
    expect(decoration.props.accessibilityElementsHidden).toBe(true);
    expect(decoration.props.importantForAccessibility).toBe(
      'no-hide-descendants'
    );
  });

  it('preserves screen/modal drafts through viewport, inset, and axis transitions', async () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Draft({ id }: { id: string }) {
      const [draft, setDraft] = useState('');
      useEffect(() => {
        mounted(id);
        return () => {
          unmounted(id);
        };
      }, [id]);
      return <TextInput testID={id} value={draft} onChangeText={setDraft} />;
    }
    const tree = await mount(
      <NativeToolbar items={items}>
        <Draft id="screen-draft" />
        <View testID="persistent-sibling" />
        <Modal visible>
          <Draft id="modal-draft" />
        </Modal>
      </NativeToolbar>
    );
    const wrapper = tree.root.findByType(NativeDuoNavigationToolbarView)
      .children[0];
    const content = contentHost(tree);
    await act(async () => {
      tree.root
        .findByProps({ testID: 'screen-draft' })
        .props.onChangeText('Screen draft');
      tree.root
        .findByProps({ testID: 'modal-draft' })
        .props.onChangeText('Modal draft');
    });
    const transitions: DuoNavigationToolbarState[] = [
      attachedState,
      { ...attachedState, contentSize: { width: 450, height: 688 } },
      {
        ...attachedState,
        contentSize: { width: 688, height: 450 },
        isVertical: false,
        verticalBarEdge: 'unspecified',
        contentInsets: { top: 44, right: 0, bottom: 56, left: 0 },
      },
      attachedState,
    ];
    for (const state of transitions) {
      await emitState(state);
      expect(
        tree.root.findByType(NativeDuoNavigationToolbarView).children[0]
      ).toBe(wrapper);
      expect(contentHost(tree)).toBe(content);
      expect(
        tree.root.findByProps({ testID: 'screen-draft' }).props.value
      ).toBe('Screen draft');
      expect(tree.root.findByProps({ testID: 'modal-draft' }).props.value).toBe(
        'Modal draft'
      );
      const expectedWidth =
        state.contentSize!.width -
        state.contentInsets.left -
        state.contentInsets.right;
      const expectedHeight =
        state.contentSize!.height -
        state.contentInsets.top -
        state.contentInsets.bottom;
      expect(StyleSheet.flatten(content.props.style)).toMatchObject({
        left: state.contentInsets.left,
        top: state.contentInsets.top,
        width: expectedWidth,
        height: expectedHeight,
      });
    }
    expect(mounted).toHaveBeenCalledTimes(2);
    expect(unmounted).not.toHaveBeenCalled();
  });

  it('supports full-viewport content without discarding reported unobscured insets', async () => {
    const onStateChange = jest.fn();
    const tree = await mount(
      <NativeToolbar
        items={items}
        contentLayout="edgeToEdge"
        onStateChange={onStateChange}
      >
        <View />
      </NativeToolbar>
    );
    await emitState(attachedState);
    expect(StyleSheet.flatten(contentHost(tree).props.style)).toMatchObject({
      top: 0,
      left: 0,
      width: 900,
      height: 688,
    });
    expect(onStateChange).toHaveBeenLastCalledWith(attachedState);
  });

  it('forwards explicit horizontal presentation and keeps content stable across inline/rail transitions', async () => {
    const onStateChange = jest.fn();
    const tree = await mount(
      <NativeToolbar
        items={items}
        horizontalPresentation="inline"
        onStateChange={onStateChange}
      >
        <View testID="inline-content" />
      </NativeToolbar>
    );
    const content = contentHost(tree);
    expect(
      tree.root.findByType(NativeDuoNavigationToolbarView).props
        .horizontalPresentation
    ).toBe('inline');
    const inline: DuoNavigationToolbarState = {
      ...attachedState,
      actionPresentation: 'inline',
      isVertical: false,
      verticalBarEdge: 'unspecified',
      contentInsets: { top: 44, right: 0, left: 0, bottom: 131 },
    };
    await emitState(inline);
    expect(onStateChange).toHaveBeenLastCalledWith(inline);
    expect(StyleSheet.flatten(content.props.style).height).toBe(513);
    await emitState({
      ...attachedState,
      actionPresentation: 'navigationController',
    });
    expect(contentHost(tree)).toBe(content);
    expect(StyleSheet.flatten(content.props.style).width).toBe(828);
  });

  it('defaults horizontal actions to the existing navigator', async () => {
    const tree = await mount(
      <NativeToolbar items={items}>
        <View />
      </NativeToolbar>
    );
    expect(
      tree.root.findByType(NativeDuoNavigationToolbarView).props
        .horizontalPresentation
    ).toBe('navigator');
  });

  it('forwards active focus state while retaining the same content host', async () => {
    const element = (active: boolean) => (
      <NativeToolbar items={items} active={active}>
        <View testID="content" />
      </NativeToolbar>
    );
    const tree = await mount(element(true));
    const content = contentHost(tree);
    expect(
      tree.root.findByType(NativeDuoNavigationToolbarView).props.active
    ).toBe(true);
    await act(async () => tree.update(element(false)));
    expect(
      tree.root.findByType(NativeDuoNavigationToolbarView).props.active
    ).toBe(false);
    expect(contentHost(tree)).toBe(content);
    await act(async () => tree.update(element(true)));
    expect(
      tree.root.findByType(NativeDuoNavigationToolbarView).props.active
    ).toBe(true);
    expect(contentHost(tree)).toBe(content);
  });

  it('filters navigator-owned tab/header/back placements from untyped JS inputs', async () => {
    const tree = await mount(
      <NativeToolbar items={runtimeItems()}>
        <View />
      </NativeToolbar>
    );
    const sent = JSON.parse(
      tree.root.findByType(NativeDuoNavigationToolbarView).props.itemsJson
    ) as DuoNavigationToolbarItem[];
    expect(sent.map((item) => item.id)).toEqual([
      'save',
      'default',
      'overflow',
    ]);
  });

  it('ignores malformed state events without changing the measured layout or notifying consumers', async () => {
    const onStateChange = jest.fn();
    const tree = await mount(
      <NativeToolbar items={items} onStateChange={onStateChange}>
        <View />
      </NativeToolbar>
    );
    await emitState(attachedState);
    const measured = StyleSheet.flatten(contentHost(tree).props.style);
    for (const payload of [
      JSON.stringify({ ...attachedState, actionPresentation: 'unknown' }),
      'invalid JSON',
      'null',
      '[]',
      '42',
      '{}',
      '{"native":true}',
      '{"contentInsets":null}',
      '{"attachment":"unsupported"}',
      JSON.stringify({ ...attachedState, contentSize: null }),
      JSON.stringify({ ...attachedState, contentSize: 42 }),
      JSON.stringify({ ...attachedState, contentSize: {} }),
      JSON.stringify({
        ...attachedState,
        contentSize: { width: -1, height: 688 },
      }),
    ]) {
      await emitState(payload);
      expect(StyleSheet.flatten(contentHost(tree).props.style)).toEqual(
        measured
      );
    }
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed action IDs and stale action events after focus loss', async () => {
    const onItemPress = jest.fn();
    const element = (active: boolean) => (
      <NativeToolbar items={items} active={active} onItemPress={onItemPress}>
        <View />
      </NativeToolbar>
    );
    const tree = await mount(element(true));
    const press = async (payload: string) => {
      await act(async () =>
        tree.root
          .findByType(NativeDuoNavigationToolbarView)
          .props.onItemPress({ nativeEvent: { payload } })
      );
    };
    for (const payload of [
      'invalid JSON',
      'null',
      '[]',
      '{}',
      '{"id":42}',
      '{"id":{}}',
      '{"id":""}',
    ])
      await press(payload);
    expect(onItemPress).not.toHaveBeenCalled();
    await press('{"id":"save"}');
    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onItemPress).toHaveBeenLastCalledWith('save');
    await act(async () => tree.update(element(false)));
    await press('{"id":"save"}');
    expect(onItemPress).toHaveBeenCalledTimes(1);
  });
});

describe('DuoNavigationToolbar Android/web fallback', () => {
  it('renders actions but no navigator-owned header, back, or tab chrome', async () => {
    const onItemPress = jest.fn();
    const untypedProps = {
      items: runtimeItems(),
      title: 'Navigator-owned title',
    };
    const tree = await mount(
      <FallbackToolbar {...untypedProps} onItemPress={onItemPress}>
        <View testID="screen-content" />
      </FallbackToolbar>
    );
    expect(
      tree.root.findAllByType(NativeDuoNavigationToolbarView)
    ).toHaveLength(0);
    const labels = tree.root
      .findAllByType(Text)
      .map((text) =>
        Array.isArray(text.props.children)
          ? text.props.children.join('')
          : text.props.children
      );
    expect(labels).toEqual(['Save draft', 'Default action', 'More actions']);
    expect(tree.root.findAllByProps({ accessibilityRole: 'tab' })).toHaveLength(
      0
    );
    expect(tree.root.findByProps({ testID: 'screen-content' })).toBeDefined();
    await act(async () =>
      tree.root.findAllByType(PressableType)[0]!.props.onPress()
    );
    expect(onItemPress).toHaveBeenLastCalledWith('save');
  });

  it('removes inactive actions and reports focus changes before native layout measurements', async () => {
    const onStateChange = jest.fn();
    const element = (active: boolean) => (
      <FallbackToolbar
        items={items}
        active={active}
        onStateChange={onStateChange}
      >
        <View testID="screen-content" />
      </FallbackToolbar>
    );
    const tree = await mount(element(true));
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ attachment: 'fallback' })
    );
    await act(async () => tree.update(element(false)));
    expect(tree.root.findAllByType(PressableType)).toHaveLength(0);
    expect(tree.root.findByProps({ testID: 'screen-content' })).toBeDefined();
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ attachment: 'inactive' })
    );
    await act(async () => tree.update(element(true)));
    expect(tree.root.findAllByType(PressableType)).toHaveLength(1);
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ attachment: 'fallback' })
    );
  });
});
