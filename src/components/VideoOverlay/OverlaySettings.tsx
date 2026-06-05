import { Switch, Space, Typography, Select, Slider, InputNumber, Card } from 'antd';
import { useAppStore } from '../../store/appStore';

const { Text } = Typography;

export default function OverlaySettings() {
  const overlayConfig = useAppStore((s) => s.overlayConfig);
  const setOverlayConfig = useAppStore((s) => s.setOverlayConfig);

  return (
    <Card
      size="small"
      title="仪表设置"
      styles={{ body: { padding: '8px 12px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Space>
          <Switch
            size="small"
            checked={overlayConfig.showTrackMap}
            onChange={(v) => setOverlayConfig({ showTrackMap: v })}
          />
          <Text style={{ fontSize: 12 }}>赛道小地图</Text>
          <Select
            size="small"
            value={overlayConfig.trackMapPosition}
            onChange={(v) => setOverlayConfig({ trackMapPosition: v })}
            style={{ width: 100 }}
            options={[
              { value: 'bottom-right', label: '右下' },
              { value: 'bottom-left', label: '左下' },
              { value: 'top-right', label: '右上' },
              { value: 'top-left', label: '左上' },
            ]}
          />
        </Space>

        <Space>
          <Switch
            size="small"
            checked={overlayConfig.showSpeed}
            onChange={(v) => setOverlayConfig({ showSpeed: v })}
          />
          <Text style={{ fontSize: 12 }}>速度表</Text>
        </Space>

        <Space>
          <Switch
            size="small"
            checked={overlayConfig.showAccel}
            onChange={(v) => setOverlayConfig({ showAccel: v })}
          />
          <Text style={{ fontSize: 12 }}>加速度表</Text>
        </Space>

        <Space>
          <Switch
            size="small"
            checked={overlayConfig.showLapTimer}
            onChange={(v) => setOverlayConfig({ showLapTimer: v })}
          />
          <Text style={{ fontSize: 12 }}>圈速计时器</Text>
        </Space>

        <Space>
          <Text style={{ fontSize: 12 }}>缩放:</Text>
          <InputNumber
            size="small"
            min={0.5}
            max={2}
            step={0.1}
            value={overlayConfig.gaugeScale}
            onChange={(v) => setOverlayConfig({ gaugeScale: v || 1 })}
            style={{ width: 60 }}
          />
        </Space>
      </Space>
    </Card>
  );
}
