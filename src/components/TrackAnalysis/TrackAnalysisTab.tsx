import { Alert, Checkbox, Radio } from 'antd';
import TrackMap from './TrackMap';
import LapTable from './LapTable';
import TelemetryCharts from './TelemetryCharts';
import AIAdvisor from './AIAdvisor';
import { useAppStore } from '../../store/appStore';

export default function TrackAnalysisTab() {
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const startLine = useAppStore((s) => s.startLine);
  const laps = useAppStore((s) => s.laps);
  const showBrakeAccelMarkers = useAppStore((s) => s.showBrakeAccelMarkers);
  const setShowBrakeAccelMarkers = useAppStore((s) => s.setShowBrakeAccelMarkers);
  const mapProvider = useAppStore((s) => s.mapProvider);
  const setMapProvider = useAppStore((s) => s.setMapProvider);

  if (gpxPoints.length === 0) {
    return <Alert message="请先导入GPX文件" type="info" style={{ margin: 16 }} />;
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <TrackMap />
      </div>
      <div
        style={{
          width: 420,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #303030',
          overflow: 'auto',
        }}
      >
        {!startLine && (
          <Alert
            message="请点击轨迹上的一点作为起跑线位置"
            type="warning"
            style={{ margin: 8 }}
            showIcon
          />
        )}
        <div style={{ padding: '4px 8px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#888' }}>地图源:</span>
          <Radio.Group
            size="small"
            value={mapProvider}
            onChange={(e) => setMapProvider(e.target.value)}
          >
            <Radio.Button value="gaode">高德卫星</Radio.Button>
            <Radio.Button value="esri">ESRI卫星</Radio.Button>
          </Radio.Group>
          {laps.length > 0 && (
            <Checkbox
              checked={showBrakeAccelMarkers}
              onChange={(e) => setShowBrakeAccelMarkers(e.target.checked)}
            >
              制动/加速点
            </Checkbox>
          )}
        </div>
        {laps.length > 0 && <LapTable />}
        {laps.length > 0 && <TelemetryCharts />}
        {laps.length > 0 && <AIAdvisor />}
      </div>
    </div>
  );
}
