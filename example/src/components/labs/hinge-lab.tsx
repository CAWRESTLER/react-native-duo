import Slider from '@react-native-community/slider';
import { useDuoHinge } from '@cawrestler/react-native-duo';
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import {
  BodyText,
  DemoPage,
  LabCard,
  MetricPill,
  Symbol,
  ToggleRow,
  useDuoPalette,
} from '@/components/duo-ui';

export function HingeLab() {
  const hinge = useDuoHinge();
  const palette = useDuoPalette();
  const [manualPreview, setManualPreview] = useState(false);
  const [previewAngle, setPreviewAngle] = useState(105);
  const measuredAngle = hinge.angleDegrees ?? 180;
  const displayedAngle = manualPreview ? previewAngle : measuredAngle;
  const fold = (180 - displayedAngle) / 2;
  const status = manualPreview
    ? 'Manual preview'
    : humanizeStatus(hinge.status);

  return (
    <DemoPage
      subtitle="Observe discrete state and continuous angle"
      symbol="angle"
      title="Hinge"
    >
      <LabCard
        symbol="sensor.tag.radiowaves.forward"
        title="Live hinge context"
      >
        <View style={styles.metrics}>
          <MetricPill label="Status" value={status} />
          <MetricPill
            color={palette.orange}
            label="Angle"
            value={`${displayedAngle.toFixed(1)}°`}
          />
        </View>
        <View style={styles.hingeStatus}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  hinge.available && !manualPreview
                    ? palette.green
                    : palette.secondary,
              },
              hinge.available &&
                !manualPreview && {
                  shadowColor: palette.green,
                  shadowOpacity: 0.5,
                  shadowRadius: 4,
                },
            ]}
          />
          <Text style={[styles.statusCaption, { color: palette.secondary }]}>
            {hinge.available
              ? 'Device hinge detected'
              : 'No hinge reported yet'}
          </Text>
        </View>
      </LabCard>

      <LabCard symbol="view.3d" title="Pose visualizer">
        <View collapsable={false} style={styles.visualizer}>
          <View collapsable={false} style={styles.halfSlot}>
            <View
              collapsable={false}
              style={[
                styles.half,
                styles.leftHalf,
                {
                  transformOrigin: 'right center',
                  transform: [{ perspective: 500 }, { rotateY: `${fold}deg` }],
                },
              ]}
            >
              <Symbol color="#FFFFFF" name="sparkles" size={28} />
              <Text style={styles.halfLabel}>Left</Text>
            </View>
          </View>
          <View collapsable={false} style={styles.halfSlot}>
            <View
              collapsable={false}
              style={[
                styles.half,
                styles.rightHalf,
                {
                  transformOrigin: 'left center',
                  transform: [{ perspective: 500 }, { rotateY: `${-fold}deg` }],
                },
              ]}
            >
              <Symbol color="#FFFFFF" name="sparkles" size={28} />
              <Text style={styles.halfLabel}>Right</Text>
            </View>
          </View>
        </View>
        <ToggleRow
          label="Use manual preview"
          onChange={(value) => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut
            );
            setManualPreview(value);
          }}
          value={manualPreview}
        />
        {manualPreview ? (
          <Slider
            accessibilityLabel="Preview angle"
            maximumTrackTintColor={palette.separator}
            maximumValue={180}
            minimumTrackTintColor={palette.indigo}
            minimumValue={0}
            onValueChange={setPreviewAngle}
            step={1}
            style={styles.slider}
            value={previewAngle}
          />
        ) : null}
      </LabCard>

      <LabCard symbol="info.circle" title="API behavior">
        <BodyText secondary>
          The provider reports no hinge on conventional devices. On iPhone Duo
          it reports closed, partially open, or fully open plus the continuous
          angle. Use this signal for effects and interactions; use reserved
          regions or DuoArrangementView for layout.
        </BodyText>
      </LabCard>
    </DemoPage>
  );
}

function humanizeStatus(status: string) {
  if (status === 'partiallyOpen') return 'Partially open';
  if (status === 'fullyOpen') return 'Fully open';
  if (status === 'unavailable') return 'No hinge';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: 8 },
  hingeStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  statusCaption: { flexShrink: 1, fontSize: 12, lineHeight: 15 },
  // Keep perspective transforms in their own native surfaces and clip their
  // projected drawing to this illustration instead of neighboring cards.
  visualizer: {
    height: 230,
    minHeight: 230,
    maxHeight: 230,
    flexShrink: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 4,
  },
  halfSlot: { flex: 1, minWidth: 0 },
  half: {
    flex: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  leftHalf: {
    backgroundColor: '#5856D6',
    shadowColor: '#5856D6',
    experimental_backgroundImage:
      'linear-gradient(to bottom, #7472E4, #4D4ACB)',
  },
  rightHalf: {
    backgroundColor: '#AF52DE',
    shadowColor: '#AF52DE',
    experimental_backgroundImage:
      'linear-gradient(to bottom, #BD75E6, #9842CC)',
  },
  halfLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  slider: { width: '100%', height: 36 },
});
