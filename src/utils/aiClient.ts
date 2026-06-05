import type { AIConfig } from '../types';

export async function getAIAnalysis(
  config: AIConfig,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${config.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            '你是一位专业的卡丁车赛车教练和数据分析师。请根据提供的赛道遥测数据，给出专业、实用的驾驶改进建议。请用中文回答。',
        },
        { role: 'user', content: prompt },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk?.(fullText);
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
  }

  return fullText;
}

export function buildAnalysisPrompt(
  lapSummary: { lapNumber: number; lapTime: number; isBestLap: boolean; sectors: { sectorNum: number; time: number }[] }[],
  trackLength: number,
  maxSpeed: number,
  avgSpeed: number
): string {
  const bestLap = lapSummary.find((l) => l.isBestLap);
  const lapsText = lapSummary
    .map((l) => {
      const sectorsText = l.sectors.map((s) => `  扇区${s.sectorNum}: ${s.time.toFixed(3)}秒`).join('\n');
      const marker = l.isBestLap ? ' [最佳圈]' : '';
      const diff = bestLap && !l.isBestLap ? ` (+${(l.lapTime - bestLap.lapTime).toFixed(3)}秒)` : '';
      return `第${l.lapNumber}圈: ${l.lapTime.toFixed(3)}秒${marker}${diff}\n${sectorsText}`;
    })
    .join('\n\n');

  return `请分析以下卡丁车赛道数据并给出改进建议：

## 赛道信息
- 赛道长度: 约${(trackLength / 1000).toFixed(2)}公里
- 最高速度: ${maxSpeed.toFixed(1)} km/h
- 平均速度: ${avgSpeed.toFixed(1)} km/h

## 各圈数据
${lapsText}

请从以下方面给出建议：
1. 圈速一致性分析
2. 各扇区表现分析，找出提升空间最大的扇区
3. 制动点和加速点的建议
4. 赛车线的优化建议
5. 综合改进策略`;
}
