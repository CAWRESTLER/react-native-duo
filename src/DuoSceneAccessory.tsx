import { useEffect } from 'react';

import type { DuoSceneAccessoryProps } from './types';

export function DuoSceneAccessory({
  kind,
  enabled = true,
  onStateChange,
}: DuoSceneAccessoryProps) {
  useEffect(() => {
    onStateChange?.({
      supported: false,
      registered: false,
      available: false,
      enabled,
      kind,
      connected: false,
      size: null,
    });
  }, [enabled, kind, onStateChange]);
  // Accessory scenes are iOS-only; React children are not rendered elsewhere.
  return null;
}
