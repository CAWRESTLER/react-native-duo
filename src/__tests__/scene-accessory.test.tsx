import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { DuoSceneAccessory as NativeAccessory } from '../DuoSceneAccessory.ios';
import NativeDuoSceneAccessoryView from '../native/DuoSceneAccessoryNativeComponent';
import type { DuoSceneAccessoryState } from '../types';

jest.mock('../native/DuoSceneAccessoryNativeComponent', () => ({
  __esModule: true,
  default: 'RNDuoSceneAccessoryView',
}));

const { DuoSceneAccessory: FallbackAccessory } = jest.requireActual<
  typeof import('../DuoSceneAccessory')
>('../DuoSceneAccessory.tsx');

const connectedState: DuoSceneAccessoryState = {
  supported: true,
  registered: true,
  available: true,
  enabled: true,
  kind: 'externalDisplay',
  connected: true,
  size: { width: 1920, height: 1080 },
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

function nativeView() {
  return renderer!.root.findByType(NativeDuoSceneAccessoryView);
}

async function emitState(state: DuoSceneAccessoryState) {
  await act(async () => {
    nativeView().props.onStateChange({
      nativeEvent: { payload: JSON.stringify(state) },
    });
  });
}

describe('DuoSceneAccessory native bridge', () => {
  it('keeps declarative content as a zero-size registration without children', async () => {
    await mount(
      <NativeAccessory
        kind="externalDisplay"
        content={{ title: 'Presentation ready' }}
      />
    );
    expect(nativeView().props.reactContent).toBe(false);
    expect(JSON.parse(nativeView().props.contentJson)).toEqual({
      title: 'Presentation ready',
    });
    expect(StyleSheet.flatten(nativeView().props.style)).toEqual({
      width: 0,
      height: 0,
    });
  });

  it('mounts React children and sizes them to the connected accessory scene', async () => {
    const onStateChange = jest.fn();
    await mount(
      <NativeAccessory
        kind="externalDisplay"
        content={{ backgroundColor: '#000000' }}
        onStateChange={onStateChange}
      >
        <View testID="slide">
          <Text>Slide 3 of 12</Text>
        </View>
      </NativeAccessory>
    );
    expect(nativeView().props.reactContent).toBe(true);
    expect(nativeView().props.pointerEvents).toBe('none');
    expect(nativeView().findByProps({ testID: 'slide' })).toBeTruthy();
    // Disconnected: children stay mounted but take no space in the app.
    expect(StyleSheet.flatten(nativeView().props.style)).toEqual({
      width: 0,
      height: 0,
    });

    await emitState(connectedState);
    expect(onStateChange).toHaveBeenLastCalledWith(connectedState);
    expect(StyleSheet.flatten(nativeView().props.style)).toEqual({
      position: 'absolute',
      left: 0,
      top: 0,
      width: 1920,
      height: 1080,
    });

    await emitState({ ...connectedState, connected: false, size: null });
    expect(StyleSheet.flatten(nativeView().props.style)).toEqual({
      width: 0,
      height: 0,
    });
    expect(nativeView().findByProps({ testID: 'slide' })).toBeTruthy();
  });

  it('falls back to a disconnected state when the native payload is malformed', async () => {
    const onStateChange = jest.fn();
    await mount(
      <NativeAccessory
        kind="cameraCapture"
        enabled={false}
        onStateChange={onStateChange}
      >
        <View />
      </NativeAccessory>
    );
    await act(async () => {
      nativeView().props.onStateChange({ nativeEvent: { payload: '{' } });
    });
    expect(onStateChange).toHaveBeenLastCalledWith({
      supported: false,
      registered: false,
      available: false,
      enabled: false,
      kind: 'cameraCapture',
      connected: false,
      size: null,
    });
  });
});

describe('DuoSceneAccessory fallback', () => {
  it('reports an unsupported, disconnected state and renders no children', async () => {
    const onStateChange = jest.fn();
    const tree = await mount(
      <FallbackAccessory kind="externalDisplay" onStateChange={onStateChange}>
        <View testID="slide" />
      </FallbackAccessory>
    );
    expect(tree.toJSON()).toBeNull();
    expect(onStateChange).toHaveBeenCalledWith({
      supported: false,
      registered: false,
      available: false,
      enabled: true,
      kind: 'externalDisplay',
      connected: false,
      size: null,
    });
  });
});
