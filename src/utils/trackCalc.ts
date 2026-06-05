import type { TrackPoint, StartLine, LapData, Sector } from '../types';
import { haversineDistance } from './gpxParser';

export function calculateHeadings(points: TrackPoint[]): TrackPoint[] {
  return points.map((p, i) => {
    if (i === 0) return { ...p, heading: 0 };
    const prev = points[i - 1];
    const heading = bearing(prev.lat, prev.lon, p.lat, p.lon);
    return { ...p, heading };
  });
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function getStartLineFromPoint(points: TrackPoint[], pointIndex: number, halfWidth: number = 10, headingOverride: number = -1): StartLine {
  const p = points[pointIndex];
  const nextIdx = Math.min(pointIndex + 1, points.length - 1);
  const autoHeading = bearing(p.lat, p.lon, points[nextIdx].lat, points[nextIdx].lon);
  const heading = headingOverride >= 0 ? headingOverride : autoHeading;
  return { lat: p.lat, lon: p.lon, heading, pointIndex, halfWidth };
}

export function detectLapCrossings(
  points: TrackPoint[],
  startLine: StartLine,
  minLapSeconds: number = 10
): { crossingIndex: number; point: TrackPoint }[] {
  const halfWidth = startLine.halfWidth || 10;
  const crossings: { crossingIndex: number; point: TrackPoint }[] = [];

  const slA = perpendicularPoint(startLine.lat, startLine.lon, startLine.heading, halfWidth);
  const slB = perpendicularPoint(startLine.lat, startLine.lon, (startLine.heading + 180) % 360, halfWidth);
  const slAx = slA.lon;
  const slAy = slA.lat;
  const slBx = slB.lon;
  const slBy = slB.lat;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const pA = { x: prev.lon, y: prev.lat };
    const pB = { x: curr.lon, y: curr.lat };

    if (!segmentsIntersect(pA.x, pA.y, pB.x, pB.y, slAx, slAy, slBx, slBy)) {
      continue;
    }

    if (crossings.length > 0) {
      const last = crossings[crossings.length - 1];
      const dt = (curr.timestamp.getTime() - last.point.timestamp.getTime()) / 1000;
      if (dt < minLapSeconds) continue;
    }

    crossings.push({ crossingIndex: i, point: curr });
  }

  return crossings;
}

function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const d1x = bx - ax;
  const d1y = by - ay;
  const d2x = dx - cx;
  const d2y = dy - cy;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-15) return false;

  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function perpendicularPoint(lat: number, lon: number, heading: number, distance: number): { lat: number; lon: number } {
  const perpHeading = (heading + 90) % 360;
  const R = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const angDist = distance / R;
  const brng = (perpHeading * Math.PI) / 180;
  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(angDist) + Math.cos(latRad) * Math.sin(angDist) * Math.cos(brng)
  );
  const newLon =
    lonRad +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(latRad),
      Math.cos(angDist) - Math.sin(latRad) * Math.sin(newLat)
    );
  return { lat: (newLat * 180) / Math.PI, lon: (newLon * 180) / Math.PI };
}

export function calculateLaps(
  points: TrackPoint[],
  crossings: { crossingIndex: number; point: TrackPoint }[]
): LapData[] {
  if (crossings.length < 2) return [];

  const laps: LapData[] = [];
  let bestTime = Infinity;

  for (let i = 0; i < crossings.length - 1; i++) {
    const start = crossings[i];
    const end = crossings[i + 1];
    const lapTime = (end.point.timestamp.getTime() - start.point.timestamp.getTime()) / 1000;
    const lapPoints = points.slice(start.crossingIndex, end.crossingIndex + 1);

    if (lapTime < bestTime) bestTime = lapTime;

    laps.push({
      lapNumber: i + 1,
      startTime: start.point.timestamp,
      endTime: end.point.timestamp,
      lapTime: Math.round(lapTime * 1000) / 1000,
      lapPoints,
      sectors: calculateSectors(lapPoints, 3),
      isBestLap: false,
    });
  }

  laps.forEach((lap) => {
    lap.isBestLap = lap.lapTime === bestTime;
  });

  return laps;
}

function calculateSectors(lapPoints: TrackPoint[], numSectors: number): Sector[] {
  const sectors: Sector[] = [];
  const sectorSize = Math.floor(lapPoints.length / numSectors);

  for (let s = 0; s < numSectors; s++) {
    const startIdx = s * sectorSize;
    const endIdx = s === numSectors - 1 ? lapPoints.length - 1 : (s + 1) * sectorSize;
    const startPt = lapPoints[startIdx];
    const endPt = lapPoints[endIdx];
    const time = (endPt.timestamp.getTime() - startPt.timestamp.getTime()) / 1000;

    let distance = 0;
    for (let i = startIdx; i < endIdx; i++) {
      distance += haversineDistance(lapPoints[i].lat, lapPoints[i].lon, lapPoints[i + 1].lat, lapPoints[i + 1].lon);
    }

    sectors.push({
      sectorNum: s + 1,
      startTime: startPt.timestamp,
      endTime: endPt.timestamp,
      time: Math.round(time * 1000) / 1000,
      distance: Math.round(distance),
    });
  }

  return sectors;
}

