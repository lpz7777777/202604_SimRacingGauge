import { useMemo } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '../../store/appStore';
import { formatLapTime, calculateTheoreticalBest } from '../../utils/trackCalc';
import type { LapData } from '../../types';

const LAP_COLORS = ['#1890ff', '#ff4d4f', '#52c41a'];

export default function LapTable() {
  const laps = useAppStore((s) => s.laps);
  const selectedLapIndices = useAppStore((s) => s.selectedLapIndices);
  const toggleLapSelection = useAppStore((s) => s.toggleLapSelection);

  const theoretical = useMemo(() => {
    if (laps.length === 0) return null;
    return calculateTheoreticalBest(laps);
  }, [laps]);

  const columns: ColumnsType<LapData> = [
    {
      title: '圈数',
      dataIndex: 'lapNumber',
      key: 'lapNumber',
      width: 60,
      render: (n: number, record: LapData) => {
        const selIdx = selectedLapIndices.indexOf(record.lapNumber - 1);
        const color = selIdx >= 0 ? LAP_COLORS[selIdx % LAP_COLORS.length] : undefined;
        return (
          <Tag
            color={color || (record.isBestLap ? 'green' : undefined)}
            style={{ cursor: 'pointer' }}
            onClick={() => toggleLapSelection(record.lapNumber - 1)}
          >
            {n}
          </Tag>
        );
      },
    },
    {
      title: '圈速',
      dataIndex: 'lapTime',
      key: 'lapTime',
      width: 100,
      render: (t: number, record: LapData) => {
        const formatted = formatLapTime(t);
        return record.isBestLap ? (
          <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatted}</span>
        ) : (
          formatted
        );
      },
    },
    ...[1, 2, 3].map((sectorNum) => ({
      title: `扇区${sectorNum}`,
      key: `sector${sectorNum}`,
      width: 90,
      render: (_: unknown, record: LapData) => {
        const sector = record.sectors.find((s) => s.sectorNum === sectorNum);
        return sector ? formatLapTime(sector.time) : '-';
      },
    })),
    {
      title: '与最佳差距',
      key: 'gap',
      width: 100,
      render: (_: unknown, record: LapData, __: number) => {
        const best = laps.find((l) => l.isBestLap);
        if (!best || record.isBestLap) return '-';
        const gap = record.lapTime - best.lapTime;
        return <span style={{ color: '#ff4d4f' }}>+{gap.toFixed(3)}s</span>;
      },
    },
  ];

  const dataSource = useMemo(() => {
    const rows = [...laps];
    if (theoretical) {
      rows.push({
        lapNumber: -1,
        startTime: new Date(0),
        endTime: new Date(0),
        lapTime: theoretical.total,
        lapPoints: [],
        sectors: theoretical.sectors.map((s) => ({
          sectorNum: s.sectorNum,
          startTime: new Date(0),
          endTime: new Date(0),
          time: s.bestTime,
          distance: 0,
        })),
        isBestLap: false,
      });
    }
    return rows;
  }, [laps, theoretical]);

  const columnsWithBest = useMemo(() => {
    if (!theoretical) return columns;
    return columns.map((col) => ({
      ...col,
      render: (text: unknown, record: LapData, index: number) => {
        if (record.lapNumber === -1) {
          if (col.key === 'lapNumber') {
            return <Tag color="purple">最优</Tag>;
          }
          if (col.key === 'gap') return '-';
          const sectorNum = col.key === 'sector1' ? 1 : col.key === 'sector2' ? 2 : col.key === 'sector3' ? 3 : 0;
          if (sectorNum > 0) {
            const sec = theoretical.sectors.find((s) => s.sectorNum === sectorNum);
            if (sec) {
              return <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatLapTime(sec.bestTime)}</span>;
            }
          }
          const colDataIndex = 'dataIndex' in col ? col.dataIndex : undefined;
          if (col.key === undefined || colDataIndex === 'lapTime') {
            return <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatLapTime(theoretical.total)}</span>;
          }
        }
        const origCol = columns.find((c) => c.key === col.key);
        if (origCol && 'render' in origCol && origCol.render) {
          return (origCol.render as Function)(text, record, index);
        }
        return text as React.ReactNode;
      },
    }));
  }, [columns, theoretical]);

  return (
    <div style={{ padding: 8 }}>
      <Table
        dataSource={dataSource}
        columns={columnsWithBest}
        rowKey={(r) => r.lapNumber === -1 ? 'theoretical' : `lap-${r.lapNumber}`}
        size="small"
        pagination={false}
        scroll={{ y: 250 }}
        style={{ fontSize: 12 }}
        rowClassName={(r) => r.lapNumber === -1 ? 'theoretical-best-row' : ''}
      />
    </div>
  );
}
