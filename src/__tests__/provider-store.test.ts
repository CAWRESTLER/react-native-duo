import { describe, expect, it, jest } from '@jest/globals';

import { createDuoEnvironmentStore, defaultDuoEnvironment } from '../context';
import type { DuoEnvironment } from '../types';

function jsonSnapshot(environment: DuoEnvironment): DuoEnvironment {
  return JSON.parse(JSON.stringify(environment));
}

describe('provider subscription store', () => {
  it('keeps snapshots and slice references stable for equal native JSON events', () => {
    const store = createDuoEnvironmentStore();
    const listener = jest.fn();
    store.subscribe(listener);
    const snapshot = store.getSnapshot();

    expect(store.update(jsonSnapshot(snapshot))).toBe(snapshot);
    expect(listener).not.toHaveBeenCalled();

    const next = store.update({
      ...jsonSnapshot(snapshot),
      hinge: { ...snapshot.hinge, angleDegrees: 90, angleRadians: Math.PI / 2 },
    });
    expect(next).not.toBe(snapshot);
    expect(next.hinge).not.toBe(snapshot.hinge);
    expect(next.geometry).toBe(snapshot.geometry);
    expect(next.window).toBe(snapshot.window);
    expect(next.cameras).toBe(snapshot.cameras);
    expect(next.reservedRegions).toBe(snapshot.reservedRegions);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('only notifies the whole environment and streams whose values changed', () => {
    const store = createDuoEnvironmentStore();
    const whole = jest.fn();
    const hinge = jest.fn();
    const geometry = jest.fn();
    const cameras = jest.fn();
    const window = jest.fn();
    store.subscribe(whole);
    store.subscribeToField('hinge', hinge);
    store.subscribeToField('geometry', geometry);
    store.subscribeToField('cameras', cameras);
    store.subscribeToField('window', window);

    store.update({
      ...jsonSnapshot(store.getSnapshot()),
      hinge: { ...defaultDuoEnvironment.hinge, angleDegrees: 45 },
    });
    expect(whole).toHaveBeenCalledTimes(1);
    expect(hinge).toHaveBeenCalledTimes(1);
    expect(geometry).not.toHaveBeenCalled();
    expect(cameras).not.toHaveBeenCalled();
    expect(window).not.toHaveBeenCalled();

    store.update({
      ...jsonSnapshot(store.getSnapshot()),
      geometry: { ...defaultDuoEnvironment.geometry, width: 450, height: 688 },
      cameras: [
        {
          id: 'inner',
          name: 'Inner camera',
          location: 'inner',
          position: 'front',
          deviceType: 'innerFront',
          isVirtual: false,
        },
      ],
    });
    expect(whole).toHaveBeenCalledTimes(2);
    expect(hinge).toHaveBeenCalledTimes(1);
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(cameras).toHaveBeenCalledTimes(1);
    expect(window).not.toHaveBeenCalled();
  });

  it('commits all fields before notifying and deduplicates shared listeners', () => {
    const store = createDuoEnvironmentStore();
    const observed: DuoEnvironment[] = [];
    const listener = jest.fn(() => observed.push(store.getSnapshot()));
    store.subscribe(listener);
    store.subscribeToField('geometry', listener);
    store.subscribeToField('hinge', listener);
    const next = store.update({
      ...defaultDuoEnvironment,
      geometry: { ...defaultDuoEnvironment.geometry, width: 450 },
      hinge: { ...defaultDuoEnvironment.hinge, angleDegrees: 90 },
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(observed).toEqual([next]);
    expect(observed[0]?.geometry.width).toBe(450);
    expect(observed[0]?.hinge.angleDegrees).toBe(90);
  });

  it('unsubscribes cleanly and allows a field to subscribe again after cleanup', () => {
    const store = createDuoEnvironmentStore();
    const removed = jest.fn();
    const retained = jest.fn();
    const stopWhole = store.subscribe(removed);
    const stopField = store.subscribeToField('hinge', removed);
    stopWhole();
    stopWhole();
    stopField();
    stopField();
    const stopReplacement = store.subscribeToField('hinge', retained);
    // A stale cleanup must not discard a replacement subscription stream.
    stopField();
    store.update({
      ...defaultDuoEnvironment,
      hinge: { ...defaultDuoEnvironment.hinge, angleDegrees: 45 },
    });

    expect(removed).not.toHaveBeenCalled();
    expect(retained).toHaveBeenCalledTimes(1);
    stopReplacement();
    store.update({
      ...defaultDuoEnvironment,
      hinge: { ...defaultDuoEnvironment.hinge, angleDegrees: 90 },
    });
    expect(retained).toHaveBeenCalledTimes(1);
  });

  it('does not let a partial native object remove established environment fields', () => {
    const store = createDuoEnvironmentStore();
    store.update({
      hinge: { ...defaultDuoEnvironment.hinge, angleDegrees: 45 },
    } as DuoEnvironment);
    expect(store.getSnapshot().hinge.angleDegrees).toBe(45);
    expect(store.getSnapshot().geometry).toBe(defaultDuoEnvironment.geometry);
    expect(store.getSnapshot().cameras).toBe(defaultDuoEnvironment.cameras);
  });
});
