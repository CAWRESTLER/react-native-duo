import { useEffect, useMemo, useRef, useState } from 'react';
import { DuoAdaptiveToolbar } from './DuoAdaptiveToolbar';
import { navigationToolbarItems } from './native/navigation';
import type {
  DuoNavigationToolbarProps,
  DuoNavigationToolbarState,
  DuoToolbarState,
} from './types';

/** Non-iOS platforms retain navigator-owned headers/tabs and use ordinary RN actions. */
export function DuoNavigationToolbar({
  active = true,
  onStateChange,
  horizontalPresentation: _horizontalPresentation,
  ...props
}: DuoNavigationToolbarProps) {
  const [measurement, setMeasurement] = useState<DuoToolbarState>();
  const actions = useMemo(
    () => navigationToolbarItems(props.items),
    [props.items]
  );
  const state = useMemo<DuoNavigationToolbarState | undefined>(
    () =>
      measurement
        ? {
            ...measurement,
            attachment: active ? 'fallback' : 'inactive',
            actionPresentation: active && actions.length ? 'fallback' : 'none',
          }
        : undefined,
    [measurement, active, actions.length]
  );
  const lastEmitted = useRef<DuoNavigationToolbarState | undefined>(undefined);
  useEffect(() => {
    if (state && onStateChange && lastEmitted.current !== state) {
      lastEmitted.current = state;
      onStateChange(state);
    }
  }, [state, onStateChange]);
  return (
    <DuoAdaptiveToolbar
      {...props}
      items={active ? actions : []}
      showsNavigationBar={false}
      onStateChange={setMeasurement}
    />
  );
}
