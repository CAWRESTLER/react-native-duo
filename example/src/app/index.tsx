import {
  useDuo,
  useDuoCameras,
  useDuoHinge,
  useDuoReservedRegions,
} from '@cawrestler/react-native-duo';

import { useDemoToolbarState } from '../components/demo-shell';
import {
  BulletList,
  Card,
  CodeSample,
  ComponentIntro,
  DemoScreen,
  EmptyState,
  Hero,
  Metric,
  Pill,
  PropReference,
} from '../components/demo-ui';

const providerProps = [
  {
    name: 'children',
    type: 'ReactNode',
    description: 'Your application tree. The provider should fill the window.',
  },
  {
    name: 'includeInactiveRegions',
    type: 'boolean',
    description: 'Includes reserved regions UIKit currently marks inactive.',
    defaultValue: 'false',
  },
  {
    name: 'onEnvironmentChange',
    type: '(environment: DuoEnvironment) => void',
    description: 'Receives the same live object exposed by useDuo().',
  },
  {
    name: 'style',
    type: 'StyleProp<ViewStyle>',
    description: 'Styles the full-window native sensor host.',
  },
] as const;

export default function OverviewScreen() {
  const duo = useDuo();
  const hinge = useDuoHinge();
  const regions = useDuoReservedRegions();
  const cameras = useDuoCameras();
  const toolbar = useDemoToolbarState();

  return (
    <DemoScreen>
      <Hero
        body="Start here for the complete package map. Every value below is live; use the edge toolbar to open an interactive lab for each component."
        eyebrow="PACKAGE CATALOG"
        title="Every Duo API, from React"
      />

      <ComponentIntro
        fallback="Stable unsupported environment object"
        name="DuoProvider"
        native="UIHingeInteraction + window capability observer"
        summary="Creates the package context, observes the current window, and keeps hinge, reserved-region, camera, toolbar-edge, safe-area, and window data in sync."
        useFor="One provider around the app root"
      />

      <Card title="Everything exported by the package">
        <BulletList
          items={[
            'DuoProvider: supplies one live DuoEnvironment to the React tree.',
            'useDuo and focused hooks: read device, hinge, region, and camera state.',
            'DuoAdaptiveToolbar: native adaptive app navigation and actions.',
            'DuoArrangementView: native split and overlay content arrangements.',
            'DuoCameraView: inner/outer preview, direction tracking, and smart framing.',
            'DuoSceneAccessory: declarative external-display or capture accessory content.',
            'defaultDuoEnvironment: complete safe state for tests and initial values.',
          ]}
        />
      </Card>

      <Card>
        <Pill
          label={
            duo.isDuo
              ? 'Duo detected'
              : duo.supportsDuoApis
                ? 'API ready · no Duo hardware'
                : 'fallback mode'
          }
          tone={
            duo.isDuo ? 'good' : duo.supportsDuoApis ? 'warning' : 'neutral'
          }
        />
        <Metric label="Duo APIs compiled" value={yesNo(duo.supportsDuoApis)} />
        <Metric label="Duo hardware detected" value={yesNo(duo.isDuo)} />
        <Metric label="Platform" value={duo.platform} />
        <Metric
          label="Window"
          value={`${round(duo.window.width)} × ${round(duo.window.height)} pt`}
        />
      </Card>

      <Card title="Adaptive toolbar">
        <Pill
          label={
            toolbar.native ? 'native UIKit toolbar' : 'React Native fallback'
          }
          tone={toolbar.native ? 'good' : 'neutral'}
        />
        <Metric
          label="Current shape"
          value={toolbar.isVertical ? 'Vertical' : 'Horizontal'}
        />
        <Metric label="Vertical edge" value={toolbar.verticalBarEdge} />
        <EmptyState>
          On Duo, UIKit decides when the toolbar moves to a vertical edge.
          Rotate, resize, or change the fold state to test it.
        </EmptyState>
      </Card>

      <Card title="Hinge">
        <Pill
          label={hinge.available ? 'live hinge' : 'not available'}
          tone={hinge.available ? 'good' : 'neutral'}
        />
        <Metric label="Hook" value="useDuoHinge()" />
        <Metric label="Status" value={hinge.status} />
        <Metric
          label="Angle"
          value={
            hinge.angleDegrees == null
              ? '—'
              : `${hinge.angleDegrees.toFixed(1)}°`
          }
        />
      </Card>

      <Card title={`Reserved regions (${regions.length})`}>
        <Metric label="Hook" value="useDuoReservedRegions()" />
        {regions.length === 0 ? (
          <EmptyState>
            No division or occlusion regions are currently reported.
          </EmptyState>
        ) : (
          regions.map((region) => (
            <Card
              key={region.id}
              title={`${region.kind} · ${region.isActive ? 'active' : 'inactive'}`}
            >
              <Metric
                label="Origin"
                value={`${round(region.frame.x)}, ${round(region.frame.y)}`}
              />
              <Metric
                label="Size"
                value={`${round(region.frame.width)} × ${round(region.frame.height)}`}
              />
            </Card>
          ))
        )}
      </Card>

      <Card title={`Duo cameras (${cameras.length})`}>
        <Metric label="Hook" value="useDuoCameras()" />
        {cameras.length === 0 ? (
          <EmptyState>
            No inner or outer Duo camera devices were discovered.
          </EmptyState>
        ) : (
          cameras.map((camera) => (
            <Card key={camera.id} title={camera.name}>
              <Metric label="Location" value={camera.location} />
              <Metric label="Position" value={camera.position} />
            </Card>
          ))
        )}
      </Card>

      <Card title="Hook selection guide">
        <PropReference
          rows={[
            {
              name: 'useDuo()',
              type: 'DuoEnvironment',
              description:
                'Read every capability when several values affect one screen.',
            },
            {
              name: 'useDuoHinge()',
              type: 'DuoHingeState',
              description: 'Read availability, fold status, and hinge angle.',
            },
            {
              name: 'useDuoReservedRegions()',
              type: 'DuoReservedRegion[]',
              description: 'Avoid active division and occlusion geometry.',
            },
            {
              name: 'useDuoCameras()',
              type: 'DuoCameraDevice[]',
              description: 'Inspect discoverable inner and outer cameras.',
            },
          ]}
        />
      </Card>

      <Card title="DuoProvider props">
        <PropReference rows={providerProps} />
      </Card>

      <Card title="Copy the root setup">
        <CodeSample>{`import {
  DuoProvider,
  useDuo,
  useDuoHinge,
} from '@cawrestler/react-native-duo';

export default function App() {
  return (
    <DuoProvider includeInactiveRegions>
      <Workspace />
    </DuoProvider>
  );
}

function Workspace() {
  const environment = useDuo();
  const hinge = useDuoHinge();

  return <YourUI isDuo={environment.isDuo} hinge={hinge} />;
}`}</CodeSample>
      </Card>
    </DemoScreen>
  );
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function round(value: number) {
  return Math.round(value);
}
