import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { useEffect, useState, type ReactElement } from 'react';
import { Dimensions, Modal, TextInput, View } from 'react-native';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import { DuoProvider as NativeProvider } from '../DuoProvider.ios';
import {
  defaultDuoEnvironment,
  useDuo,
  useDuoCameras,
  useDuoGeometry,
  useDuoHinge,
  useDuoReservedRegions,
  useDuoWindow,
} from '../context';
import NativeDuoEnvironmentView from '../native/DuoEnvironmentNativeComponent';
import type { DuoEnvironment } from '../types';

jest.mock('../native/DuoEnvironmentNativeComponent', () => ({
  __esModule: true,
  default: 'RNDuoEnvironmentView',
}));

// The RN preset resolves extensionless modules to .ios by default. Exercise
// the actual Android/web provider explicitly rather than testing iOS twice.
const { DuoProvider: FallbackProvider } =
  jest.requireActual<typeof import('../DuoProvider')>('../DuoProvider.tsx');

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

async function emit(environment: DuoEnvironment | string) {
  await act(async () => {
    renderer!.root
      .findByType(NativeDuoEnvironmentView)
      .props.onEnvironmentChange({
        nativeEvent: {
          payload:
            typeof environment === 'string'
              ? environment
              : JSON.stringify(environment),
        },
      });
  });
}

function counters() {
  const counts = {
    whole: 0,
    hinge: 0,
    geometry: 0,
    cameras: 0,
    regions: 0,
    window: 0,
  };
  function Whole() {
    useDuo();
    counts.whole++;
    return null;
  }
  function Hinge() {
    useDuoHinge();
    counts.hinge++;
    return null;
  }
  function Geometry() {
    useDuoGeometry();
    counts.geometry++;
    return null;
  }
  function Cameras() {
    useDuoCameras();
    counts.cameras++;
    return null;
  }
  function Regions() {
    useDuoReservedRegions();
    counts.regions++;
    return null;
  }
  function Window() {
    useDuoWindow();
    counts.window++;
    return null;
  }
  return {
    counts,
    children: (
      <>
        <Whole />
        <Hinge />
        <Geometry />
        <Cameras />
        <Regions />
        <Window />
      </>
    ),
  };
}

describe('DuoProvider stable child host', () => {
  it('places sibling content and Modal hosts inside exactly one non-collapsing native child', async () => {
    const tree = await mount(
      <NativeProvider>
        <View testID="first-sibling" />
        <View testID="second-sibling" />
        <Modal visible>
          <View testID="modal-content" />
        </Modal>
      </NativeProvider>
    );
    const native = tree.root.findByType(NativeDuoEnvironmentView);
    expect(native.children).toHaveLength(1);
    const content = native.children[0] as ReactTestInstance;
    expect(content.type).toBe(View);
    expect(content.props.collapsable).toBe(false);
    expect(content.props.style).toEqual({ flex: 1 });
    expect(content.findAllByType(Modal)).toHaveLength(1);
    expect(content.findByProps({ testID: 'first-sibling' })).toBeDefined();
    expect(content.findByProps({ testID: 'second-sibling' })).toBeDefined();
    expect(content.findByProps({ testID: 'modal-content' })).toBeDefined();
  });

  it('preserves sibling and modal draft state through fold and rotation updates', async () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Draft({ id }: { id: string }) {
      const [draft, setDraft] = useState('');
      useDuoGeometry();
      useEffect(() => {
        mounted(id);
        return () => {
          unmounted(id);
        };
      }, [id]);
      return <TextInput testID={id} value={draft} onChangeText={setDraft} />;
    }
    const tree = await mount(
      <NativeProvider>
        <Draft id="screen-draft" />
        <View testID="other-sibling" />
        <Modal visible>
          <Draft id="modal-draft" />
        </Modal>
      </NativeProvider>
    );
    const host = tree.root.findByType(NativeDuoEnvironmentView).children[0];
    await act(async () => {
      tree.root
        .findByProps({ testID: 'screen-draft' })
        .props.onChangeText('Keep this draft');
      tree.root
        .findByProps({ testID: 'modal-draft' })
        .props.onChangeText('Keep the modal draft');
    });

    for (const [width, height, angleDegrees] of [
      [900, 688, 180],
      [450, 688, 90],
      [688, 450, 90],
      [900, 688, 180],
    ] as const) {
      await emit({
        ...defaultDuoEnvironment,
        platform: 'ios',
        geometry: { ...defaultDuoEnvironment.geometry, width, height },
        hinge: { ...defaultDuoEnvironment.hinge, angleDegrees },
      });
      expect(tree.root.findByType(NativeDuoEnvironmentView).children[0]).toBe(
        host
      );
      expect(
        tree.root.findByProps({ testID: 'screen-draft' }).props.value
      ).toBe('Keep this draft');
      expect(tree.root.findByProps({ testID: 'modal-draft' }).props.value).toBe(
        'Keep the modal draft'
      );
    }
    expect(mounted).toHaveBeenCalledTimes(2);
    expect(unmounted).not.toHaveBeenCalled();
  });
});

