import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

export type DuoHingeStatus =
  'unavailable' | 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen';

export type DuoVerticalBarEdge =
  'unavailable' | 'unspecified' | 'leading' | 'trailing';

export type DuoCameraLocation = 'inner' | 'outer';
export type DuoCameraDirection = 'forward' | 'backward';
export type DuoCameraSource =
  'virtualFront' | 'outerFront' | 'innerFront' | 'rear';

export interface DuoRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DuoInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DuoReservedRegion {
  id: string;
  kind: 'division' | 'occlusion';
  /** Margin-inclusive observing-view coordinates; regions may lie outside the view's bounds. */
  frame: DuoRect;
  /** Interactive-content margins already included in frame; do not expand them again. */
  margins: DuoInsets;
  isActive: boolean;
}

export interface DuoHingeState {
  available: boolean;
  status: DuoHingeStatus;
  angleRadians: number | null;
  angleDegrees: number | null;
}

export interface DuoCameraDevice {
  id: string;
  name: string;
  location: DuoCameraLocation | 'other';
  position: 'front' | 'back' | 'unspecified';
  deviceType: string;
  isVirtual: boolean;
}

export interface DuoWindowMetrics {
  width: number;
  height: number;
  scale: number;
  safeAreaInsets: DuoInsets;
}

export type DuoSizeClass = 'compact' | 'regular' | 'unspecified';

/** Geometry in the measured view's coordinate space, rather than screen coordinates. */
export interface DuoGeometryState {
  native: boolean;
  width: number;
  height: number;
  safeAreaInsets: DuoInsets;
  reservedRegions: DuoReservedRegion[];
}

export interface DuoGeometryViewProps {
  children: ReactNode | ((geometry: DuoGeometryState) => ReactNode);
  includeInactiveRegions?: boolean;
  onGeometryChange?: (geometry: DuoGeometryState) => void;
  style?: ViewProps['style'];
}

export interface DuoEnvironment {
  /** True when the current iOS runtime supports the compiled Duo SDK surface. */
  supportsDuoApis: boolean;
  /** True when the current view hierarchy exposes a hinge, Duo regions, or Duo cameras. */
  isDuo: boolean;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  horizontalSizeClass: DuoSizeClass;
  verticalSizeClass: DuoSizeClass;
  /** Whether this application and runtime declare support for additional scenes. */
  supportsMultipleWindows: boolean;
  geometry: DuoGeometryState;
  hinge: DuoHingeState;
  reservedRegions: DuoReservedRegion[];
  verticalBarEdge: DuoVerticalBarEdge;
  cameras: DuoCameraDevice[];
  window: DuoWindowMetrics;
}

export interface DuoProviderProps {
  children: ReactNode;
  includeInactiveRegions?: boolean;
  onEnvironmentChange?: (environment: DuoEnvironment) => void;
  style?: ViewProps['style'];
}

export type DuoArrangement = 'automatic' | 'split' | 'overlay';
export type DuoArrangementAxes =
  'automatic' | 'horizontal' | 'vertical' | 'both';
export type DuoOverlayEdge = 'top' | 'leading' | 'bottom' | 'trailing';

export interface DuoArrangementPaneState {
  /** Native pane frame in the arrangement host's coordinate space. */
  frame?: DuoRect;
  zIndex: number;
  splitAxis: 'none' | 'horizontal' | 'vertical' | 'both';
  isHidden: boolean;
}

export interface DuoArrangementState {
  native: boolean;
  arrangement: DuoArrangement;
  primary: DuoArrangementPaneState;
  secondary: DuoArrangementPaneState;
}

export interface DuoArrangementViewProps {
  primary: ReactNode;
  secondary: ReactNode;
  arrangement?: DuoArrangement;
  axes?: DuoArrangementAxes;
  /** Preferred fraction for the primary pane, between 0.05 and 0.95. */
  primaryFraction?: number;
  overlayEdge?: DuoOverlayEdge;
  animated?: boolean;
  onStateChange?: (state: DuoArrangementState) => void;
  style?: ViewProps['style'];
  primaryStyle?: ViewProps['style'];
  secondaryStyle?: ViewProps['style'];
}

export type DuoToolbarItemAxisBehavior =
  'automatic' | 'horizontalOnly' | 'verticalPreferred';

export type DuoToolbarItemPlacement =
  'cancellationAction' | 'pinnedTrailing' | 'bottomBar' | 'tab' | 'overflow';

export interface DuoToolbarMenuItem {
  id: string;
  title: string;
  /** SF Symbol name used on iOS. */
  systemImage?: string;
  disabled?: boolean;
}

export interface DuoToolbarItem {
  id: string;
  title: string;
  /** SF Symbol name used on iOS. */
  systemImage?: string;
  /** Optional SF Symbol used when UIKit places this action vertically. */
  verticalSystemImage?: string;
  /** Native bar role. Items default to `bottomBar` for backwards compatibility. */
  placement?: DuoToolbarItemPlacement;
  axisBehavior?: DuoToolbarItemAxisBehavior;
  /** Controls which items remain visible when UIKit needs to compress the bar. */
  visibilityPriority?: 'low' | 'standard' | 'high';
  /** Native tab or bar-item badge. */
  badge?: string | number;
  /** Actions presented by an item whose placement is `overflow`. */
  menuItems?: DuoToolbarMenuItem[];
  disabled?: boolean;
  selected?: boolean;
}

