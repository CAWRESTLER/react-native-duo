import type {
  DuoNavigationToolbarItem,
  DuoNavigationToolbarState,
} from '../types';

/** Also enforce ownership for untyped JS consumers; never add a second tab/header group. */
export function navigationToolbarItems(items: DuoNavigationToolbarItem[]) {
  return items.filter(
    (item) =>
      item.placement === undefined ||
      item.placement === 'bottomBar' ||
      item.placement === 'overflow'
  );
}

/** Native JSON is an untrusted boundary: reject incomplete or non-finite layouts. */
export function isNavigationToolbarState(
  value: unknown
): value is DuoNavigationToolbarState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<DuoNavigationToolbarState>;
  if (
    typeof state.native !== 'boolean' ||
    typeof state.isVertical !== 'boolean' ||
    ![
      'attached',
      'inactive',
      'missingNativeStack',
      'conflict',
      'fallback',
    ].includes(state.attachment ?? '') ||
    !['unavailable', 'unspecified', 'leading', 'trailing'].includes(
      state.verticalBarEdge ?? ''
    )
  )
    return false;
  if (
    state.actionPresentation !== undefined &&
    !['navigationController', 'inline', 'none', 'fallback'].includes(
      state.actionPresentation
    )
  )
    return false;
  const insets = state.contentInsets;
  if (
    !insets ||
    ![insets.top, insets.right, insets.bottom, insets.left].every(
      (inset) =>
        typeof inset === 'number' && Number.isFinite(inset) && inset >= 0
    )
  )
    return false;
  const size = state.contentSize;
  if (size === undefined) return true;
  if (!size || typeof size !== 'object') return false;
  return [size.width, size.height].every(
    (dimension) =>
      typeof dimension === 'number' &&
      Number.isFinite(dimension) &&
      dimension >= 0
  );
}
