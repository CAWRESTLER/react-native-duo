import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';

import {
  DuoAdaptiveToolbar,
  type DuoVerticalBarBehavior,
  type DuoVerticalBarCompression,
  type DuoToolbarItem,
  type DuoToolbarState,
} from '@cawrestler/react-native-duo';

const initialToolbarState: DuoToolbarState = {
  native: false,
  verticalBarEdge: 'unavailable',
  isVertical: false,
};

interface ToolbarDemoContextValue {
  state: DuoToolbarState;
  verticalBehavior: DuoVerticalBarBehavior;
  setVerticalBehavior: Dispatch<SetStateAction<DuoVerticalBarBehavior>>;
  compressionBehavior: DuoVerticalBarCompression;
  setCompressionBehavior: Dispatch<SetStateAction<DuoVerticalBarCompression>>;
  showsNavigationBar: boolean;
  setShowsNavigationBar: Dispatch<SetStateAction<boolean>>;
}

const ToolbarDemoContext = createContext<ToolbarDemoContextValue | null>(null);

const destinations = [
  {
    id: 'overview',
    path: '/',
    title: 'Overview',
    systemImage: 'rectangle.2.swap',
  },
  {
    id: 'toolbar',
    path: '/toolbar',
    title: 'Toolbar',
    systemImage: 'sidebar.right',
  },
  {
    id: 'arrangement',
    path: '/arrangement',
    title: 'Layout',
    systemImage: 'rectangle.split.2x1',
  },
  { id: 'camera', path: '/camera', title: 'Camera', systemImage: 'camera' },
  { id: 'scenes', path: '/scenes', title: 'Scenes', systemImage: 'display.2' },
] as const;

export function DemoShell() {
  const pathname = usePathname();
  const router = useRouter();
  const [toolbarState, setToolbarState] = useState(initialToolbarState);
  const [verticalBehavior, setVerticalBehavior] =
    useState<DuoVerticalBarBehavior>('automatic');
  const [compressionBehavior, setCompressionBehavior] =
    useState<DuoVerticalBarCompression>('preferBarItems');
  const [showsNavigationBar, setShowsNavigationBar] = useState(false);
  const items = useMemo<DuoToolbarItem[]>(
    () =>
      destinations.map((destination) => ({
        id: destination.id,
        title: destination.title,
        systemImage: destination.systemImage,
        selected: destination.path === pathname,
        axisBehavior:
          destination.id === 'overview' ? 'horizontalOnly' : 'automatic',
        visibilityPriority: destination.id === 'overview' ? 'high' : 'standard',
      })),
    [pathname]
  );
  const context = useMemo<ToolbarDemoContextValue>(
    () => ({
      state: toolbarState,
      verticalBehavior,
      setVerticalBehavior,
      compressionBehavior,
      setCompressionBehavior,
      showsNavigationBar,
      setShowsNavigationBar,
    }),
    [compressionBehavior, showsNavigationBar, toolbarState, verticalBehavior]
  );

  return (
    <ToolbarDemoContext.Provider value={context}>
      <DuoAdaptiveToolbar
        compressionBehavior={compressionBehavior}
        items={items}
        onItemPress={(id) => {
          const destination = destinations.find(
            (candidate) => candidate.id === id
          );
          if (destination) router.replace(destination.path);
        }}
        onStateChange={setToolbarState}
        showsNavigationBar={showsNavigationBar}
        title="Duo Lab"
        verticalBehavior={verticalBehavior}
      >
        <Slot />
      </DuoAdaptiveToolbar>
    </ToolbarDemoContext.Provider>
  );
}

export function useDemoToolbarState() {
  return useDemoToolbar().state;
}

export function useDemoToolbar() {
  const context = useContext(ToolbarDemoContext);
  if (!context) {
    throw new Error('useDemoToolbar must be used inside DemoShell');
  }
  return context;
}