export type DuoVerticalBarBehavior = 'automatic' | 'disabled';
export type DuoVerticalBarCompression =
  'automatic' | 'preferBarItems' | 'preferTabBar';

export type DuoToolbarContentLayout = 'safeArea' | 'edgeToEdge';

export interface DuoToolbarState {
  native: boolean;
  /** System-preferred edge; it can remain vertical while local bars opt out. */
  verticalBarEdge: DuoVerticalBarEdge;
  /** Whether this host uses a vertical bar layout; not an indication of bar visibility. */
  isVertical: boolean;
  /** Unobscured insets, applied to children in safeArea mode regardless of background layout. */
  contentInsets: DuoInsets;
  /** Actual host dimensions in points, before applying contentInsets. */
  contentSize?: Pick<DuoRect, 'width' | 'height'>;
}

export interface DuoAdaptiveToolbarProps {
  children: ReactNode;
  items: DuoToolbarItem[];
  title?: string;
  /** Hex color for native bar controls and selected tabs. */
  tintColor?: string;
  /**
   * `disabled` uses native horizontal bars for this host. The app's root
   * controller separately controls the window-wide status-bar axis.
   */
  verticalBehavior?: DuoVerticalBarBehavior;
  compressionBehavior?: DuoVerticalBarCompression;
  showsNavigationBar?: boolean;
  /**
   * safeArea (default) keeps children in the unobscured content rectangle.
   * edgeToEdge fills this host's viewport; position important controls using
   * contentInsets or reserved regions so they avoid bars and system UI.
   */
  contentLayout?: DuoToolbarContentLayout;
  /** Decorative, non-interactive content drawn across the entire host behind children and bars. */
  background?: ReactNode;
  onItemPress?: (id: string) => void;
  onStateChange?: (state: DuoToolbarState) => void;
  style?: ViewProps['style'];
  contentStyle?: ViewProps['style'];
}

export type DuoSceneAccessoryKind = 'externalDisplay' | 'cameraCapture';

export interface DuoSceneAccessoryContent {
  title: string;
  subtitle?: string;
  systemImage?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  /** Optional bottom-trailing color for a diagonal background gradient. */
  gradientEndColor?: string;
  /** Short, bold text above the title, with three-point letter spacing. */
  eyebrow?: string;
  eyebrowColor?: string;
  /** A custom title size in points; custom titles use a bold system font. */
  titleFontSize?: number;
  titleRounded?: boolean;
  subtitleFontSize?: number;
  subtitleSemibold?: boolean;
  /** Opacity from 0 to 1; defaults to 0.72. */
  subtitleOpacity?: number;
  /** Vertical spacing in points between the symbol and text. */
  spacing?: number;
  symbolSize?: number;
  /** Hides the symbol while preserving the existing default icon otherwise. */
  hideSymbol?: boolean;
}

export interface DuoSceneAccessoryState {
  supported: boolean;
  registered: boolean;
  available: boolean;
  enabled: boolean;
  kind: DuoSceneAccessoryKind;
}

export interface DuoSceneAccessoryProps {
  kind: DuoSceneAccessoryKind;
  content: DuoSceneAccessoryContent;
  enabled?: boolean;
  onStateChange?: (state: DuoSceneAccessoryState) => void;
}

export type DuoCameraPermission =
  'undetermined' | 'denied' | 'restricted' | 'granted';
export type DuoSmartFramingMode = 'off' | 'monitor' | 'apply';

export interface DuoSmartFramingState {
  supported: boolean;
  monitoring: boolean;
  mode: DuoSmartFramingMode;
  recommended: { aspectRatio: string; zoomFactor: number } | null;
}

export interface DuoCameraViewState {
  supported: boolean;
  available: boolean;
  running: boolean;
  permission: DuoCameraPermission;
  location: DuoCameraLocation;
  direction: DuoCameraDirection | null;
  source: DuoCameraSource | null;
  forwardCameraIds: string[];
  backwardCameraIds: string[];
  deviceId: string | null;
  deviceName: string | null;
  previewRotation: number | null;
  sensorCompensationSupported: boolean;
  sensorCompensationDisabled: boolean;
  aspectRatios: string[];
  selectedAspectRatio: string | null;
  smartFraming: DuoSmartFramingState;
  error: string | null;
}

export interface DuoCameraViewProps {
  /** Physical camera location. Ignored when direction is set. */
  location?: DuoCameraLocation;
  /** Select whichever Duo camera currently faces this direction relative to the view. */
  direction?: DuoCameraDirection;
  /** Explicit Swift-style camera selection. Overrides location; direction takes precedence. */
  source?: DuoCameraSource;
  /** A supported aspect-ratio identifier returned in camera state. */
  dynamicAspectRatio?: string;
  /** Defaults to the system's sensor orientation compensation setting (true). */
  sensorOrientationCompensation?: boolean;
  active?: boolean;
  /** Set to true in direct response to a user action to request camera permission. */
  requestPermission?: boolean;
  mirrored?: boolean;
  resizeMode?: 'cover' | 'contain';
  /** Monitor recommendations, or also apply the recommended aspect ratio and zoom. */
  smartFraming?: DuoSmartFramingMode;
  onStateChange?: (state: DuoCameraViewState) => void;
  style?: ViewProps['style'];
}
