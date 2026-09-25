import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeDuoSceneAccessoryProps extends ViewProps {
  kind: string;
  contentJson: string;
  enabled?: boolean;
  onStateChange?: CodegenTypes.DirectEventHandler<
    Readonly<{ payload: string }>
  >;
}

export default codegenNativeComponent<NativeDuoSceneAccessoryProps>(
  'RNDuoSceneAccessoryView'
);
