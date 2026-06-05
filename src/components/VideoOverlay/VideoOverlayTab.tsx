import { useEffect } from 'react';
import { DatePicker, Alert } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useAppStore } from '../../store/appStore';
import VideoPlayer from './VideoPlayer';
import OverlayCanvas from './OverlayCanvas';
import TimeSync from './TimeSync';
import OverlaySettings from './OverlaySettings';

export default function VideoOverlayTab() {
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const videoPath = useAppStore((s) => s.videoPath);
  const videoStartTime = useAppStore((s) => s.videoStartTime);
  const setVideoStartTime = useAppStore((s) => s.setVideoStartTime);
  const videoUrl = useAppStore((s) => s.videoUrl);

  useEffect(() => {
    if (!videoStartTime && gpxPoints.length > 0) {
      setVideoStartTime(gpxPoints[0].timestamp);
    }
  }, [gpxPoints, videoStartTime, setVideoStartTime]);

  if (gpxPoints.length === 0 || !videoPath) {
    return (
      <Alert
        message="请先导入视频和GPX文件"
        type="info"
        style={{ margin: 16 }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <VideoPlayer />
          <OverlayCanvas />
        </div>
      </div>
      <div
        style={{
          width: 300,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #303030',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#aaa', marginRight: 8 }}>视频起始时间:</span>
            <DatePicker
              showTime
              size="small"
              value={videoStartTime ? dayjs(videoStartTime) : null}
              onChange={(d: Dayjs | null) => setVideoStartTime(d?.toDate() || null)}
              placeholder="选择视频录制起始时间"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <TimeSync />
        <OverlaySettings />
      </div>
    </div>
  );
}
