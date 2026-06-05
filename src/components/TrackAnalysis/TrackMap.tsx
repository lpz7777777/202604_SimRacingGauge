import { useEffect } from 'react';
import { useMapEvents, MapContainer, TileLayer, Polyline, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useAppStore } from '../../store/appStore';
import {
  getStartLineFromPoint, detectLapCrossings, calculateLaps,
  speedToColor, perpendicularPoint,
  detectBrakeEvents, detectAccelEvents,
} from '../../utils/trackCalc';
import { haversineDistance } from '../../utils/gpxParser';
import type { TrackPoint } from '../../types';

const LAP_COLORS = ['#1890ff', '#ff4d4f', '#52c41a'];

function MapBounds({ points }: { points: TrackPoint[] }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (points.length === 0) return;
    const latlngs = points.map((p) => L.latLng(p.lat, p.lon));
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

function StartLineClickHandler() {
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const startLineHalfWidth = useAppStore((s) => s.startLineHalfWidth);
  const startLineHeading = useAppStore((s) => s.startLineHeading);
  const setStartLine = useAppStore((s) => s.setStartLine);
  const setLaps = useAppStore((s) => s.setLaps);

  useMapEvents({
    click(e) {
      if (gpxPoints.length === 0) return;

      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < gpxPoints.length; i++) {
        const dist = haversineDistance(e.latlng.lat, e.latlng.lng, gpxPoints[i].lat, gpxPoints[i].lon);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      if (minDist > 50) return;

      const sl = getStartLineFromPoint(gpxPoints, closestIdx, startLineHalfWidth, startLineHeading);
      setStartLine(sl);

      const crossings = detectLapCrossings(gpxPoints, sl);
      if (crossings.length >= 2) {
        const newLaps = calculateLaps(gpxPoints, crossings);
        setLaps(newLaps);
      } else {
        setLaps([]);
      }
    },
  });

  return null;
}

function SpeedColoredTrack({ points }: { points: TrackPoint[] }) {
  if (points.length < 2) return null;

  const maxSpeed = Math.max(...points.map((p) => p.speed), 1);
  const segments: { positions: [number, number][]; color: string }[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      positions: [
        [points[i].lat, points[i].lon],
        [points[i + 1].lat, points[i + 1].lon],
      ],
      color: speedToColor(points[i].speed, maxSpeed),
    });
  }

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.positions}
          pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }}
        />
      ))}
    </>
  );
}

function SelectedLapTracks() {
  const laps = useAppStore((s) => s.laps);
  const selectedLapIndices = useAppStore((s) => s.selectedLapIndices);

  if (selectedLapIndices.length === 0) return null;

  return (
    <>
      {selectedLapIndices.map((idx, li) => {
        const lap = laps[idx];
        if (!lap || lap.lapPoints.length < 2) return null;
        return (
          <Polyline
            key={`lap-${lap.lapNumber}`}
            positions={lap.lapPoints.map((p) => [p.lat, p.lon])}
            pathOptions={{
              color: LAP_COLORS[li % LAP_COLORS.length],
              weight: 3,
              opacity: 0.85,
            }}
          >
            <Tooltip permanent={false}>
              第{lap.lapNumber}圈 ({lap.lapTime.toFixed(3)}s)
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}

function BrakeAccelMarkers() {
  const laps = useAppStore((s) => s.laps);
  const selectedLapIndices = useAppStore((s) => s.selectedLapIndices);
  const showBrakeAccelMarkers = useAppStore((s) => s.showBrakeAccelMarkers);

  if (!showBrakeAccelMarkers || selectedLapIndices.length === 0) return null;

  const lap = laps[selectedLapIndices[0]];
  if (!lap) return null;

  const brakes = detectBrakeEvents(lap.lapPoints);
  const accels = detectAccelEvents(lap.lapPoints);

  const brakeIcon = new L.DivIcon({
    className: 'brake-marker',
    html: '<div style="width:10px;height:10px;background:#ff4d4f;clip-path:polygon(50% 100%, 0 0, 100% 0);"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 10],
  });

  const accelIcon = new L.DivIcon({
    className: 'accel-marker',
    html: '<div style="width:10px;height:10px;background:#52c41a;clip-path:polygon(50% 0, 0 100%, 100% 100%);"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 0],
  });

  return (
    <>
      {brakes.map((b, i) => {
        const pt = lap.lapPoints[b.index];
        return (
          <Marker
            key={`brake-${i}`}
            position={[pt.lat, pt.lon]}
            icon={brakeIcon}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              制动 {b.decel.toFixed(1)} km/h↓
            </Tooltip>
          </Marker>
        );
      })}
      {accels.map((a, i) => {
        const pt = lap.lapPoints[a.index];
        return (
          <Marker
            key={`accel-${i}`}
            position={[pt.lat, pt.lon]}
            icon={accelIcon}
          >
            <Tooltip direction="bottom" offset={[0, 8]}>
              加速 {a.accel.toFixed(1)} km/h↑
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

function StartLineVisual() {
  const startLine = useAppStore((s) => s.startLine);

  if (!startLine) return null;

  const hw = startLine.halfWidth || 10;
  const perpA = perpendicularPoint(startLine.lat, startLine.lon, startLine.heading, hw);
  const perpB = perpendicularPoint(startLine.lat, startLine.lon, (startLine.heading + 180) % 360, hw);

  return (
    <Polyline
      positions={[
        [perpA.lat, perpA.lon],
        [perpB.lat, perpB.lon],
      ]}
      pathOptions={{ color: '#ff4d4f', weight: 3, opacity: 0.9 }}
    >
      <Tooltip permanent direction="top" offset={[0, -10]}>
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Start/Finish ({hw * 2}m)</span>
      </Tooltip>
    </Polyline>
  );
}

export default function TrackMap() {
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const laps = useAppStore((s) => s.laps);
  const selectedLapIndices = useAppStore((s) => s.selectedLapIndices);
  const mapProvider = useAppStore((s) => s.mapProvider);

  const hasSelection = selectedLapIndices.length > 0;

  return (
    <MapContainer
      center={[39.9, 116.4]}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      {mapProvider === 'gaode' ? (
        <>
          <TileLayer
            url="https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6"
            subdomains={['1', '2', '3', '4']}
            attribution='&copy; 高德地图'
          />
          <TileLayer
            url="https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=2&style=8"
            subdomains={['1', '2', '3', '4']}
            opacity={0.8}
          />
        </>
      ) : (
        <>
          <TileLayer
            attribution='&copy; Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/WorldBoundariesAndPlaces/MapServer/tile/{z}/{y}/{x}"
            opacity={0.7}
          />
        </>
      )}
      <MapBounds points={gpxPoints} />
      <StartLineClickHandler />

      {!hasSelection && gpxPoints.length > 0 && <SpeedColoredTrack points={gpxPoints} />}
      {hasSelection && <SelectedLapTracks />}

      <StartLineVisual />
      <BrakeAccelMarkers />
    </MapContainer>
  );
}
