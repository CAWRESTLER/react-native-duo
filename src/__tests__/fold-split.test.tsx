import { afterEach, describe, expect, it } from '@jest/globals';
import { StyleSheet, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  createDuoEnvironmentStore,
  DuoContext,
  defaultDuoEnvironment,
} from '../context';
import { DuoArrangementView } from '../fallback/DuoArrangementView';
import { resolveFoldSplit } from '../fallback/foldSplit';
import type { DuoReservedRegion } from '../types';

// A Pixel Fold-style vertical hinge in the middle of an 840 × 700 point window.
const verticalFold: DuoReservedRegion = {
  id: 'android-fold-division',
  kind: 'division',
  frame: { x: 420, y: 0, width: 0, height: 700 },
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  isActive: true,
};
const window = { x: 0, y: 0, width: 840, height: 700 };

describe('resolveFoldSplit', () => {
  it('splits side by side around a vertical fold', () => {
    expect(resolveFoldSplit([verticalFold], window)).toEqual({
      direction: 'row',
      primaryLength: 420,
      gap: 0,
    });
  });

  it('stacks around a horizontal (tabletop) fold and leaves an occluding hinge empty', () => {
    const tabletop: DuoReservedRegion = {
      ...verticalFold,
      kind: 'occlusion',
      frame: { x: 0, y: 340, width: 840, height: 20 },
    };
    expect(resolveFoldSplit([tabletop], window)).toEqual({
      direction: 'column',
      primaryLength: 340,
      gap: 20,
    });
  });

  it('maps the fold into a container offset inside the provider', () => {
    expect(
      resolveFoldSplit([verticalFold], {
        x: 100,
        y: 50,
        width: 640,
        height: 600,
      })
    ).toMatchObject({ direction: 'row', primaryLength: 320 });
  });

  it('ignores inactive folds, folds outside the container, and folds against the requested axis', () => {
    expect(
      resolveFoldSplit([{ ...verticalFold, isActive: false }], window)
    ).toBeNull();
    expect(
      resolveFoldSplit([verticalFold], {
        x: 500,
        y: 0,
        width: 340,
        height: 700,
      })
    ).toBeNull();
    expect(resolveFoldSplit([verticalFold], window, 'vertical')).toBeNull();
    expect(resolveFoldSplit([verticalFold], null)).toBeNull();
  });
});

type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
};

describe('fallback DuoArrangementView on a foldable', () => {
  let renderer: ReactTestRenderer | undefined;
  let restore: (() => void) | undefined;

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = undefined;
    restore?.();
  });

  it('sizes the primary pane to the fold reported by the provider', async () => {
    const store = createDuoEnvironmentStore({
      ...defaultDuoEnvironment,
      platform: 'android',
      reservedRegions: [verticalFold],
    });
    store.host.current = {
      measureInWindow: (callback) => callback(0, 0, 840, 700),
    };
    // The RN Jest preset's mocked View never calls back from measureInWindow.
    const viewPrototype = (View as unknown as { prototype: Measurable })
      .prototype;
    const original = viewPrototype.measureInWindow;
    viewPrototype.measureInWindow = (callback) => callback(0, 0, 840, 700);
    restore = () => {
      viewPrototype.measureInWindow = original;
    };
    await act(async () => {
      renderer = create(
        <DuoContext.Provider value={store}>
          <DuoArrangementView
            primary={<Text>List</Text>}
            secondary={<Text>Detail</Text>}
          />
        </DuoContext.Provider>
      );
    });

    const container = renderer!.root.findAllByType(View)[0]!;
    expect(StyleSheet.flatten(container.props.style)).toMatchObject({
      flexDirection: 'row',
    });
    const primaryPane = container.findAllByType(View)[1]!;
    expect(StyleSheet.flatten(primaryPane.props.style)).toMatchObject({
      width: 420,
    });
  });
});
