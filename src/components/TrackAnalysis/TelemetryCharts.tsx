import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { Typography } from 'antd';
import { useAppStore } from '../../store/appStore';
import type { LapData } from '../../types';

const { Text } = Typography;

const LAP_COLORS = ['#1890ff', '#ff4d4f', '#52c41a'];

interface SpeedPoint {
  distance: number;
  [key: string]: number;
}

interface SectorBar {
  sector: string;
  [key: string]: string | number;
}

function buildSpeedData(laps: LapData[], indices: number[]): SpeedPoint[] {
  if (indices.length === 0 || laps.length === 0) return [];

  const targetLaps = indices.map((i) => laps[i]).filter(Boolean);
  const maxPoints = Math.max(...targetLaps.map((l) => l.lapPoints.length));

  const result: SpeedPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const point: SpeedPoint = { distance: Math.round((i / maxPoints) * 100) };
    targetLaps.forEach((lap) => {
      const idx = Math.min(i, lap.lapPoints.length - 1);
      point[`L${lap.lapNumber}`] = Math.round(lap.lapPoints[idx].speed * 10) / 10;
    });
    result.push(point);
  }
  return result;
}

function buildSectorData(laps: LapData[], indices: number[]): SectorBar[] {
  if (indices.length === 0 || laps.length === 0) return [];

  const targetLaps = indices.map((i) => laps[i]).filter(Boolean);
  const sectorCount = targetLaps[0]?.sectors.length || 3;

  const result: SectorBar[] = [];
  for (let s = 0; s < sectorCount; s++) {
    const row: SectorBar = { sector: `扇区${s + 1}` };
    targetLaps.forEach((lap) => {
      const sector = lap.sectors.find((sec) => sec.sectorNum === s + 1);
      row[`L${lap.lapNumber}`] = sector ? sector.time : 0;
    });
    result.push(row);
  }
  return result;
}

export default function TelemetryCharts() {
  const laps = useAppStore((s) => s.laps);
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const selectedLapIndices = useAppStore((s) => s.selectedLapIndices);

  const maxSpeed = useMemo(() => {
    return Math.max(...gpxPoints.map((p) => p.speed), 1);
  }, [gpxPoints]);

  const speedData = useMemo(
    () => buildSpeedData(laps, selectedLapIndices),
    [laps, selectedLapIndices],
  );

  const sectorData = useMemo(
    () => buildSectorData(laps, selectedLapIndices),
    [laps, selectedLapIndices],
  );

  const selectedLaps = useMemo(
    () => selectedLapIndices.map((i) => laps[i]).filter(Boolean),
    [laps, selectedLapIndices],
  );

  if (selectedLapIndices.length === 0 || laps.length === 0) return null;

  return (
    <div style={{ padding: 8 }}>
      {/* Speed Comparison */}
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        速度对比
      </Text>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={speedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="distance"
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke="#888"
            fontSize={10}
          />
          <YAxis
            domain={[0, Math.ceil(maxSpeed / 10) * 10 + 10]}
            stroke="#888"
            fontSize={10}
          />
          <Tooltip
            contentStyle={{ background: '#1f1f1f', border: '1px solid #444' }}
            formatter={(value) => [`${value} km/h`, '']}
            labelFormatter={(label) => `赛道位置: ${label}%`}
          />
          <Legend />
          {selectedLaps.map((lap, li) => (
            <Line
              key={lap.lapNumber}
              type="monotone"
              dataKey={`L${lap.lapNumber}`}
              stroke={LAP_COLORS[li % LAP_COLORS.length]}
              strokeWidth={2}
              dot={false}
              name={`第${lap.lapNumber}圈`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Sector Bar Chart */}
      <Text strong style={{ display: 'block', marginBottom: 8, marginTop: 16 }}>
        扇区用时对比
      </Text>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={sectorData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="sector" stroke="#888" fontSize={10} />
          <YAxis stroke="#888" fontSize={10} />
          <Tooltip
            contentStyle={{ background: '#1f1f1f', border: '1px solid #444' }}
            formatter={(value) => [`${value}s`, '']}
          />
          <Legend />
          {selectedLaps.map((lap, li) => (
            <Bar
              key={lap.lapNumber}
              dataKey={`L${lap.lapNumber}`}
              fill={LAP_COLORS[li % LAP_COLORS.length]}
              name={`第${lap.lapNumber}圈`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
