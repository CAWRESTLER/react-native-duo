/**
 * Jest mock for apps that use `@cawrestler/react-native-duo`.
 *
 * ```js
 * jest.mock('@cawrestler/react-native-duo', () =>
 *   require('@cawrestler/react-native-duo/jest')
 * );
 * ```
 *
 * Components use the package's JavaScript fallbacks (the Android/web
 * behavior), so they render their children without native views. The
 * environment defaults to a non-Duo device; call `setMockDuoEnvironment` to
 * simulate a Duo, a hinge pose, reserved regions, or cameras. Updates reach
 * every mounted `DuoProvider`, so wrap them in `act()` when called mid-test.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  createDuoEnvironmentStore,
  DuoContext,
  defaultDuoEnvironment,
  type DuoEnvironmentStore,
} from './context';
import type { DuoEnvironment, DuoProviderProps } from './types';

export {
  useDuo,
  useDuoCameras,
  useDuoGeometry,
  useDuoHinge,
  useDuoReservedRegions,
  useDuoWindow,
  defaultDuoEnvironment,
} from './context';
export { DuoArrangementView } from './fallback/DuoArrangementView';
export { DuoAdaptiveToolbar } from './fallback/DuoAdaptiveToolbar';
export { DuoNavigationToolbar } from './fallback/DuoNavigationToolbar';
export { DuoCameraView } from './fallback/DuoCameraView';
export { DuoSceneAccessory } from './fallback/DuoSceneAccessory';
export { DuoGeometryView } from './fallback/DuoGeometryView';
export type * from './types';

/** Top-level fields replace; nested objects (`hinge`, `geometry`, `window`) merge. */
export type DuoEnvironmentOverrides = {
  [Key in keyof DuoEnvironment]?: DuoEnvironment[Key] extends readonly unknown[]
    ? DuoEnvironment[Key]
    : DuoEnvironment[Key] extends object
      ? Partial<DuoEnvironment[Key]>
      : DuoEnvironment[Key];
};

let mockEnvironment: DuoEnvironment = defaultDuoEnvironment;
const mountedStores = new Set<DuoEnvironmentStore>();

export function createMockDuoEnvironment(
  overrides: DuoEnvironmentOverrides = {},
  base: DuoEnvironment = defaultDuoEnvironment
): DuoEnvironment {
  const environment = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    const current = environment[key];
    environment[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
        ? { ...current, ...value }
        : value;
  }
  return environment as unknown as DuoEnvironment;
}

/** Sets the environment every mock `DuoProvider` reports, merged over the defaults. */
export function setMockDuoEnvironment(overrides: DuoEnvironmentOverrides) {
  mockEnvironment = createMockDuoEnvironment(overrides);
  for (const store of mountedStores) store.update(mockEnvironment);
  return mockEnvironment;
}

/** Restores the default non-Duo environment, for example in `afterEach`. */
export function resetMockDuoEnvironment() {
  return setMockDuoEnvironment({});
}

export function DuoProvider({
  children,
  onEnvironmentChange,
  style,
}: DuoProviderProps) {
  const storeRef = useRef<DuoEnvironmentStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createDuoEnvironmentStore(mockEnvironment);
  }
  const store = storeRef.current;

  useEffect(() => {
    mountedStores.add(store);
    store.update(mockEnvironment);
    onEnvironmentChange?.(store.getSnapshot());
    const unsubscribe = store.subscribe(() =>
      onEnvironmentChange?.(store.getSnapshot())
    );
    return () => {
      unsubscribe();
      mountedStores.delete(store);
    };
  }, [onEnvironmentChange, store]);

  return (
    <DuoContext.Provider value={store}>
      <View collapsable={false} style={[styles.fill, style]}>
        {children}
      </View>
    </DuoContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
