# Sim Racing Gauge

卡丁车赛道数据分析与视频仪表叠加系统。导入车载视频和 GPX 格式 GPS 数据，自动分析赛道表现，在视频上叠加实时仪表。

## 功能概览

### 选项卡 1：赛道分析

| 功能 | 说明 | 状态 |
|------|------|------|
| GPX 数据导入 | 解析 `.gpx` 文件，提取轨迹点、时间戳、速度、海拔 | 已完成 |
| GPS 速度计算 | 若 GPX 无速度字段，自动通过相邻点距离/时间差计算并平滑 | 已完成 |
| 卫星地图轨迹显示 | Leaflet + OpenStreetMap 瓦片地图上绘制完整轨迹 | 已完成 |
| 速度热力图 | 轨迹颜色按速度映射（蓝→绿→黄→红） | 已完成 |
| 起跑线选择 | 用户点击轨迹设定起跑线位置 | 待修复 |
| 圈速计算 | 起跑线穿越检测算法，自动分割各圈 | 已完成 |
| 扇区分析 | 每圈分为 3 个扇区，计算各扇区用时 | 已完成 |
| 圈速表格 | 显示各圈时间、扇区时间、最佳圈标记、与最佳圈差距 | 已完成 |
| 遥测图表 | 最佳圈速度-距离曲线（Recharts） | 已完成 |
| AI 驾驶建议 | 调用 OpenAI Compatible API（默认 GLM-5.1），流式返回分析建议 | 已完成 |

### 选项卡 2：视频仪表叠加

| 功能 | 说明 | 状态 |
|------|------|------|
| 视频播放器 | 播放/暂停、进度条拖拽、±5秒快进快退 | 已完成 |
| 赛道小地图 | 右下角显示赛道缩略图 + 车辆当前位置指示 | 待修复 |
| 速度表 | 圆弧仪表盘，实时显示当前 GPS 速度 | 待修复 |
| 加速度表 | 纵向（加减速）和横向（转向）加速度条形图 | 待修复 |
| 圈速计时器 | 顶部居中显示当前圈用时 | 待修复 |
| GPS-视频时间同步 | 滑块 + 精确输入调节偏移量（±0.01秒精度） | 已完成 |
| 仪表开关设置 | 可分别开关各仪表、调节位置和缩放 | 已完成 |
| 视频起始时间设置 | 通过 DatePicker 指定视频录制起始时间，对齐 GPS 时间轴 | 已完成 |

### 额外功能（计划中）

| 功能 | 说明 |
|------|------|
| 制动点/加速点标注 | 自动检测大幅减速/加速位置并在地图上标注 |
| 数据导出 | 导出圈速 CSV、轨迹 GeoJSON |
| 带 Overlay 的视频导出 | 将叠加仪表后的视频导出为 MP4（需 FFmpeg） |
| 多圈对比回放 | 同时播放两圈的视频片段进行对比 |
| 暗色/亮色主题切换 | 已有暗色主题，计划增加亮色选项 |
| 项目保存/加载 | 保存分析项目配置，下次直接打开 |

## 技术栈

| 层面 | 技术 | 说明 |
|------|------|------|
| 框架 | **Electron 42** | Windows 桌面应用容器 |
| 前端 | **React 19 + TypeScript 6** | UI 层 |
| 构建 | **Vite 8** | 开发服务器 + 生产构建 |
| UI 库 | **Ant Design 6** | 暗色主题，表格/表单/按钮等组件 |
| 状态管理 | **Zustand 5** | 轻量全局状态 |
| 地图 | **Leaflet 1.9 + react-leaflet 5** | OpenStreetMap 瓦片 + 轨迹叠加 |
| 图表 | **Recharts 3** | 速度曲线等遥测图表 |
| 日期 | **Day.js** | 时间选择器支持 |
| AI 集成 | **OpenAI Compatible REST API** | 流式 SSE 调用，默认 GLM-5.1 |

## 项目结构

