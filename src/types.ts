import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type DuoHingeStatus =
  'unavailable' | 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen';

export type DuoVerticalBarEdge =
  'unavailable' | 'unspecified' | 'leading' | 'trailing';

export type DuoCameraLocation = 'inner' | 'outer';
export type DuoCameraDirection = 'forward' | 'backward';

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
  frame: DuoRect;
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
  location: DuoCameraLocation;
  position: 'front' | 'back' | 'unspecified';
}

export interface DuoWindowMetrics {
  width: number;
  height: number;
  scale: number;
  safeAreaInsets: DuoInsets;
}

export interface DuoEnvironment {
  /** True when the app was compiled with the iOS 27.1 Duo SDK surface. */
  supportsDuoApis: boolean;
  /** True when the current view hierarchy exposes a hinge, Duo regions, or Duo cameras. */
  isDuo: boolean;
  platform: 'ios' | 'android' | 'web' | 'unknown';
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
  style?: StyleProp<ViewStyle>;
}

export type DuoArrangement = 'split' | 'overlay';
export type DuoArrangementAxes =
  'automatic' | 'horizontal' | 'vertical' | 'both';
export type DuoOverlayEdge = 'top' | 'leading' | 'bottom' | 'trailing';

export interface DuoArrangementPaneState {
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
  style?: StyleProp<ViewStyle>;
  primaryStyle?: StyleProp<ViewStyle>;
  secondaryStyle?: StyleProp<ViewStyle>;
}

export type DuoToolbarItemAxisBehavior =
  'automatic' | 'horizontalOnly' | 'verticalPreferred';

export interface DuoToolbarItem {
  id: string;
  title: string;
  /** SF Symbol name used on iOS. */
  systemImage?: string;
  axisBehavior?: DuoToolbarItemAxisBehavior;
  /** Controls which items remain visible when UIKit needs to compress the bar. */
  visibilityPriority?: 'low' | 'standard' | 'high';
  disabled?: boolean;
  selected?: boolean;
}

export type DuoVerticalBarBehavior = 'automatic' | 'disabled';
export type DuoVerticalBarCompression =
  'automatic' | 'preferBarItems' | 'preferTabBar';

export interface DuoToolbarState {
  native: boolean;
  verticalBarEdge: DuoVerticalBarEdge;
  isVertical: boolean;
}

export interface DuoAdaptiveToolbarProps {
  children: ReactNode;
  items: DuoToolbarItem[];
  title?: string;
  verticalBehavior?: DuoVerticalBarBehavior;
  compressionBehavior?: DuoVerticalBarCompression;
  showsNavigationBar?: boolean;
  onItemPress?: (id: string) => void;
  onStateChange?: (state: DuoToolbarState) => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export type DuoSceneAccessoryKind = 'externalDisplay' | 'cameraCapture';

export interface DuoSceneAccessoryContent {
  title: string;
  subtitle?: string;
  systemImage?: string;
  backgroundColor?: string;
  foregroundColor?: string;
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
  forwardCameraIds: string[];
  backwardCameraIds: string[];
  deviceId: string | null;
  deviceName: string | null;
  smartFraming: DuoSmartFramingState;
  error: string | null;
}

export interface DuoCameraViewProps {
  /** Physical camera location. Ignored when direction is set. */
  location?: DuoCameraLocation;
  /** Select whichever Duo camera currently faces this direction relative to the view. */
  direction?: DuoCameraDirection;
  active?: boolean;
  /** Set to true in direct response to a user action to request camera permission. */
  requestPermission?: boolean;
  mirrored?: boolean;
  resizeMode?: 'cover' | 'contain';
  /** Monitor recommendations, or also apply the recommended aspect ratio and zoom. */
  smartFraming?: DuoSmartFramingMode;
  onStateChange?: (state: DuoCameraViewState) => void;
  style?: StyleProp<ViewStyle>;
}
