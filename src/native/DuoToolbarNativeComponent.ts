import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeDuoToolbarProps extends ViewProps {
  itemsJson: string;
  title?: string;
  verticalBehavior?: string;
  compressionBehavior?: string;
  showsNavigationBar?: boolean;
  onItemPress?: CodegenTypes.DirectEventHandler<Readonly<{ payload: string }>>;
  onStateChange?: CodegenTypes.DirectEventHandler<
    Readonly<{ payload: string }>
  >;
}

export default codegenNativeComponent<NativeDuoToolbarProps>(
  'RNDuoToolbarView'
);
