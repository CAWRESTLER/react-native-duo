import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  DuoAdaptiveToolbar,
  DuoArrangementView,
  DuoProvider,
  DuoSceneAccessory,
  createMockDuoEnvironment,
  defaultDuoEnvironment,
  resetMockDuoEnvironment,
  setMockDuoEnvironment,
  useDuo,
  useDuoHinge,
} from '../jest';

let renderer: ReactTestRenderer | undefined;

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  resetMockDuoEnvironment();
});

function HingeLabel() {
  const { isDuo } = useDuo();
  const hinge = useDuoHinge();
  return (
    <Text testID="hinge">
      {isDuo ? 'duo' : 'phone'} {hinge.status} {hinge.angleDegrees ?? '-'}
    </Text>
  );
}

function label() {
  return (
    renderer!.root.findByProps({ testID: 'hinge' }).props.children as unknown[]
  ).join('');
}

describe('@cawrestler/react-native-duo/jest', () => {
  it('renders consumer components without native views, as a non-Duo device by default', async () => {
    const onStateChange = jest.fn();
    await act(async () => {
      renderer = create(
        <DuoProvider>
          <HingeLabel />
          <DuoArrangementView
            primary={<Text testID="primary">List</Text>}
            secondary={<Text testID="secondary">Detail</Text>}
          />
          <DuoAdaptiveToolbar items={[{ id: 'save', title: 'Save' }]}>
            <Text testID="toolbar-content">Body</Text>
          </DuoAdaptiveToolbar>
          <DuoSceneAccessory
            kind="externalDisplay"
            content={{ title: 'Companion' }}
            onStateChange={onStateChange}
          />
        </DuoProvider>
      );
    });

    expect(label()).toBe('phone unavailable -');
    for (const testID of ['primary', 'secondary', 'toolbar-content']) {
      expect(renderer!.root.findByProps({ testID })).toBeTruthy();
    }
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ supported: false, kind: 'externalDisplay' })
    );
  });

  it('simulates a Duo and live hinge changes for mounted providers', async () => {
    setMockDuoEnvironment({
      isDuo: true,
      supportsDuoApis: true,
      hinge: { available: true, status: 'fullyOpen', angleDegrees: 180 },
    });
    await act(async () => {
      renderer = create(
        <DuoProvider>
          <HingeLabel />
        </DuoProvider>
      );
    });
    expect(label()).toBe('duo fullyOpen 180');

    await act(async () => {
      setMockDuoEnvironment({
        isDuo: true,
        hinge: { available: true, status: 'partiallyOpen', angleDegrees: 95 },
      });
    });
    expect(label()).toBe('duo partiallyOpen 95');

    await act(async () => {
      resetMockDuoEnvironment();
    });
    expect(label()).toBe('phone unavailable -');
  });

  it('merges nested overrides over the defaults without mutating them', () => {
    const environment = createMockDuoEnvironment({
      window: { width: 900 },
      cameras: [],
    });
    expect(environment.window).toEqual({
      ...defaultDuoEnvironment.window,
      width: 900,
    });
    expect(defaultDuoEnvironment.window.width).toBe(0);
  });
});
