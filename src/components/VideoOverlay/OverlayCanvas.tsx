import { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { getPointAtTime, formatLapTime, calculateAcceleration } from '../../utils/trackCalc';
import type { TrackPoint } from '../../types';

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  points: TrackPoint[],
  currentPoint: TrackPoint | null,
  size: number,
) {
  const padding = 10;
  const mapSize = size - padding * 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = '#1890ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 8);
  ctx.fill();
  ctx.stroke();

  if (points.length < 2) {
    ctx.restore();
    return;
  }

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;
  const scale = Math.min(mapSize / lonRange, mapSize / latRange);

  const toX = (lon: number) => padding + ((lon - minLon) * scale + (mapSize - lonRange * scale) / 2);
  const toY = (lat: number) => padding + (mapSize - ((lat - minLat) * scale + (mapSize - latRange * scale) / 2));

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  points.forEach((p, i) => {
    const x = toX(p.lon);
    const y = toY(p.lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  if (currentPoint) {
    const x = toX(currentPoint.lon);
    const y = toY(currentPoint.lat);
    ctx.beginPath();
    ctx.fillStyle = '#ff4d4f';
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function drawSpeedGauge(
  ctx: CanvasRenderingContext2D,
  speed: number,
  maxSpeed: number,
  scale: number,
  canvasH: number,
  bottomOffset: number,
) {
  const size = 120 * scale;
  const x = 20 * scale;
  const y = canvasH - size - 20 * scale - bottomOffset;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2 - 5;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = '#303030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 8;
  ctx.arc(centerX, centerY, radius - 12, startAngle, endAngle);
  ctx.stroke();

  const speedRatio = Math.min(speed / Math.max(maxSpeed, 1), 1);
  const speedAngle = startAngle + (endAngle - startAngle) * speedRatio;
  ctx.beginPath();
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, '#52c41a');
  gradient.addColorStop(0.5, '#faad14');
  gradient.addColorStop(1, '#ff4d4f');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 8;
  ctx.arc(centerX, centerY, radius - 12, startAngle, speedAngle);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(24 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(speed).toString(), centerX, centerY - 5 * scale);

  ctx.fillStyle = '#888';
  ctx.font = `${Math.round(10 * scale)}px sans-serif`;
  ctx.fillText('km/h', centerX, centerY + 15 * scale);

  ctx.restore();
}

function drawAccelGauge(
  ctx: CanvasRenderingContext2D,
  longitudinal: number,
  lateral: number,
  scale: number,
  canvasH: number,
  bottomOffset: number,
) {
  const width = 100 * scale;
  const height = 80 * scale;
  const x = 20 * scale;
  const y = canvasH - height - 160 * scale - bottomOffset;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = '#303030';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 6);
  ctx.fill();
  ctx.stroke();

  const barWidth = (width - 20 * scale) / 2;
  const barHeight = height - 30 * scale;
  const barY = y + 20 * scale;

  ctx.fillStyle = '#888';
  ctx.font = `${Math.round(9 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Long', x + barWidth / 2 + 5 * scale, y + 14 * scale);
  ctx.fillText('Lat', x + barWidth + 15 * scale + barWidth / 2, y + 14 * scale);

  const longRatio = Math.min(Math.abs(longitudinal) / 10, 1);
  ctx.fillStyle = longitudinal >= 0 ? '#52c41a' : '#ff4d4f';
  const longBarH = barHeight * longRatio;
  const longBarY = longitudinal >= 0 ? barY + barHeight - longBarH : barY;
  ctx.fillRect(x + 5 * scale, longBarY, barWidth, longBarH);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(x + 5 * scale, barY, barWidth, barHeight);

  const latRatio = Math.min(Math.abs(lateral) / 10, 1);
  ctx.fillStyle = lateral >= 0 ? '#1890ff' : '#faad14';
  const latBarH = barHeight * latRatio;
  const latBarY = lateral >= 0 ? barY + barHeight - latBarH : barY;
  ctx.fillRect(x + barWidth + 15 * scale, latBarY, barWidth, latBarH);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(x + barWidth + 15 * scale, barY, barWidth, barHeight);

  ctx.restore();
}

function drawLapTimer(
  ctx: CanvasRenderingContext2D,
  currentLapTime: number | null,
  lapNumber: number | null,
  scale: number,
  canvasW: number,
) {
  const width = 140 * scale;
  const height = 36 * scale;
  const x = canvasW / 2 - width / 2;
  const y = 10 * scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.strokeStyle = '#1890ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(16 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lapText = lapNumber ? `L${lapNumber} ` : '';
  const timeText = currentLapTime !== null ? formatLapTime(currentLapTime) : '--:--.---';
  ctx.fillText(lapText + timeText, x + width / 2, y + height / 2);

  ctx.restore();
}

export default function OverlayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const timeOffset = useAppStore((s) => s.timeOffset);
  const overlayConfig = useAppStore((s) => s.overlayConfig);
  const videoStartTime = useAppStore((s) => s.videoStartTime);
  const currentTime = useAppStore((s) => s.currentTime);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const laps = useAppStore((s) => s.laps);

  const gpxPointsRef = useRef(gpxPoints);
  const timeOffsetRef = useRef(timeOffset);
  const overlayConfigRef = useRef(overlayConfig);
  const videoStartTimeRef = useRef(videoStartTime);
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const lapsRef = useRef(laps);
  const accelerationsRef = useRef<{ longitudinal: number; lateral: number }[]>([]);
  const maxSpeedRef = useRef(1);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  gpxPointsRef.current = gpxPoints;
  timeOffsetRef.current = timeOffset;
  overlayConfigRef.current = overlayConfig;
  videoStartTimeRef.current = videoStartTime;
  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;
  lapsRef.current = laps;

  useEffect(() => {
    if (gpxPoints.length > 2) {
      accelerationsRef.current = calculateAcceleration(gpxPoints);
      maxSpeedRef.current = Math.max(...gpxPoints.map((p) => p.speed), 1);
    }
  }, [gpxPoints]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        canvasSizeRef.current = { w: width, h: height };
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function getCurrentLapTime(currentPoint: TrackPoint | null): { lapTime: number | null; lapNumber: number | null } {
    const currentLaps = lapsRef.current;
    if (!currentPoint || currentLaps.length === 0) return { lapTime: null, lapNumber: null };

    for (const lap of currentLaps) {
      const startTime = lap.startTime.getTime();
      const endTime = lap.endTime.getTime();
      const ptTime = currentPoint.timestamp.getTime();
      if (ptTime >= startTime && ptTime <= endTime) {
        return {
          lapTime: (ptTime - startTime) / 1000,
          lapNumber: lap.lapNumber,
        };
      }
    }

    const lastLap = currentLaps[currentLaps.length - 1];
    if (currentPoint.timestamp.getTime() > lastLap.endTime.getTime()) {
      return {
        lapTime: (currentPoint.timestamp.getTime() - lastLap.endTime.getTime()) / 1000,
        lapNumber: lastLap.lapNumber + 1,
      };
    }

    return { lapTime: null, lapNumber: null };
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = canvasSizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const points = gpxPointsRef.current;
    const vStartTime = videoStartTimeRef.current;
    const vCurrentTime = currentTimeRef.current;
    const offset = timeOffsetRef.current;
    const config = overlayConfigRef.current;

    if (points.length === 0 || !vStartTime) {
      ctx.restore();
      animRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const videoTime = new Date(vStartTime.getTime() + vCurrentTime * 1000);
    const result = getPointAtTime(points, videoTime, offset);
    const currentPoint = result?.point || null;
    const idx = result?.index || 0;
    const scale = config.gaugeScale;
    const bottomOffset = 60;

    if (config.showTrackMap) {
      const mapSize = config.trackMapSize;
      let mapX = w - mapSize - 10;
      let mapY = h - mapSize - 10 - bottomOffset;

      if (config.trackMapPosition === 'bottom-left') mapX = 10;
      if (config.trackMapPosition === 'top-right') mapY = 10;
      if (config.trackMapPosition === 'top-left') { mapX = 10; mapY = 10; }

      ctx.save();
      ctx.translate(mapX, mapY);
      drawMiniMap(ctx, points, currentPoint, mapSize);
      ctx.restore();
    }

    if (config.showSpeed && currentPoint) {
      drawSpeedGauge(ctx, currentPoint.speed, maxSpeedRef.current, scale, h, bottomOffset);
    }

    if (config.showAccel && accelerationsRef.current[idx]) {
      drawAccelGauge(
        ctx,
        accelerationsRef.current[idx].longitudinal,
        accelerationsRef.current[idx].lateral,
        scale,
        h,
        bottomOffset,
      );
    }

    if (config.showLapTimer) {
      const { lapTime, lapNumber } = getCurrentLapTime(currentPoint);
      drawLapTimer(ctx, lapTime, lapNumber, scale, w);
    }

    ctx.restore();
    animRef.current = requestAnimationFrame(drawFrame);
  }

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
