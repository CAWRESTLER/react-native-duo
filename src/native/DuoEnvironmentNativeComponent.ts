import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeDuoEnvironmentProps extends ViewProps {
  includeInactiveRegions?: boolean;
  onEnvironmentChange?: CodegenTypes.DirectEventHandler<
    Readonly<{ payload: string }>
  >;
}

export default codegenNativeComponent<NativeDuoEnvironmentProps>(
  'RNDuoEnvironmentView'
);
