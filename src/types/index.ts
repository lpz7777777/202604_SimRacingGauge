export interface TrackPoint {
  lat: number;
  lon: number;
  timestamp: Date;
  speed: number;
  altitude?: number;
  heading?: number;
  distanceFromStart?: number;
}

export interface StartLine {
  lat: number;
  lon: number;
  heading: number;
  pointIndex: number;
  halfWidth: number;
}

export interface Sector {
  sectorNum: number;
  startTime: Date;
  endTime: Date;
  time: number;
  distance: number;
}

export interface LapData {
  lapNumber: number;
  startTime: Date;
  endTime: Date;
  lapTime: number;
  lapPoints: TrackPoint[];
  sectors: Sector[];
  isBestLap: boolean;
}

export interface SessionData {
  videoPath: string;
  gpxPoints: TrackPoint[];
  laps: LapData[];
  startLine: StartLine | null;
  timeOffset: number;
  bestLapIndex: number;
}

export interface OverlayConfig {
  showTrackMap: boolean;
  showSpeed: boolean;
  showAccel: boolean;
  showLapTimer: boolean;
  trackMapPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  trackMapSize: number;
  gaugeScale: number;
}

export interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export type TabKey = 'track-analysis' | 'video-overlay';
