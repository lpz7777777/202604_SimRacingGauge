import type { TrackPoint } from '../types';

export function parseGpxFile(fileContent: string, targetHz: number = 0): TrackPoint[] {
  const rawPoints = parseGpxXml(fileContent);
  const withSpeeds = calculateSpeeds(rawPoints, targetHz);
  return withSpeeds;
}

function parseGpxXml(xmlString: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const trkpts = doc.querySelectorAll('trkpt');
  trkpts.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lon = parseFloat(pt.getAttribute('lon') || '0');
    const timeEl = pt.querySelector('time');
    const eleEl = pt.querySelector('ele');

    if (!timeEl?.textContent) return;

    const timestamp = new Date(timeEl.textContent);
    if (isNaN(timestamp.getTime())) return;

    points.push({
      lat,
      lon,
      timestamp,
      speed: 0,
      altitude: eleEl?.textContent ? parseFloat(eleEl.textContent) : undefined,
    });
  });

  return points;
}

function detectFrequency(points: TrackPoint[]): number {
  const sampleSize = Math.min(200, points.length - 1);
  if (sampleSize < 1) return 1;

  const intervals: number[] = [];
  for (let i = 1; i <= sampleSize; i++) {
    const dt = (points[i].timestamp.getTime() - points[i - 1].timestamp.getTime()) / 1000;
    if (dt > 0 && dt < 5) {
      intervals.push(dt);
    }
  }
  if (intervals.length === 0) return 1;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  return Math.round(1 / median);
}

export function calculateSpeeds(points: TrackPoint[], targetHz: number = 0): TrackPoint[] {
  if (points.length < 2) return points;

  const rawSpeeds = points.map((p, i) => {
    if (i === 0) return { ...p, speed: 0 };

    const prev = points[i - 1];
    const dt = (p.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
    if (dt <= 0) return { ...p, speed: points[i - 1].speed || 0 };

    const dist = haversineDistance(prev.lat, prev.lon, p.lat, p.lon);
    const speedMs = dist / dt;
    const speedKmh = speedMs * 3.6;

    return { ...p, speed: Math.min(speedKmh, 200) };
  });

  const detectedHz = detectFrequency(points);
  const hz = targetHz > 0 ? targetHz : detectedHz;

  return smoothSpeeds(rawSpeeds, hz);
}

function smoothSpeeds(points: TrackPoint[], hz: number): TrackPoint[] {
  const windowSize = Math.max(5, Math.round(hz * 0.8));
  const halfWindow = Math.floor(windowSize / 2);

  const smoothed = points.map((p, i) => {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length, i + halfWindow + 1);
    const win = points.slice(start, end);

    const weights: number[] = [];
    for (let j = start; j < end; j++) {
      const dist = Math.abs(j - i);
      weights.push(1 / (1 + dist));
    }
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const avgSpeed = win.reduce((sum, pt, idx) => sum + pt.speed * weights[idx], 0) / totalWeight;

    return { ...p, speed: Math.round(avgSpeed * 10) / 10 };
  });

  return smoothed;
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
