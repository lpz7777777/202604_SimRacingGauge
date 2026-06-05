import { Slider, InputNumber, Typography, Space, Card, DatePicker, Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';

const { Text } = Typography;

export default function TimeSync() {
  const timeOffset = useAppStore((s) => s.timeOffset);
  const setTimeOffset = useAppStore((s) => s.setTimeOffset);
  const videoStartTime = useAppStore((s) => s.videoStartTime);
  const setVideoStartTime = useAppStore((s) => s.setVideoStartTime);
  const gpxPoints = useAppStore((s) => s.gpxPoints);

  const gpsStartTime = gpxPoints.length > 0 ? gpxPoints[0].timestamp : null;

  const handleAutoSync = () => {
    if (gpsStartTime && !videoStartTime) {
      setVideoStartTime(new Date(gpsStartTime.getTime()));
      message.success('已将视频起始时间设为GPS起始时间');
    }
  };

  return (
    <Card
      size="small"
      title="时间同步"
      style={{ borderTop: '1px solid #303030' }}
      styles={{ body: { padding: '8px 12px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            GPS起始: {gpsStartTime ? gpsStartTime.toLocaleString() : '无数据'}
          </Text>
        </div>

        <div>
          <Text style={{ fontSize: 12 }}>时间偏移 (秒):</Text>
          <Slider
            min={-60}
            max={60}
            step={0.1}
            value={timeOffset}
            onChange={setTimeOffset}
            tooltip={{ formatter: (v) => `${v?.toFixed(1)}s` }}
          />
        </div>

        <Space>
          <Text style={{ fontSize: 12 }}>精确调节:</Text>
          <InputNumber
            size="small"
            value={timeOffset}
            onChange={(v) => setTimeOffset(v || 0)}
            step={0.01}
            min={-3600}
            max={3600}
            style={{ width: 100 }}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            秒
          </Text>
        </Space>

        <Button
          size="small"
          icon={<SyncOutlined />}
          onClick={handleAutoSync}
          disabled={!gpsStartTime}
        >
          自动对齐
        </Button>
      </Space>
    </Card>
  );
}