export function calculateAcceleration(
  points: TrackPoint[]
): { longitudinal: number; lateral: number }[] {
  return points.map((p, i) => {
    if (i === 0 || i === points.length - 1) return { longitudinal: 0, lateral: 0 };

    const prev = points[i - 1];
    const next = points[i + 1];
    const dtPrev = (p.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
    const dtNext = (next.timestamp.getTime() - p.timestamp.getTime()) / 1000;
    const dt = dtPrev + dtNext;
    if (dt <= 0) return { longitudinal: 0, lateral: 0 };

    const dv = ((next.speed - prev.speed) * 1000) / 3600;
    const longitudinal = dv / dt;

    const headingChange = ((next.heading || 0) - (prev.heading || 0) + 540) % 360 - 180;
    const avgSpeed = ((prev.speed + p.speed + next.speed) / 3) * 1000 / 3600;
    const lateral = (avgSpeed * (headingChange * Math.PI)) / 180 / dt;

    return {
      longitudinal: Math.round(longitudinal * 10) / 10,
      lateral: Math.round(lateral * 10) / 10,
    };
  });
}

export function getPointAtTime(
  points: TrackPoint[],
  targetTime: Date,
  timeOffset: number = 0
): { point: TrackPoint; index: number } | null {
  const adjustedTime = new Date(targetTime.getTime() - timeOffset * 1000);
  let closest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < points.length; i++) {
    const diff = Math.abs(points[i].timestamp.getTime() - adjustedTime.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  if (minDiff < 30000) {
    return { point: points[closest], index: closest };
  }
  return null;
}

export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function speedToColor(speed: number, maxSpeed: number): string {
  const ratio = Math.min(speed / maxSpeed, 1);
  if (ratio < 0.25) return `rgb(0, ${Math.round(ratio * 4 * 255)}, 255)`;
  if (ratio < 0.5) return `rgb(0, 255, ${Math.round((1 - (ratio - 0.25) * 4) * 255)})`;
  if (ratio < 0.75) return `rgb(${Math.round((ratio - 0.5) * 4 * 255)}, 255, 0)`;
  return `rgb(255, ${Math.round((1 - (ratio - 0.75) * 4) * 255)}, 0)`;
}

export function detectBrakeEvents(
  lapPoints: TrackPoint[],
  speedDropThreshold: number = 15,
  timeWindow: number = 2,
): { index: number; decel: number }[] {
  const events: { index: number; decel: number }[] = [];
  if (lapPoints.length < 2) return events;

  for (let i = 0; i < lapPoints.length; i++) {
    const curr = lapPoints[i];
    let futureIdx = i;
    for (let j = i + 1; j < lapPoints.length; j++) {
      const dt = (lapPoints[j].timestamp.getTime() - curr.timestamp.getTime()) / 1000;
      if (dt >= timeWindow) {
        futureIdx = j;
        break;
      }
      futureIdx = j;
    }

    const dt = (lapPoints[futureIdx].timestamp.getTime() - curr.timestamp.getTime()) / 1000;
    if (dt < 0.5) continue;

    const speedDrop = curr.speed - lapPoints[futureIdx].speed;
    if (speedDrop >= speedDropThreshold) {
      if (events.length === 0 || i - events[events.length - 1].index > 5) {
        events.push({ index: i, decel: speedDrop });
      }
    }
  }

  return events;
}

export function detectAccelEvents(
  lapPoints: TrackPoint[],
  speedRiseThreshold: number = 15,
  timeWindow: number = 2,
): { index: number; accel: number }[] {
  const events: { index: number; accel: number }[] = [];
  if (lapPoints.length < 2) return events;

  for (let i = 0; i < lapPoints.length; i++) {
    const curr = lapPoints[i];
    let futureIdx = i;
    for (let j = i + 1; j < lapPoints.length; j++) {
      const dt = (lapPoints[j].timestamp.getTime() - curr.timestamp.getTime()) / 1000;
      if (dt >= timeWindow) {
        futureIdx = j;
        break;
      }
      futureIdx = j;
    }

    const dt = (lapPoints[futureIdx].timestamp.getTime() - curr.timestamp.getTime()) / 1000;
    if (dt < 0.5) continue;

    const speedRise = lapPoints[futureIdx].speed - curr.speed;
    if (speedRise >= speedRiseThreshold) {
      if (events.length === 0 || i - events[events.length - 1].index > 5) {
        events.push({ index: i, accel: speedRise });
      }
    }
  }

  return events;
}

export function calculateTheoreticalBest(
  laps: LapData[],
): { total: number; sectors: { sectorNum: number; bestTime: number; lapNumber: number }[] } | null {
  if (laps.length === 0) return null;

  const sectorCount = Math.max(...laps.map((l) => l.sectors.length));
  const sectors: { sectorNum: number; bestTime: number; lapNumber: number }[] = [];
  let totalTime = 0;

  for (let s = 0; s < sectorCount; s++) {
    let bestTime = Infinity;
    let bestLap = 0;
    for (const lap of laps) {
      const sec = lap.sectors.find((sc) => sc.sectorNum === s + 1);
      if (sec && sec.time < bestTime) {
        bestTime = sec.time;
        bestLap = lap.lapNumber;
      }
    }
    if (bestTime < Infinity) {
      totalTime += bestTime;
      sectors.push({ sectorNum: s + 1, bestTime, lapNumber: bestLap });
    }
  }

  return { total: Math.round(totalTime * 1000) / 1000, sectors };
}
