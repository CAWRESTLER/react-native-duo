import { useEffect } from 'react';

import type { DuoSceneAccessoryProps } from '../types';

/**
 * Declarative or React content on the external-display or camera-capture accessory scene.
 *
 * @experimental The API may change before `0.1.0`; see docs/API_STABILITY.md.
 */
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
