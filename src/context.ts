import { createContext } from 'react';

import type { DuoEnvironment } from './types';

export const defaultDuoEnvironment: DuoEnvironment = {
  supportsDuoApis: false,
  isDuo: false,
  platform: 'unknown',
  hinge: {
    available: false,
    status: 'unavailable',
    angleRadians: null,
    angleDegrees: null,
  },
  reservedRegions: [],
  verticalBarEdge: 'unavailable',
  cameras: [],
  window: {
    width: 0,
    height: 0,
    scale: 1,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  },
};

export const DuoContext = createContext<DuoEnvironment>(defaultDuoEnvironment);
