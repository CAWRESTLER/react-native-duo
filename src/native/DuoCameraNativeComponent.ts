import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeDuoCameraProps extends ViewProps {
  location?: string;
  direction?: string;
  active?: boolean;
  requestPermission?: boolean;
  mirrored?: boolean;
  resizeMode?: string;
  smartFraming?: string;
  onStateChange?: CodegenTypes.DirectEventHandler<
    Readonly<{ payload: string }>
  >;
}

export default codegenNativeComponent<NativeDuoCameraProps>('RNDuoCameraView');