```
src/
├── types/index.ts              # TypeScript 类型定义
├── store/appStore.ts           # Zustand 全局状态管理
├── utils/
│   ├── gpxParser.ts            # GPX XML 解析 + 速度计算 + Haversine 距离
│   ├── trackCalc.ts            # 赛道计算：航向角、起跑线穿越、圈速、扇区、加速度
│   └── aiClient.ts             # AI API 客户端（流式 SSE）+ Prompt 构造
├── components/
│   ├── Import/ImportPanel.tsx   # 顶部文件导入面板
│   ├── TrackAnalysis/
│   │   ├── TrackAnalysisTab.tsx # 选项卡1 主布局
│   │   ├── TrackMap.tsx         # Leaflet 地图 + 速度热力轨迹 + 起跑线
│   │   ├── LapTable.tsx         # 圈速 + 扇区表格
│   │   ├── TelemetryCharts.tsx  # 速度-距离遥测图表
│   │   └── AIAdvisor.tsx        # AI 分析面板（配置 + 流式输出）
│   └── VideoOverlay/
│       ├── VideoOverlayTab.tsx  # 选项卡2 主布局
│       ├── VideoPlayer.tsx      # HTML5 视频播放器
│       ├── OverlayCanvas.tsx    # Canvas 仪表叠加层（小地图/速度/加速度/圈速）
│       ├── TimeSync.tsx         # GPS-视频时间偏移调节器
│       └── OverlaySettings.tsx  # 仪表开关和设置面板
├── App.tsx                      # 根组件（暗色主题 + 双选项卡）
├── main.tsx                     # 入口
├── index.css                    # 全局样式
└── electron.d.ts               # Electron API 类型声明
electron/
├── main.js                      # Electron 主进程（窗口 + 文件对话框 IPC）
└── preload.js                   # Context Bridge（安全暴露文件操作 API）
```

## 核心算法

### GPX 数据处理
- `gpxParser.ts`：XML DOM 解析 → 提取 trkpt → 速度插值计算（距离/时间差）→ 3点滑动平均平滑

### 起跑线穿越检测
- `trackCalc.ts` → `detectLapCrossings()`：用户点击轨迹选择起点，生成垂直于轨迹方向的虚拟起跑线，遍历所有 GPS 点，检测距离起跑线小于阈值的穿越事件，过滤过于密集的重复穿越（最小间隔 > 10 个点）

### 圈速 & 扇区分析
- `calculateLaps()`：基于穿越事件的时间戳差计算每圈用时
- `calculateSectors()`：将每圈轨迹均分为 N 段，分别计时

### 加速度计算
- `calculateAcceleration()`：纵向加速度 = 速度变化率；横向加速度 = 速度 × 航向角变化率

### GPS-视频时间同步
- 用户设定视频录制起始时间（DatePicker）
- 视频播放时的当前时间 = `videoStartTime + video.currentTime + timeOffset`
- 在 GPS 点序列中查找时间最接近的点获取实时位置和速度

### AI 分析
- `aiClient.ts`：构造包含赛道长度、最高/平均速度、各圈圈速、扇区时间的 Prompt
- 流式 SSE 调用 OpenAI Compatible API，实时显示 AI 回复

## 运行方式

```bash
# 安装依赖
npm install

# 浏览器开发模式（推荐）
npm run dev
# 访问 http://127.0.0.1:5173/

# 生产构建
npm run build

# Electron 桌面应用模式（需先构建）
npm run electron:dev
```

## 使用流程

1. 点击顶部 **"导入GPX"** 按钮，选择 `.gpx` 文件
2. 切换到 **"赛道分析"** 选项卡，查看轨迹图
3. 点击轨迹上的起点位置设定 **起跑线**，自动计算各圈圈速
4. 查看圈速表格和遥测图表，点击 **"分析"** 按钮获取 AI 建议
5. 点击顶部 **"导入视频"** 按钮，选择视频文件
6. 切换到 **"视频仪表"** 选项卡
7. 在右侧设置 **视频起始时间**（对齐 GPS 时间轴）
8. 使用 **时间偏移** 滑块微调同步
9. 在 **仪表设置** 中开关和调整各仪表显示
