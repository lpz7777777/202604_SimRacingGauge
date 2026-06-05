import { useState } from 'react';
import { Button, Input, Space, Typography, Card, Spin, message } from 'antd';
import { RobotOutlined, SettingOutlined, SendOutlined } from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { getAIAnalysis, buildAnalysisPrompt } from '../../utils/aiClient';
import { haversineDistance } from '../../utils/gpxParser';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function AIAdvisor() {
  const laps = useAppStore((s) => s.laps);
  const gpxPoints = useAppStore((s) => s.gpxPoints);
  const aiConfig = useAppStore((s) => s.aiConfig);
  const aiResponse = useAppStore((s) => s.aiResponse);
  const aiLoading = useAppStore((s) => s.aiLoading);
  const setAIConfig = useAppStore((s) => s.setAIConfig);
  const setAIResponse = useAppStore((s) => s.setAIResponse);
  const setAILoading = useAppStore((s) => s.setAILoading);
  const [showConfig, setShowConfig] = useState(false);

  const handleAnalyze = async () => {
    if (!aiConfig.apiKey) {
      message.warning('请先配置 API Key');
      setShowConfig(true);
      return;
    }

    const lapSummary = laps.map((l) => ({
      lapNumber: l.lapNumber,
      lapTime: l.lapTime,
      isBestLap: l.isBestLap,
      sectors: l.sectors.map((s) => ({ sectorNum: s.sectorNum, time: s.time })),
    }));

    let trackLength = 0;
    const bestLap = laps.find((l) => l.isBestLap) || laps[0];
    for (let i = 0; i < bestLap.lapPoints.length - 1; i++) {
      trackLength += haversineDistance(
        bestLap.lapPoints[i].lat,
        bestLap.lapPoints[i].lon,
        bestLap.lapPoints[i + 1].lat,
        bestLap.lapPoints[i + 1].lon
      );
    }

    const maxSpeed = Math.max(...gpxPoints.map((p) => p.speed));
    const avgSpeed = gpxPoints.reduce((sum, p) => sum + p.speed, 0) / gpxPoints.length;

    const prompt = buildAnalysisPrompt(lapSummary, trackLength, maxSpeed, avgSpeed);

    setAILoading(true);
    setAIResponse('');

    try {
      await getAIAnalysis(aiConfig, prompt, (text) => {
        setAIResponse(text);
      });
    } catch (err) {
      message.error(`AI分析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setAILoading(false);
    }
  };

  return (
    <div style={{ padding: 8 }}>
      <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
        <Text strong>
          <RobotOutlined /> AI 驾驶建议
        </Text>
        <Space>
          <Button
            icon={<SettingOutlined />}
            size="small"
            onClick={() => setShowConfig(!showConfig)}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            size="small"
            loading={aiLoading}
            onClick={handleAnalyze}
            disabled={laps.length === 0}
          >
            分析
          </Button>
        </Space>
      </Space>

      {showConfig && (
        <Card size="small" style={{ marginBottom: 8, background: '#1a1a1a' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="API URL"
              value={aiConfig.apiUrl}
              onChange={(e) => setAIConfig({ apiUrl: e.target.value })}
              size="small"
            />
            <Input.Password
              placeholder="API Key"
              value={aiConfig.apiKey}
              onChange={(e) => setAIConfig({ apiKey: e.target.value })}
              size="small"
            />
            <Input
              placeholder="Model"
              value={aiConfig.model}
              onChange={(e) => setAIConfig({ model: e.target.value })}
              size="small"
            />
          </Space>
        </Card>
      )}

      {(aiLoading || aiResponse) && (
        <Card
          size="small"
          style={{ background: '#0d1117', maxHeight: 300, overflow: 'auto' }}
        >
          {aiLoading && !aiResponse && <Spin size="small" />}
          <Paragraph
            style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#d4d4d4', margin: 0 }}
          >
            {aiResponse}
          </Paragraph>
        </Card>
      )}
    </div>
  );
}
