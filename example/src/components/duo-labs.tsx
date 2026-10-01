import { useState } from 'react';

import { DuoShell, type LabId } from '@/components/duo-shell';
import { AdaptiveBarsLab } from '@/components/labs/adaptive-bars-lab';
import { ArrangementsLab } from '@/components/labs/arrangements-lab';
import { CameraLab } from '@/components/labs/camera-lab';
import { HingeLab } from '@/components/labs/hinge-lab';
import { OverviewLab } from '@/components/labs/overview-lab';
import { RegionsLab } from '@/components/labs/regions-lab';
import { ScenesLab } from '@/components/labs/scenes-lab';

export function DuoLabApp() {
  const [selected, setSelected] = useState<LabId>('overview');

  return (
    <DuoShell onSelect={setSelected} selected={selected}>
      {selected === 'overview' ? <OverviewLab /> : null}
      {selected === 'hinge' ? <HingeLab /> : null}
      {selected === 'regions' ? <RegionsLab /> : null}
      {selected === 'arrangements' ? <ArrangementsLab /> : null}
      {selected === 'bars' ? <AdaptiveBarsLab /> : null}
      {selected === 'scenes' ? <ScenesLab /> : null}
      {selected === 'camera' ? <CameraLab /> : null}
    </DuoShell>
  );
}
