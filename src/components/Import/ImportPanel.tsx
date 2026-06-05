import { Button, Space, Tag, Typography, Select, InputNumber } from 'antd';
import {
  VideoCameraOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { parseGpxFile } from '../../utils/gpxParser';
import { calculateHeadings } from '../../utils/trackCalc';

const { Text } = Typography;

const FREQ_OPTIONS = [
  { value: 0, label: '自动检测' },
  { value: 1, label: '1 Hz' },
  { value: 5, label: '5 Hz' },
  { value: 10, label: '10 Hz' },
  { value: 25, label: '25 Hz' },
];

export default function ImportPanel() {
  const videoPath = useAppStore((s) => s.videoPath);
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const gpsFrequency = useAppStore((s) => s.gpsFrequency);
  const startLineHalfWidth = useAppStore((s) => s.startLineHalfWidth);
  const startLineHeading = useAppStore((s) => s.startLineHeading);
  const setVideoFile = useAppStore((s) => s.setVideoFile);
  const setGpxPoints = useAppStore((s) => s.setGpxPoints);
  const setGpsFrequency = useAppStore((s) => s.setGpsFrequency);
  const setStartLineHalfWidth = useAppStore((s) => s.setStartLineHalfWidth);
  const setStartLineHeading = useAppStore((s) => s.setStartLineHeading);
  const recalculateSpeeds = useAppStore((s) => s.recalculateSpeeds);
  const reset = useAppStore((s) => s.reset);

  const handleImportVideo = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openVideo();
      if (filePath) {
        setVideoFile(filePath, `file:///${filePath.replace(/\\/g, '/')}`);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setVideoFile(file.name, url);
        }
      };
      input.click();
    }
  };

  const handleImportGpx = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openGpx();
      if (filePath) {
        const content = await window.electronAPI.readTextFile(filePath);
        processGpxContent(content);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.gpx';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            processGpxContent(ev.target?.result as string);
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  const processGpxContent = (content: string) => {
    const points = parseGpxFile(content, gpsFrequency);
    const withHeadings = calculateHeadings(points);
    setGpxPoints(withHeadings);
  };

  const handleFreqChange = (value: number) => {
    setGpsFrequency(value);
    if (gpxPoints.length > 0) {
      recalculateSpeeds();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid #303030',
        background: '#1f1f1f',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <Space size="middle" wrap>
        <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
          Sim Racing Gauge
        </Text>
        <Button icon={<VideoCameraOutlined />} onClick={handleImportVideo} size="small">
          导入视频
        </Button>
        <Button icon={<FileTextOutlined />} onClick={handleImportGpx} size="small">
          导入GPX
        </Button>
        {gpxPoints.length > 0 && (
          <>
            <Space size={4}>
              <Text style={{ fontSize: 12, color: '#888' }}>GPS频率:</Text>
              <Select
                size="small"
                value={gpsFrequency}
                onChange={handleFreqChange}
                options={FREQ_OPTIONS}
                style={{ width: 100 }}
              />
            </Space>
            <Space size={4}>
              <Text style={{ fontSize: 12, color: '#888' }}>起跑线宽度:</Text>
              <InputNumber
                size="small"
                min={5}
                max={100}
                step={5}
                value={startLineHalfWidth}
                onChange={(v) => v != null && setStartLineHalfWidth(v)}
                style={{ width: 70 }}
                addonAfter="m"
              />
            </Space>
            <Space size={4}>
              <Text style={{ fontSize: 12, color: '#888' }}>方向:</Text>
              <InputNumber
                size="small"
                min={-1}
                max={360}
                step={1}
                value={startLineHeading}
                onChange={(v) => v != null && setStartLineHeading(v)}
                style={{ width: 80 }}
                addonAfter="deg"
                placeholder="-1=自动"
              />
            </Space>
          </>
        )}
        {(videoPath || gpxPoints.length > 0) && (
          <Button icon={<ReloadOutlined />} onClick={reset} size="small" danger>
            重置
          </Button>
        )}
      </Space>
      <Space size="middle">
        {videoPath && (
          <Tag color="blue" icon={<VideoCameraOutlined />}>
            {videoPath.split(/[/\\]/).pop()}
          </Tag>
        )}
        {gpxPoints.length > 0 && (
          <Tag color="green" icon={<FileTextOutlined />}>
            {gpxPoints.length} GPS点
          </Tag>
        )}
        {!videoPath && gpxPoints.length === 0 && (
          <Text type="secondary">请导入视频和GPX数据文件</Text>
        )}
      </Space>
    </div>
  );
}
