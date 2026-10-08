import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import NativeDuoSceneAccessoryView from './native/DuoSceneAccessoryNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoSceneAccessoryProps, DuoSceneAccessoryState } from './types';

type AccessorySize = { width: number; height: number };

export function DuoSceneAccessory({
  kind,
  content,
  enabled = true,
  onStateChange,
  children,
}: DuoSceneAccessoryProps) {
  const reactContent = children != null;
  const contentJson = useMemo(() => JSON.stringify(content ?? {}), [content]);
  // Children are laid out at the connected scene's size, then reparented
  // natively into that scene's window.
  const [size, setSize] = useState<AccessorySize | null>(null);
  const handleState = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const fallback: DuoSceneAccessoryState = {
        supported: false,
        registered: false,
        available: false,
        enabled,
        kind,
        connected: false,
        size: null,
      };
      const state = parseNativePayload(nativeEvent.payload, fallback);
      setSize((previous) => {
        const next = state.size ?? null;
        return previous?.width === next?.width &&
          previous?.height === next?.height
          ? previous
          : next;
      });
      onStateChange?.(state);
    },
    [enabled, kind, onStateChange]
  );

  return (
    <NativeDuoSceneAccessoryView
      kind={kind}
      contentJson={contentJson}
      enabled={enabled}
      reactContent={reactContent}
      onStateChange={handleState}
      pointerEvents="none"
      style={
        reactContent && size
          ? [styles.offscreen, { width: size.width, height: size.height }]
          : styles.hidden
      }
    >
      {children}
    </NativeDuoSceneAccessoryView>
  );
}

const styles = StyleSheet.create({
  hidden: { width: 0, height: 0 },
  // Out of the host layout's flow; the native view keeps children in the
  // accessory window, so nothing renders at this position in the app.
  offscreen: { position: 'absolute', left: 0, top: 0 },
});