describe('granular provider hooks', () => {
  it('does not rerender geometry, cameras, regions, or window consumers for hinge-only native events', async () => {
    const { children, counts } = counters();
    const onEnvironmentChange = jest.fn();
    await mount(
      <NativeProvider onEnvironmentChange={onEnvironmentChange}>
        {children}
      </NativeProvider>
    );
    const initial = { ...defaultDuoEnvironment, platform: 'ios' as const };
    const changed = {
      ...initial,
      hinge: { ...initial.hinge, angleDegrees: 90, angleRadians: Math.PI / 2 },
    };
    await emit(changed);
    expect(counts).toEqual({
      whole: 2,
      hinge: 2,
      geometry: 1,
      cameras: 1,
      regions: 1,
      window: 1,
    });
    await emit(changed);
    await emit('not JSON');
    expect(counts).toEqual({
      whole: 2,
      hinge: 2,
      geometry: 1,
      cameras: 1,
      regions: 1,
      window: 1,
    });
    // The opt-in callback still observes every native event, including equal snapshots.
    expect(onEnvironmentChange).toHaveBeenCalledTimes(3);
    expect(onEnvironmentChange).toHaveBeenLastCalledWith(changed);
  });

  it('updates each slice consumer independently without requiring an environment callback', async () => {
    const { children, counts } = counters();
    await mount(<NativeProvider>{children}</NativeProvider>);
    let environment: DuoEnvironment = {
      ...defaultDuoEnvironment,
      platform: 'ios',
    };
    environment = {
      ...environment,
      geometry: { ...environment.geometry, width: 450, height: 688 },
    };
    await emit(environment);
    expect(counts).toEqual({
      whole: 2,
      hinge: 1,
      geometry: 2,
      cameras: 1,
      regions: 1,
      window: 1,
    });
    environment = {
      ...environment,
      cameras: [
        {
          id: 'inner',
          name: 'Inner',
          location: 'inner',
          position: 'front',
          deviceType: 'innerFront',
          isVirtual: false,
        },
      ],
    };
    await emit(environment);
    expect(counts).toEqual({
      whole: 3,
      hinge: 1,
      geometry: 2,
      cameras: 2,
      regions: 1,
      window: 1,
    });
    environment = {
      ...environment,
      window: { ...environment.window, width: 450, height: 688 },
    };
    await emit(environment);
    expect(counts).toEqual({
      whole: 4,
      hinge: 1,
      geometry: 2,
      cameras: 2,
      regions: 1,
      window: 2,
    });
    environment = {
      ...environment,
      reservedRegions: [
        {
          id: 'hinge',
          kind: 'division',
          frame: { x: 440, y: 0, width: 20, height: 688 },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          isActive: true,
        },
      ],
    };
    await emit(environment);
    expect(counts).toEqual({
      whole: 5,
      hinge: 1,
      geometry: 2,
      cameras: 2,
      regions: 2,
      window: 2,
    });
  });

  it('isolates fallback resize subscriptions and retains camera/hinge values', async () => {
    const original = Dimensions.get('window');
    const { children, counts } = counters();
    try {
      Dimensions.set({
        window: { width: 900, height: 688, scale: 2, fontScale: 1 },
      });
      const tree = await mount(<FallbackProvider>{children}</FallbackProvider>);
      expect(tree.root.findAllByType(NativeDuoEnvironmentView)).toHaveLength(0);
      expect(tree.root.findByType(View).props.collapsable).toBe(false);
      expect(counts).toEqual({
        whole: 1,
        hinge: 1,
        geometry: 1,
        cameras: 1,
        regions: 1,
        window: 1,
      });
      await act(async () => {
        Dimensions.set({
          window: { width: 450, height: 688, scale: 2, fontScale: 1 },
        });
      });
      expect(counts).toEqual({
        whole: 2,
        hinge: 1,
        geometry: 2,
        cameras: 1,
        regions: 1,
        window: 2,
      });
      await act(async () => tree.unmount());
      renderer = undefined;
    } finally {
      Dimensions.set({ window: original });
    }
  });

  it('keeps hooks safe outside a provider', async () => {
    const { children, counts } = counters();
    await mount(<>{children}</>);
    expect(counts).toEqual({
      whole: 1,
      hinge: 1,
      geometry: 1,
      cameras: 1,
      regions: 1,
      window: 1,
    });
  });
});
