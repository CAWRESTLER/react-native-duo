import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeDuoArrangementProps extends ViewProps {
  arrangement?: string;
  axes?: string;
  primaryFraction?: CodegenTypes.Double;
  overlayEdge?: string;
  animated?: boolean;
  onStateChange?: CodegenTypes.DirectEventHandler<
    Readonly<{ payload: string }>
  >;
}

export default codegenNativeComponent<NativeDuoArrangementProps>(
  'RNDuoArrangementView'
);
