import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeDuoNavigationToolbarProps extends ViewProps {
  itemsJson: string;
  active?: boolean;
  barTintColor?: string;
  compressionBehavior?: string;
  horizontalPresentation?: string;
  onItemPress?: CodegenTypes.DirectEventHandler<Readonly<{ payload: string }>>;
  onStateChange?: CodegenTypes.DirectEventHandler<
    Readonly<{ payload: string }>
  >;
}

export default codegenNativeComponent<NativeDuoNavigationToolbarProps>(
  'RNDuoNavigationToolbarView'
);
