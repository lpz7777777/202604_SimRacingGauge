import { create } from 'zustand';
import type { TrackPoint, LapData, StartLine, OverlayConfig, AIConfig, TabKey } from '../types';
import { calculateSpeeds } from '../utils/gpxParser';
import { calculateHeadings, detectLapCrossings, calculateLaps } from '../utils/trackCalc';

interface AppState {
  activeTab: TabKey;
  videoPath: string;
  videoUrl: string;
  gpxPoints: TrackPoint[];
  laps: LapData[];
  startLine: StartLine | null;
  startLineHalfWidth: number;
  startLineHeading: number;
  timeOffset: number;
  overlayConfig: OverlayConfig;
  aiConfig: AIConfig;
  isPlaying: boolean;
  currentTime: number;
  videoStartTime: Date | null;
  aiResponse: string;
  aiLoading: boolean;
  gpsFrequency: number;
  selectedLapIndices: number[];
  showBrakeAccelMarkers: boolean;
  mapProvider: 'gaode' | 'esri';

  setActiveTab: (tab: TabKey) => void;
  setVideoFile: (path: string, url: string) => void;
  setGpxPoints: (points: TrackPoint[]) => void;
  setStartLine: (startLine: StartLine | null) => void;
  setLaps: (laps: LapData[]) => void;
  setTimeOffset: (offset: number) => void;
  setOverlayConfig: (config: Partial<OverlayConfig>) => void;
  setAIConfig: (config: Partial<AIConfig>) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVideoStartTime: (time: Date | null) => void;
  setAIResponse: (response: string) => void;
  setAILoading: (loading: boolean) => void;
  setGpsFrequency: (hz: number) => void;
  setStartLineHalfWidth: (w: number) => void;
  setStartLineHeading: (h: number) => void;
  toggleLapSelection: (index: number) => void;
  clearLapSelection: () => void;
  setShowBrakeAccelMarkers: (show: boolean) => void;
  setMapProvider: (provider: 'gaode' | 'esri') => void;
  recalculateSpeeds: () => void;
  recalculateLaps: () => void;
  reset: () => void;
}

const defaultOverlayConfig: OverlayConfig = {
  showTrackMap: true,
  showSpeed: true,
  showAccel: true,
  showLapTimer: true,
  trackMapPosition: 'bottom-right',
  trackMapSize: 200,
  gaugeScale: 1,
};

const defaultAIConfig: AIConfig = {
  apiUrl: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: '',
  model: 'glm-5.1',
};

const initialState = {
  activeTab: 'track-analysis' as TabKey,
  videoPath: '',
  videoUrl: '',
  gpxPoints: [],
  laps: [],
  startLine: null,
  startLineHalfWidth: 10,
  startLineHeading: 90,
  timeOffset: 0,
  overlayConfig: defaultOverlayConfig,
  aiConfig: defaultAIConfig,
  isPlaying: false,
  currentTime: 0,
  videoStartTime: null,
  aiResponse: '',
  aiLoading: false,
  gpsFrequency: 0,
  selectedLapIndices: [],
  showBrakeAccelMarkers: false,
  mapProvider: 'gaode' as const,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setVideoFile: (path, url) => set({ videoPath: path, videoUrl: url }),
  setGpxPoints: (points) => set({ gpxPoints: points }),
  setStartLine: (startLine) => set({ startLine }),
  setLaps: (laps) => set({ laps }),
  setTimeOffset: (offset) => set({ timeOffset: offset }),
  setOverlayConfig: (config) =>
    set((state) => ({ overlayConfig: { ...state.overlayConfig, ...config } })),
  setAIConfig: (config) =>
    set((state) => ({ aiConfig: { ...state.aiConfig, ...config } })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVideoStartTime: (time) => set({ videoStartTime: time }),
  setAIResponse: (response) => set({ aiResponse: response }),
  setAILoading: (loading) => set({ aiLoading: loading }),
  setGpsFrequency: (hz) => set({ gpsFrequency: hz }),
  setStartLineHalfWidth: (w) => {
    set({ startLineHalfWidth: w });
    const state = get();
    if (state.startLine) {
      const updated = { ...state.startLine, halfWidth: w };
      set({ startLine: updated });
      get().recalculateLaps();
    }
  },
  setStartLineHeading: (h) => {
    set({ startLineHeading: h });
    const state = get();
    if (state.startLine) {
      const updated = { ...state.startLine, heading: h >= 0 ? h : state.startLine.heading };
      set({ startLine: updated });
      get().recalculateLaps();
    }
  },
  toggleLapSelection: (index) =>
    set((state) => {
      const selected = [...state.selectedLapIndices];
      const pos = selected.indexOf(index);
      if (pos >= 0) {
        selected.splice(pos, 1);
      } else if (selected.length < 3) {
        selected.push(index);
      } else {
        selected.shift();
        selected.push(index);
      }
      return { selectedLapIndices: selected };
    }),
  clearLapSelection: () => set({ selectedLapIndices: [] }),
  setShowBrakeAccelMarkers: (show) => set({ showBrakeAccelMarkers: show }),
  setMapProvider: (provider) => set({ mapProvider: provider }),
  recalculateSpeeds: () =>
    set((state) => {
      if (state.gpxPoints.length < 2) return {};
      const withSpeeds = calculateSpeeds(state.gpxPoints, state.gpsFrequency);
      const withHeadings = calculateHeadings(withSpeeds);
      return { gpxPoints: withHeadings };
    }),
  recalculateLaps: () =>
    set((state) => {
      if (!state.startLine || state.gpxPoints.length === 0) return {};
      const crossings = detectLapCrossings(state.gpxPoints, state.startLine);
      if (crossings.length >= 2) {
        const newLaps = calculateLaps(state.gpxPoints, crossings);
        const bestIdx = newLaps.findIndex((l) => l.isBestLap);
        return {
          laps: newLaps,
          selectedLapIndices: bestIdx >= 0 ? [bestIdx] : [0],
        };
      }
      return { laps: [], selectedLapIndices: [] };
    }),
  reset: () => set(initialState),
}));
