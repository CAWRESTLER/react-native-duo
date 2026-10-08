import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';

import type { DuoEnvironment } from './types';

export const defaultDuoEnvironment: DuoEnvironment = {
  supportsDuoApis: false,
  isDuo: false,
  platform: 'unknown',
  horizontalSizeClass: 'unspecified',
  verticalSizeClass: 'unspecified',
  supportsMultipleWindows: false,
  geometry: {
    native: false,
    width: 0,
    height: 0,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    reservedRegions: [],
  },
  hinge: {
    available: false,
    status: 'unavailable',
    angleRadians: null,
    angleDegrees: null,
  },
  reservedRegions: [],
  verticalBarEdge: 'unavailable',
  cameras: [],
  window: {
    width: 0,
    height: 0,
    scale: 1,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  },
};

type EnvironmentField = keyof DuoEnvironment;
type Listener = () => void;

/** Internal store: context identity is stable; each environment field owns a stream. */
export interface DuoEnvironmentStore {
  getSnapshot: () => DuoEnvironment;
  subscribe: (listener: Listener) => () => void;
  subscribeToField: (field: EnvironmentField, listener: Listener) => () => void;
  update: (environment: DuoEnvironment) => DuoEnvironment;
}

// Native events are JSON snapshots, so even unchanged arrays/objects arrive
// with new identities. Compare their values before invalidating subscribers.
function equalSnapshotValue(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (
    previous === null ||
    next === null ||
    typeof previous !== 'object' ||
    typeof next !== 'object'
  ) {
    return false;
  }
  if (Array.isArray(previous) !== Array.isArray(next)) return false;
  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const keys = Object.keys(previousRecord);
  return (
    keys.length === Object.keys(nextRecord).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(nextRecord, key) &&
        equalSnapshotValue(previousRecord[key], nextRecord[key])
    )
  );
}

export function createDuoEnvironmentStore(
  initialEnvironment: DuoEnvironment = defaultDuoEnvironment
): DuoEnvironmentStore {
  let environment = initialEnvironment;
  const listeners = new Set<Listener>();
  const fieldListeners = new Map<EnvironmentField, Set<Listener>>();

  return {
    getSnapshot: () => environment,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeToField: (field, listener) => {
      let stream = fieldListeners.get(field);
      if (!stream) {
        stream = new Set();
        fieldListeners.set(field, stream);
      }
      stream.add(listener);
      return () => {
        stream.delete(listener);
        if (stream.size === 0 && fieldListeners.get(field) === stream) {
          fieldListeners.delete(field);
        }
      };
    },
    update: (next) => {
      const changedFields: EnvironmentField[] = [];
      const snapshot = { ...environment, ...next };
      for (const field of Object.keys(next) as EnvironmentField[]) {
        if (equalSnapshotValue(environment[field], next[field])) {
          // Retain references for all value-equivalent slices, not just hinge.
          Object.assign(snapshot, { [field]: environment[field] });
        } else {
          changedFields.push(field);
        }
      }
      if (changedFields.length === 0) return environment;
      environment = snapshot;

      // Commit the complete snapshot first so multiple hooks in one component
      // always observe a consistent environment, including concurrent renders.
      const notifications = new Set(listeners);
      for (const field of changedFields) {
        fieldListeners
          .get(field)
          ?.forEach((listener) => notifications.add(listener));
      }
      notifications.forEach((listener) => listener());
      return environment;
    },
  };
}

export const DuoContext = createContext<DuoEnvironmentStore>(
  createDuoEnvironmentStore()
);

/** Subscribe to every environment change. Prefer a smaller hook where possible. */
export function useDuo() {
  const store = useContext(DuoContext);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}

function useDuoField<Field extends EnvironmentField>(field: Field) {
  const store = useContext(DuoContext);
  const subscribe = useCallback(
    (listener: Listener) => store.subscribeToField(field, listener),
    [field, store]
  );
  const getSnapshot = useCallback(
    () => store.getSnapshot()[field],
    [field, store]
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useDuoHinge() {
  return useDuoField('hinge');
}

export function useDuoReservedRegions() {
  return useDuoField('reservedRegions');
}

/**
 * Duo camera discovery.
 *
 * @experimental The API may change before `0.1.0`; see docs/API_STABILITY.md.
 */
export function useDuoCameras() {
  return useDuoField('cameras');
}

/** Geometry local to this provider. Use DuoGeometryView for nested view bounds. */
export function useDuoGeometry() {
  return useDuoField('geometry');
}

export function useDuoWindow() {
  return useDuoField('window');
}
