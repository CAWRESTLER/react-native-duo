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
    });
  }, [enabled, kind, onStateChange]);
  return null;
}
