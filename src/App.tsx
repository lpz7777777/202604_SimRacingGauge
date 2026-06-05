import { Tabs, ConfigProvider, theme } from 'antd';
import { EnvironmentOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useAppStore } from './store/appStore';
import ImportPanel from './components/Import/ImportPanel';
import TrackAnalysisTab from './components/TrackAnalysis/TrackAnalysisTab';
import VideoOverlayTab from './components/VideoOverlay/VideoOverlayTab';
import 'leaflet/dist/leaflet.css';

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const videoPath = useAppStore((s) => s.videoPath);

  const dataLoaded = gpxPoints.length > 0;
  const videoLoaded = videoPath !== '';

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#1890ff', borderRadius: 6 },
      }}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#141414' }}>
        <ImportPanel />
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'track-analysis' | 'video-overlay')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px' }}
          items={[
            {
              key: 'track-analysis',
              label: (
                <span>
                  <EnvironmentOutlined /> 赛道分析
                </span>
              ),
              disabled: !dataLoaded,
              children: <TrackAnalysisTab />,
            },
            {
              key: 'video-overlay',
              label: (
                <span>
                  <VideoCameraOutlined /> 视频仪表
                </span>
              ),
              disabled: !dataLoaded || !videoLoaded,
              children: <VideoOverlayTab />,
            },
          ]}
        />
      </div>
    </ConfigProvider>
  );
}
