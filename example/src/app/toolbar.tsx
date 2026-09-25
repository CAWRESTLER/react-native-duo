import {
  type DuoVerticalBarBehavior,
  type DuoVerticalBarCompression,
} from '@cawrestler/react-native-duo';

import { useDemoToolbar } from '../components/demo-shell';
import {
  BulletList,
  Card,
  Choice,
  CodeSample,
  ComponentIntro,
  DemoScreen,
  Hero,
  Metric,
  Pill,
  PropReference,
  Toggle,
} from '../components/demo-ui';

const toolbarProps = [
  {
    name: 'children',
    type: 'ReactNode',
    description: 'The app content hosted by the native navigation controller.',
  },
  {
    name: 'items',
    type: 'DuoToolbarItem[]',
    description: 'Buttons rendered by UIKit or the horizontal fallback.',
  },
  {
    name: 'title',
    type: 'string',
    description: 'Navigation title used when the navigation bar is visible.',
  },
  {
    name: 'verticalBehavior',
    type: "'automatic' | 'disabled'",
    description: 'Lets UIKit adapt the bar vertically or explicitly opts out.',
    defaultValue: 'automatic',
  },
  {
    name: 'compressionBehavior',
    type: "'automatic' | 'preferBarItems' | 'preferTabBar'",
    description: 'Chooses which controls UIKit should preserve under pressure.',
    defaultValue: 'automatic',
  },
  {
    name: 'showsNavigationBar',
    type: 'boolean',
    description: 'Shows the navigation title bar above the hosted content.',
    defaultValue: 'true',
  },
  {
    name: 'onItemPress',
    type: '(id: string) => void',
    description: 'Receives the id of the selected toolbar item.',
  },
  {
    name: 'onStateChange',
    type: '(state: DuoToolbarState) => void',
    description:
      'Reports native/fallback mode, vertical state, and active edge.',
  },
  {
    name: 'style / contentStyle',
    type: 'StyleProp<ViewStyle>',
    description:
      'Styles the native host and the content wrapper independently.',
  },
] as const;

export default function ToolbarScreen() {
  const toolbar = useDemoToolbar();

  return (
    <DemoScreen>
      <Hero
        body="This whole demo is hosted by DuoAdaptiveToolbar. Change the controls below and watch the live navigation rail respond."
        eyebrow="ADAPTIVE TOOLBAR LAB"
        title="A real UIKit vertical bar"
      />

      <ComponentIntro
        fallback="Horizontal React Native toolbar"
        name="DuoAdaptiveToolbar"
        native="UINavigationController + vertical bar APIs"
        summary="Wraps an entire React Native surface in UIKit so the system—not a screen-size heuristic—decides when controls belong on a vertical edge."
        useFor="App navigation and primary actions"
      />

      <Card title="Try every behavior">
        <Choice<DuoVerticalBarBehavior>
          label="Vertical behavior"
          onChange={toolbar.setVerticalBehavior}
          options={['automatic', 'disabled']}
          value={toolbar.verticalBehavior}
        />
        <Choice<DuoVerticalBarCompression>
          label="Compression"
          onChange={toolbar.setCompressionBehavior}
          options={['automatic', 'preferBarItems', 'preferTabBar']}
          value={toolbar.compressionBehavior}
        />
        <Toggle
          label="Show navigation title"
          onChange={toolbar.setShowsNavigationBar}
          value={toolbar.showsNavigationBar}
        />
      </Card>

      <Card title="Live native result">
        <Pill
          label={toolbar.state.native ? 'native UIKit toolbar' : 'RN fallback'}
          tone={toolbar.state.native ? 'good' : 'neutral'}
        />
        <Metric
          label="Current shape"
          value={toolbar.state.isVertical ? 'Vertical' : 'Horizontal'}
        />
        <Metric label="Vertical edge" value={toolbar.state.verticalBarEdge} />
      </Card>

      <Card title="Each item can control">
        <BulletList
          items={[
            'systemImage: the SF Symbol displayed by UIKit.',
            'axisBehavior: automatic, horizontalOnly, or verticalPreferred.',
            'visibilityPriority: low, standard, or high when space is tight.',
            'disabled and selected: normal button state controlled from React.',
          ]}
        />
      </Card>

      <Card title="Complete prop reference">
        <PropReference rows={toolbarProps} />
      </Card>

      <Card title="Copy this pattern">
        <CodeSample>{`<DuoAdaptiveToolbar
  title="Project"
  verticalBehavior="${toolbar.verticalBehavior}"
  compressionBehavior="${toolbar.compressionBehavior}"
  showsNavigationBar={${toolbar.showsNavigationBar}}
  items={[
    {
      id: 'library',
      title: 'Library',
      systemImage: 'books.vertical',
      axisBehavior: 'verticalPreferred',
      visibilityPriority: 'high',
    },
  ]}
  onItemPress={(id) => navigate(id)}
  onStateChange={setToolbarState}
>
  <AppContent />
</DuoAdaptiveToolbar>`}</CodeSample>
      </Card>
    </DemoScreen>
  );
}
