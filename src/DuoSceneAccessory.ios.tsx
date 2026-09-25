import { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import NativeDuoSceneAccessoryView from './native/DuoSceneAccessoryNativeComponent';
import { parseNativePayload, type NativePayloadEvent } from './native/events';
import type { DuoSceneAccessoryProps, DuoSceneAccessoryState } from './types';

export function DuoSceneAccessory({
  kind,
  content,
  enabled = true,
  onStateChange,
}: DuoSceneAccessoryProps) {
  const contentJson = useMemo(() => JSON.stringify(content), [content]);
  const handleState = useCallback(
    ({ nativeEvent }: { nativeEvent: NativePayloadEvent }) => {
      const fallback: DuoSceneAccessoryState = {
        supported: false,
        registered: false,
        available: false,
        enabled,
        kind,
      };
      onStateChange?.(parseNativePayload(nativeEvent.payload, fallback));
    },
    [enabled, kind, onStateChange]
  );

  return (
    <NativeDuoSceneAccessoryView
      kind={kind}
      contentJson={contentJson}
      enabled={enabled}
      onStateChange={handleState}
      pointerEvents="none"
      style={styles.hidden}
    />
  );
}

const styles = StyleSheet.create({
  hidden: { width: 0, height: 0 },
});
