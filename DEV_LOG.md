# Sim Racing Gauge — 开发日志

> **规则**：每次 build 模式下的修改完成后，必须在本文件末尾追加一条修改记录。

---

## 开发步骤总览

### 阶段 1：项目初始化
- [x] 1.1 使用 `npm create vite` 初始化 React + TypeScript 项目
- [x] 1.2 安装核心依赖：`antd`, `@ant-design/icons`, `zustand`, `leaflet`, `react-leaflet`, `recharts`, `dayjs`
- [x] 1.3 安装 Electron 作为桌面容器：`electron` (devDependency)
- [x] 1.4 创建目录结构：`components/`, `hooks/`, `utils/`, `store/`, `types/`, `electron/`
- [x] 1.5 配置 `vite.config.ts`（base, alias, server host 绑定）
- [x] 1.6 配置 `tsconfig.app.json`（放宽 noUnusedLocals/noUnusedParameters）

### 阶段 2：数据层 & 核心算法
- [x] 2.1 `src/types/index.ts` — 定义 TrackPoint, StartLine, LapData, SessionData, OverlayConfig, AIConfig 等类型
- [x] 2.2 `src/utils/gpxParser.ts` — GPX XML DOM 解析，提取轨迹点，速度插值计算，Haversine 距离，3点滑动平均平滑
- [x] 2.3 `src/utils/trackCalc.ts` — 航向角计算，起跑线生成，穿越检测，圈速计算，扇区分析，加速度计算，时间点查找，格式化工具
- [x] 2.4 `src/utils/aiClient.ts` — OpenAI Compatible 流式 SSE API 客户端，Prompt 构造
- [x] 2.5 `src/store/appStore.ts` — Zustand 全局状态（文件数据、圈速、偏移、仪表配置、AI 配置等）

### 阶段 3：UI 框架 & 文件导入
- [x] 3.1 `src/App.tsx` — 根组件，Ant Design 暗色主题 + 双选项卡（赛道分析 / 视频仪表）
- [x] 3.2 `src/index.css` — 全局样式，Leaflet 容器，滚动条，Ant Tabs flex 布局
- [x] 3.3 `src/main.tsx` — 入口文件
- [x] 3.4 `src/electron.d.ts` — Electron API 类型声明
- [x] 3.5 `src/components/Import/ImportPanel.tsx` — 顶部导入面板（视频/GPX 拖拽或文件对话框）

### 阶段 4：赛道分析选项卡
- [x] 4.1 `TrackAnalysisTab.tsx` — 左侧地图 + 右侧面板布局
- [x] 4.2 `TrackMap.tsx` — Leaflet 地图，速度热力图轨迹，起跑线 Marker，最佳圈虚线
- [x] 4.3 `LapTable.tsx` — Ant Design 表格，各圈/扇区/差距
- [x] 4.4 `TelemetryCharts.tsx` — Recharts 速度-距离曲线
- [x] 4.5 `AIAdvisor.tsx` — AI 配置面板 + 流式分析输出

### 阶段 5：视频仪表选项卡
- [x] 5.1 `VideoOverlayTab.tsx` — 左侧视频+叠加 + 右侧控制面板
- [x] 5.2 `VideoPlayer.tsx` — HTML5 video + 播放控制 + 进度条
- [x] 5.3 `OverlayCanvas.tsx` — Canvas 叠加层，绘制小地图/速度表/加速度表/圈速计时器
- [x] 5.4 `TimeSync.tsx` — 时间偏移调节（滑块 + 精确输入）
- [x] 5.5 `OverlaySettings.tsx` — 仪表开关、位置、缩放设置

### 阶段 6：Electron 主进程
- [x] 6.1 `electron/main.js` — BrowserWindow 创建，IPC handlers（打开视频/GPX 文件对话框，读取文本文件）
- [x] 6.2 `electron/preload.js` — contextBridge 暴露 electronAPI

### 阶段 7：调试 & 修复
- [x] 7.1 修复 TypeScript 类型错误（导入路径、图标名称、Tooltip formatter、DatePicker Dayjs 类型）
- [x] 7.2 修复 ImportPanel.tsx UTF-8 编码损坏问题
- [x] 7.3 修复 Vite dev server 无法响应请求 — 绑定 `host: '127.0.0.1'`

### 阶段 8：修复核心交互 — 起跑线选择 & 仪表叠加（最高优先级）

起跑线选择是整个赛道分析的入口，没有它就无法计算圈速；仪表叠加是视频页面的核心价值。这两个问题必须最先解决。

- [x] 8.1 调试并修复 `TrackMap.tsx` 中地图点击事件无法触发的问题。当前使用 `mapRef.current.on('click', ...)` 绑定事件，可能被 `react-leaflet` 的 `MapContainer` 或其他子组件拦截。考虑改用 `useMapEvents` hook 或在 `MapContainer` 外层添加透明 overlay div 捕获点击坐标。
- [x] 8.2 修复 `OverlayCanvas.tsx` 的 Canvas 仪表在视频播放时不更新的问题。当前 `draw` 函数依赖 `useCallback` 闭包中的 `currentTime`，但 `requestAnimationFrame` 循环中闭包可能捕获了旧值。需改用 `useRef` 存储 `currentTime` 或改用 `useEffect` + 依赖数组触发重绘。
- [x] 8.3 验证 `VideoPlayer.tsx` 的 `timeupdate` 事件是否正常触发，确认 `currentTime` 状态确实在持续更新到 store 中。

### 阶段 9：完善赛道分析功能

圈速计算可用后，围绕分析体验做增强，让用户能深入理解每一圈的表现差异。

- [x] 9.1 **多圈遥测对比**：`TelemetryCharts.tsx` 目前只显示最佳圈的速度曲线，增加一个下拉选择器，允许用户选择 2-3 圈叠加到同一张图上对比，用不同颜色区分各圈。
- [x] 9.2 **加速度曲线图**：新增加速度-距离图表（纵向 + 横向），帮助识别制动点和弯道中的横向 G 力。
- [x] 9.3 **扇区时间对比柱状图**：用 Recharts 绘制分组柱状图，X 轴为扇区编号，每个柱子代表一圈的扇区用时，快速定位哪一圈在哪个扇区表现最好/最差。
- [x] 9.4 **制动点 / 加速点自动标注**：在 `trackCalc.ts` 中新增 `detectBrakePoints()` 和 `detectAccelerationPoints()` 函数，检测速度大幅下降（>20% in <2s）和大副上升的位置，在地图上用不同图标（红色制动标记 / 绿色加速标记）标注。
- [x] 9.5 **最佳合成圈**：从所有圈中取每个扇区的最快时间，合成为一个"理论最佳圈"，在表格中显示并在遥测图中用虚线展示。

### 阶段 10：完善视频仪表叠加

仪表叠加的核心渲染正常后，提升视觉质量和交互体验。

- [ ] 10.1 **速度表视觉优化**：当前是基础圆弧 + 数字，升级为赛车风格仪表盘（刻度线、红色区域标记、指针动画过渡）。
- [ ] 10.2 **赛道小地图增强**：在地图上用不同颜色标注扇区分界点，当前位置用方向箭头代替圆点，显示已跑过的轨迹用亮色、未跑的用暗色。
- [ ] 10.3 **挡位 / 转速表**（如果 GPX 数据中有 OBD 信息则显示，否则预留位置）。
- [ ] 10.4 **仪表拖拽定位**：允许用户拖拽各仪表到视频画面的任意位置，位置保存在 `overlayConfig` 中。
- [ ] 10.5 **视频截图功能**：添加一个截图按钮，将当前帧 + overlay 合成后保存为 PNG。

### 阶段 11：数据导入/导出

让用户能够保存和分享分析结果。

- [ ] 11.1 **圈速数据导出 CSV**：在 LapTable 组件上方添加"导出 CSV"按钮，通过 `Blob` + `URL.createObjectURL` 下载包含所有圈速和扇区时间的 CSV 文件。
- [ ] 11.2 **轨迹导出 GeoJSON**：将 GPS 轨迹点和速度信息转换为 GeoJSON 格式（LineString + speed 属性），可在 QGIS 等工具中打开。
- [ ] 11.3 **项目保存/加载**：将当前会话（文件路径、起跑线位置、时间偏移、仪表配置、AI配置）序列化为 JSON 文件，下次打开直接恢复。
- [ ] 11.4 **支持批量 GPX 导入**：允许多个 GPX 文件对比不同场次的数据。

### 阶段 12：视频导出

将带仪表叠加的视频导出为独立可分享的视频文件，这是用户最期待的高价值功能。

- [ ] 12.1 **集成 FFmpeg**：在 Electron 主进程中通过 `child_process` 调用 FFmpeg（打包或下载），或使用 `fluent-ffmpeg` npm 包。
- [ ] 12.2 **逐帧渲染 + 合成**：方案一：在 Canvas 上逐帧绘制仪表叠加，用 `canvas.captureStream()` + `MediaRecorder` 录制；方案二：通过 Electron offscreen rendering 逐帧截图后用 FFmpeg 合成。需要评估性能和画质。
- [ ] 12.3 **导出进度条**：显示当前帧/总帧数的进度。
- [ ] 12.4 **导出设置面板**：允许用户选择分辨率（720p/1080p/原始）、帧率、是否包含音频。

### 阶段 13：AI 分析增强

当前 AI 功能是基础的一次性分析，增强为持续对话式交互。

- [ ] 13.1 **多轮对话模式**：将 AIAdvisor 改为聊天界面，保留历史消息，用户可以追问"我在第2弯应该怎么改进"等具体问题。
- [ ] 13.2 **上下文感知**：用户点击地图上某个位置时，自动将该位置的遥测数据（速度、加速度、前后几秒数据）注入 AI 对话上下文。
- [ ] 13.3 **多 AI 供应商支持**：在设置中允许切换不同 API endpoint（OpenAI、智谱 GLM、本地 Ollama 等），而不仅仅是单一的 API URL。
- [ ] 13.4 **分析报告导出**：将 AI 的分析结果保存为 Markdown 文件。

### 阶段 14：Electron 桌面应用完善

从开发模式走向可分发的桌面应用。

- [ ] 14.1 **自动获取 FFmpeg 路径**：在 Electron 启动时检测系统是否安装 FFmpeg，未安装则提示下载或自动附带。
- [ ] 14.2 **应用打包**：使用 `electron-builder` 或 `electron-forge` 打包为 Windows 安装程序（.exe / .msi）。
- [ ] 14.3 **应用自动更新**：集成 `electron-updater`，支持从 GitHub Releases 自动检测和安装更新。
- [ ] 14.4 **系统托盘最小化**：最小化时缩小到托盘，后台继续处理导出任务。
- [ ] 14.5 **文件关联**：注册 `.gpx` 和 `.srgproj`（项目文件）的文件关联，双击直接打开。

### 阶段 15：UI/UX 打磨

提升整体用户体验和视觉效果。

- [ ] 15.1 **亮色/暗色主题切换**：当前仅有暗色主题，增加亮色主题选项。
- [ ] 15.2 **响应式布局优化**：适应不同窗口大小，窄窗口时侧边面板自动折叠。
- [ ] 15.3 **键盘快捷键**：空格播放/暂停，←/→ 快进快退，[ ] 调节时间偏移等。
- [ ] 15.4 **加载动画和骨架屏**：GPX 解析、AI 分析等耗时操作时显示加载状态。
- [ ] 15.5 **操作引导 / Onboarding**：首次使用时显示步骤引导，说明导入→选起点→分析的流程。

### 阶段 16：高级分析功能（远期）

远期可考虑的高级特性，需要更多数据或算法支持。

- [ ] 16.1 **赛车线优化建议**：对比理想赛车线（外-内-外）与实际轨迹，给出切弯建议。需要赛道边界数据或通过多圈轨迹推算理想线。
- [ ] 16.2 **轮胎磨损 / 燃油消耗模拟**：基于速度和加速度数据估算轮胎负荷和燃油消耗，预测后期圈速衰减。
- [ ] 16.3 **天气数据关联**：接入天气 API，根据录制时间和地点获取天气信息，分析天气对圈速的影响。
- [ ] 16.4 **多人对比**：导入不同车手的 GPX 数据，在同一地图和图表上对比驾驶风格差异。
- [ ] 16.5 **支持更多 GPS 格式**：除 GPX 外，支持 TCX、FIT（需二进制解析库）、NMEA 等格式。

---

## 修改记录

### #001 — 2026-05-28：项目初始搭建

**修改内容：**
- 初始化 Vite + React + TypeScript 项目
- 安装所有依赖（antd, zustand, leaflet, react-leaflet, recharts, electron 等）
- 创建 20 个源文件（类型定义、工具函数、状态管理、UI 组件、Electron 主进程）
- 实现全部 6 个阶段的代码框架

**修改文件：**
- `src/types/index.ts` — 新建
- `src/utils/gpxParser.ts` — 新建
- `src/utils/trackCalc.ts` — 新建
- `src/utils/aiClient.ts` — 新建
- `src/store/appStore.ts` — 新建
- `src/components/Import/ImportPanel.tsx` — 新建
- `src/components/TrackAnalysis/TrackAnalysisTab.tsx` — 新建
- `src/components/TrackAnalysis/TrackMap.tsx` — 新建
- `src/components/TrackAnalysis/LapTable.tsx` — 新建
- `src/components/TrackAnalysis/TelemetryCharts.tsx` — 新建
- `src/components/TrackAnalysis/AIAdvisor.tsx` — 新建
- `src/components/VideoOverlay/VideoOverlayTab.tsx` — 新建
- `src/components/VideoOverlay/VideoPlayer.tsx` — 新建
- `src/components/VideoOverlay/OverlayCanvas.tsx` — 新建
- `src/components/VideoOverlay/TimeSync.tsx` — 新建
- `src/components/VideoOverlay/OverlaySettings.tsx` — 新建
- `electron/main.js` — 新建
- `electron/preload.js` — 新建
- `src/App.tsx` — 重写（替换 Vite 模板）
- `src/main.tsx` — 重写
- `src/index.css` — 重写
- `src/electron.d.ts` — 新建
- `vite.config.ts` — 修改（添加 base, alias, server 配置）
- `tsconfig.app.json` — 修改（放宽 lint 规则）
- `package.json` — 修改（添加 Electron scripts 和 main 入口）
- `index.html` — 修改（标题改为 Sim Racing Gauge）

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功（dist 产出 1.6MB JS + 15KB CSS）
- `npm run dev` 启动正常，`http://127.0.0.1:5173/` 可访问

---

### #002 — 2026-05-28：修复 Vite Dev Server 无法响应请求

**问题：** `npm run dev` 后 Vite 显示 ready，但浏览器访问 `localhost:5173` 一直加载失败，Console 和 Network 面板无输出。

**原因：** Vite 默认绑定 `localhost`（可能解析到 IPv6 `::1`），而 Windows 环境下浏览器访问 `localhost` 时可能连接到 IPv4 `127.0.0.1`，导致无法建立连接。

**修改文件：**
- `vite.config.ts` — 添加 `host: '127.0.0.1'` 和 `strictPort: true`

**验证结果：**
- `Invoke-WebRequest http://127.0.0.1:5173/` 返回 200 OK
- 浏览器访问 `http://127.0.0.1:5173/` 正常加载
- GPX 数据导入、轨迹显示、视频播放功能验证通过

---

### #003 — 2026-05-28：修复起跑线点击 & Canvas 仪表叠加（阶段 8）

**问题 8.1 — 起跑线点击不生效：**

`TrackMap.tsx` 使用 `mapRef.current.on('click', handleMapClick)` 绑定地图点击事件，但 `react-leaflet@5` 的 `MapContainer` ref 拿到的不是原生 `L.Map` 实例，导致事件绑定无效。同时存在一个无用的 `ClickHandler` 子组件（用 `useMapEvents` 注册了空 click）。

**修复方案：**
- 删除 `mapRef` + `useEffect` 绑定方案
- 删除无用的 `ClickHandler` 组件
- 新建 `StartLineClickHandler` 子组件，内部使用 `useMapEvents({ click(e) { ... } })` 监听点击，在回调中执行最近轨迹点查找 → 设起跑线 → 检测穿越 → 计算圈速的完整逻辑
- 移除 `MapContainer` 上的 `ref` prop

**问题 8.2 — Canvas 仪表不更新：**

`OverlayCanvas.tsx` 的 `draw` 函数被包在 `useCallback` 中（依赖 `currentTime` 等），每次状态变化都重新创建 `draw` 函数并重新执行 `useEffect`（cancel → requestAnimationFrame），实际上无法形成持续循环。更关键的是 rAF 自循环中闭包捕获了创建时的 `currentTime` 旧值。此外每帧重设 `canvas.width/height` 会清空 Canvas 内容。

**修复方案：**
- 全面改用 `useRef` 存储所有需要实时读取的状态值（`gpxPoints`, `currentTime`, `videoStartTime`, `timeOffset`, `overlayConfig`, `laps` 等），在渲染函数开始前将最新 store 值同步到 ref
- 建立独立的 `drawFrame()` 函数（非 useCallback），末尾调用 `requestAnimationFrame(drawFrame)` 形成真正的 60fps 循环
- `useEffect([], [])` 只在组件挂载时启动循环，卸载时取消
- 用 `ResizeObserver` 管理 Canvas 尺寸（仅在容器尺寸变化时更新），支持 HiDPI（`devicePixelRatio` 缩放）
- 不再每帧重设 canvas 尺寸

**问题 8.3 — VideoPlayer 验证：**

检查确认 `VideoPlayer.tsx` 的 `timeupdate` 事件监听逻辑正确：Zustand setter 引用稳定，effect 只挂载一次，video 元素的事件监听器正常工作。无需修改。

**修改文件：**
- `src/components/TrackAnalysis/TrackMap.tsx` — 重构：删除 mapRef 方案，新增 StartLineClickHandler 组件用 useMapEvents
- `src/components/VideoOverlay/OverlayCanvas.tsx` — 重构：全部改为 useRef + 独立 rAF 循环 + ResizeObserver + HiDPI 支持

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功
- 起跑线点击选择功能待用户手动验证（需 GPX 数据）
- Canvas 仪表叠加待用户手动验证（需视频 + GPX + 起始时间设置）

---

### #004 — 2026-05-28：修复假圈速 & 切换卫星地图

**Bug 1 — 大量 0:00.440 的假圈速：**

原 `detectLapCrossings()` 用距离阈值法检测穿越：计算每个 GPS 点到起跑线两端点的距离，取较小值，若 <= 20m 则认为是穿越。这实际上在检测 GPS 点是否在起跑线端点的圆形区域内，而非轨迹是否真正跨越了起跑线。结果：起跑线附近所有 GPS 点（可能十几个）都被误判为穿越，产生大量假圈速。最小间隔过滤 `> 10 个点` 也太弱（1Hz GPS 下仅 10 秒）。

**修复方案：**
- 彻底重写 `detectLapCrossings()`，改用**线段相交法**
- 起跑线定义为从中心点到垂直方向偏移 `halfWidth` 米的线段
- 对每个 GPS 轨迹段（`prev → curr`），用向量叉积法判断是否与起跑线段相交（`segmentsIntersect`）
- 额外增加距离过滤（交叉点到起跑线中心 > `halfWidth * 3` 则排除，防止远处虚假交叉）
- 最小圈速间隔改为基于**时间**（默认 10 秒），而非点序号
- 新增 `segmentsIntersect()` 辅助函数：标准二维线段相交判断

**Bug 2 — 轨迹未叠加卫星图：**

原代码使用 OpenStreetMap 街道图瓦片，不是卫星图。

**修复方案：**
- 底图改为 ESRI World Imagery 卫星瓦片（`https://server.arcgisonline.com/.../World_Imagery/...`），免费无需 API Key
- 叠加半透明的 ESRI Reference/WorldBoundariesAndPlaces 标注层（显示地名、道路名），`opacity=0.7`

**修改文件：**
- `src/utils/trackCalc.ts` — 重写 `detectLapCrossings()`，新增 `segmentsIntersect()` 辅助函数
- `src/components/TrackAnalysis/TrackMap.tsx` — TileLayer url 从 OSM 街道图改为 ESRI 卫星图 + 标注层

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #005 — 2026-05-28：修复起跑线漏检 & 25Hz GPS 速度波动

**Bug 1 — 两圈识别成一圈（起跑线漏检）：**

`halfWidth=15` 米导致起跑线总宽度仅 30 米。25Hz GPS 在弯道附近的位置抖动可能导致某些圈的轨迹未穿过这条较窄的线段，造成整圈漏检。

**修复：** `halfWidth` 默认值从 15 提高到 25 米（总宽度 50 米），增强穿越检测鲁棒性。

**Bug 2 — 25Hz GPS 速度极度波动：**

原 `gpxParser.ts` 速度计算有三个问题：
1. 若 GPX 含 `<speed>` 标签则直接使用，但 GPS 瞬时速度本身噪声大（25Hz 下尤为严重）
2. 平滑窗口固定为 3 个点，25Hz 下仅覆盖 0.12 秒，远不够平滑
3. 简单均值平滑不够，未考虑距离加权

**修复方案：**

- `gpxParser.ts` 完全重写速度计算流程：
  - **始终用 Haversine 距离 / 时间差重新计算速度**，忽略 GPS 原始 speed 字段（Haversine 更稳定）
  - 新增 `detectFrequency()` 函数：取前 200 个点的时间间隔中位数，自动检测 GPS 采样频率
  - `calculateSpeeds()` 接受 `targetHz` 参数（0 = 自动检测）
  - `smoothSpeeds()` 改为**距离加权滑动平均**（越近的点权重越大），窗口大小 = `max(5, round(hz * 0.8))`
    - 1Hz → 窗口 5 点 / 5 秒
    - 10Hz → 窗口 8 点 / 0.8 秒
    - 25Hz → 窗口 20 点 / 0.8 秒
  - `parseGpxFile()` 导出 `calculateSpeeds()` 以便 store 中重新计算

- `store/appStore.ts` 新增：
  - `gpsFrequency: number` 状态（默认 0 = 自动检测）
  - `setGpsFrequency()` setter
  - `recalculateSpeeds()` action：用当前 gpxPoints + gpsFrequency 重新计算速度

- `components/Import/ImportPanel.tsx` 新增：
  - 导入 GPX 后显示 GPS 频率下拉选择器（自动检测 / 1Hz / 5Hz / 10Hz / 25Hz）
  - 切换频率后立即调用 `recalculateSpeeds()` 重新计算

**修改文件：**
- `src/utils/gpxParser.ts` — 完全重写速度计算和平滑逻辑
- `src/utils/trackCalc.ts` — `halfWidth` 默认值从 15 改为 25
- `src/store/appStore.ts` — 新增 gpsFrequency 状态和 recalculateSpeeds action
- `src/components/Import/ImportPanel.tsx` — 新增 GPS 频率选择 UI

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #006 — 2026-05-28：起跑线参数可调 + 地图绘制真实起跑线段

**需求：**

1. 顶部导航栏增加起跑线宽度（半宽米）和方位角（度）的输入控件
2. 起跑线从红色圆点改为真实的线段绘制，反映实际宽度和方向
3. 修改宽度/方向参数时自动重新计算圈速

**修改方案：**

**`src/types/index.ts`：**
- `StartLine` 接口新增 `halfWidth: number` 字段

**`src/store/appStore.ts`：**
- 新增状态：`startLineHalfWidth`（默认 25）、`startLineHeading`（默认 -1 = 自动从轨迹计算）
- 新增 setter：`setStartLineHalfWidth()`、`setStartLineHeading()`
- 修改 setter 逻辑：修改参数时，如果已有 startLine，立即更新 startLine 对象并调用 `recalculateLaps()`
- 新增 `recalculateLaps()` action：用当前 startLine 重新执行穿越检测和圈速计算
- store 改用 `create<AppState>((set, get) => ...)` 形式以支持 `get()` 读取最新状态

**`src/utils/trackCalc.ts`：**
- `getStartLineFromPoint()` 新增 `halfWidth` 和 `headingOverride` 参数，构造含 halfWidth 的 StartLine
- `detectLapCrossings()` 移除独立 `halfWidth` 参数，改为从 `startLine.halfWidth` 读取
- `perpendicularPoint()` 从 private 改为 export，供 TrackMap 绘制使用

**`src/components/Import/ImportPanel.tsx`：**
- GPS 频率控件右侧新增：
  - "起跑线宽度" InputNumber（5-100m，步进5）
  - "方向" InputNumber（-1=自动 / 0-360deg）

**`src/components/TrackAnalysis/TrackMap.tsx`：**
- 删除旧的红色圆点 Marker + startLineIcon
- 新增 `StartLineVisual` 子组件：
  - 用 `perpendicularPoint()` 计算起跑线两端点（沿 heading 垂直方向各延伸 halfWidth）
  - 用 `Polyline` 绘制红色线段（`weight=3, color=#ff4d4f`）
  - Tooltip 显示 "Start/Finish (总宽度m)"
- `StartLineClickHandler` 使用 store 中的 `startLineHalfWidth` 和 `startLineHeading` 构造 StartLine

**修改文件：**
- `src/types/index.ts` — StartLine 新增 halfWidth
- `src/store/appStore.ts` — 新增状态/逻辑/重算
- `src/utils/trackCalc.ts` — getStartLineFromPoint 新参数，导出 perpendicularPoint
- `src/components/Import/ImportPanel.tsx` — 新增控件
- `src/components/TrackAnalysis/TrackMap.tsx` — 起跑线改为 Polyline 线段

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #007 — 2026-05-28：修复起跑线显示与计算不一致 & 修改默认值

**Bug — 起跑线显示比实际计算用的宽 2 倍：**

`detectLapCrossings()` 构造的穿越线段只用了**中心点到一侧端点**（半宽 `halfWidth`），而 `StartLineVisual` 绘制的是**两侧端点之间的完整线段**（全宽 `halfWidth * 2`）。导致：
1. 地图上显示的红线比实际穿越检测线宽一倍
2. 用户以为起跑线在某位置，实际计算用的是不对称的半线段
3. 可能导致部分圈被漏检

**修复：** `detectLapCrossings()` 改为使用双侧端点，与 `StartLineVisual` 完全一致：
```ts
const slA = perpendicularPoint(lat, lon, heading, halfWidth);       // 一侧
const slB = perpendicularPoint(lat, lon, (heading+180)%360, halfWidth); // 另一侧
// 线段 slA → slB，总长 = halfWidth * 2
```
同时移除了冗余的距离安全检查（`crossDist > halfWidth * 3`）和零长度检查（`slLen === 0`），线段相交法本身已精确。

**默认值修改：**
- `startLineHalfWidth`: 25 → **10**（默认总宽度 20m）
- `startLineHeading`: -1（自动）→ **90**（垂直于正北方向）
- `getStartLineFromPoint` 默认 `halfWidth`: 25 → 10
- `StartLineVisual` fallback 值: 25 → 10

**修改文件：**
- `src/store/appStore.ts` — 默认值修改
- `src/utils/trackCalc.ts` — `detectLapCrossings` 线段改为双侧端点，移除冗余检查
- `src/components/TrackAnalysis/TrackMap.tsx` — `StartLineVisual` fallback 值

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #008 — 2026-05-28：视频仪表界面优化

**改动 1 — 视频起始时间自动设置：**

用户导入 GPX 后进入视频仪表页时，`videoStartTime` 为 `null`，需要手动选 DatePicker。但通常 GPS 录制和视频录制是同时开始的，所以应自动对齐。

**修复：** 在 `VideoOverlayTab` 中添加 `useEffect`，当 `videoStartTime` 为 `null` 且 `gpxPoints` 有数据时，自动将 `videoStartTime` 设为 GPX 第一个点的时间戳。用户仍可通过 DatePicker 调整。

**改动 2 — 视频进度条被遮挡：**

`VideoPlayer` 外层 div 使用 `flex: 1`，在父容器中撑满可用空间，但父容器的 flex 布局未正确约束高度，导致视频+控制条总高度超出可视区域，底部控制条被裁剪。

**修复：**
- `VideoPlayer.tsx` 外层 div 从 `flex: 1` 改为 `height: 100%`，确保在固定高度内布局
- `VideoOverlayTab.tsx` 左侧视频区域添加 `minHeight: 0` 约束，防止 flex 子元素撑破容器

**修改文件：**
- `src/components/VideoOverlay/VideoOverlayTab.tsx` — 添加 useEffect 自动设置 videoStartTime；修复左侧区域 flex 布局
- `src/components/VideoOverlay/VideoPlayer.tsx` — 外层 div `flex: 1` → `height: 100%`

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #009 — 2026-05-28：修复进度条遮挡 & 仪表盘不可见

**Bug 1 — 进度条被页面下边框遮挡：**

`VideoPlayer` 外层 div 使用 `height: '100%'`，依赖高度传递链（tab pane → VideoOverlayTab → inner div → VideoPlayer）。但 Ant Design Tabs 的 tab header 栏占了约 46px 高度，`tab-pane` 的 `height: 100%` 没有减去这个高度，导致 VideoPlayer 实际可用高度比预期多了 ~46px，底部控制条被挤到视口外。

**修复：** `VideoPlayer` 外层 div 从 `height: '100%'` 改为 `flex: 1, minHeight: 0`。作为 flex 子项自然占据剩余空间，不依赖 `height: 100%` 的传递链。

**Bug 2 — 速度表、加速度表、圈速计时器不可见：**

`OverlayCanvas` 的 ResizeObserver 设置 `canvas.width = cssWidth * dpr`（物理像素），然后 `ctx.scale(dpr, dpr)` 缩放。缩放后绘图坐标应使用 CSS 像素。但各仪表绘制函数使用了 `ctx.canvas.height`（物理像素）来定位 y 坐标：

- `drawSpeedGauge`：`y = ctx.canvas.height - size - 20` → HiDPI 下 y 值翻倍，仪表画到 Canvas 底部之外
- `drawAccelGauge`：`y = ctx.canvas.height - height - 160` → 同上
- `drawLapTimer`：`x = ctx.canvas.width / 2 - width/2` → x 值翻倍，仪表画到右侧之外

而赛道小地图能正常显示，因为它用 `canvasSizeRef.current`（CSS 像素）定位，不依赖 `ctx.canvas.height`。

**修复：** 各绘制函数新增 `canvasH`/`canvasW` 参数，使用 CSS 像素尺寸：
- `drawSpeedGauge(ctx, speed, maxSpeed, scale, canvasH)`
- `drawAccelGauge(ctx, longitudinal, lateral, scale, canvasH)`
- `drawLapTimer(ctx, lapTime, lapNumber, scale, canvasW)`
- `drawFrame` 调用处传入 `w`/`h`（来自 `canvasSizeRef.current`）

**修改文件：**
- `src/components/VideoOverlay/VideoPlayer.tsx` — 外层 div 改为 `flex: 1, minHeight: 0`
- `src/components/VideoOverlay/OverlayCanvas.tsx` — 三个绘制函数新增 CSS 像素参数，`drawFrame` 传入 `w`/`h`

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #010 — 2026-05-28：进度条叠加到视频上 + 仪表盘位置上移

**Bug 1 — 进度条仍被遮挡：**

之前尝试用 `flex: 1, minHeight: 0` 修复，但根本问题是 `.ant-tabs-content-holder` 的 `overflow: auto` + `.ant-tabs-tabpane` 的 `height: 100%` 在 CSS 层面无法精确传递高度。flex 方案只是缓解，没有根治。

**修复：** 彻底改变 VideoPlayer 布局——控制条从独立 flex 子项改为**绝对定位叠加在视频画面上**：
- 外层 div 改为 `position: relative`（不再用 flex column）
- video 元素占满 100% 高度
- 控制条 div 改为 `position: absolute, bottom: 0, left: 0, right: 0`，背景半透明 `rgba(0,0,0,0.75)`
- 这样 VideoPlayer 只有一个元素占满容器，不再依赖 flex 高度传递链

**Bug 2 — 仪表盘超出视频下边框：**

`OverlayCanvas` 覆盖整个容器（视频+控制条），仪表从 canvas 底部定位。控制条叠加到视频上后，canvas 底部就是控制条位置，仪表会被画在控制条区域。

**修复：** 在 `drawFrame` 中定义 `bottomOffset = 60`（控制条高度），传给所有底部定位的仪表：
- `drawSpeedGauge`：`y = canvasH - size - 20 - bottomOffset`
- `drawAccelGauge`：`y = canvasH - height - 160 - bottomOffset`
- 小地图（bottom-right/bottom-left）：`mapY = h - mapSize - 10 - bottomOffset`
- `drawLapTimer`：无影响（顶部定位）

**修改文件：**
- `src/components/VideoOverlay/VideoPlayer.tsx` — 控制条改为绝对定位叠加在视频上
- `src/components/VideoOverlay/OverlayCanvas.tsx` — 各绘制函数添加 `bottomOffset` 参数

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #011 — 2026-05-28：阶段 9 — 赛道分析增强

**9.1 多圈遥测对比（速度曲线 + 赛道图）：**

- `store/appStore.ts`：新增 `selectedLapIndices: number[]`（最多选 3 圈）、`toggleLapSelection()`、`clearLapSelection()`。圈速计算完成后自动选中最佳圈。
- `TelemetryCharts.tsx`：完全重写。支持多圈速度曲线叠加（蓝色/红色/绿色），每圈一条 `<Line>`，X 轴为赛道位置百分比。点击圈号 Tag 可切换选中状态。
- `TrackMap.tsx`：新增 `SelectedLapTracks` 子组件，根据 `selectedLapIndices` 用不同颜色绘制选中圈的轨迹（`weight=3, opacity=0.85`）。有选中圈时隐藏全轨迹速度热力图，只显示选中圈彩色轨迹。
- `LapTable.tsx`：圈号列的 Tag 可点击，调用 `toggleLapSelection()` 切换选中，选中状态用对应颜色高亮。

**9.2 加速度曲线图：**

- `TelemetryCharts.tsx`：在速度曲线下方新增加速度图表（纵向红色 `#ff4d4f` + 横向蓝色 `#1890ff`），使用 `calculateAcceleration()` 计算。显示选中第一圈的加速度数据。

**9.3 扇区时间对比柱状图：**

- `TelemetryCharts.tsx`：新增分组柱状图，X 轴为扇区编号，每个扇区有多个 `<Bar>` 代表不同圈的用时，颜色与速度曲线一致。

**9.4 制动点/加速点自动标注：**

- `trackCalc.ts`：新增 `detectBrakeEvents()`（速度 2 秒内下降 >15 km/h）和 `detectAccelEvents()`（速度 2 秒内上升 >15 km/h），防抖间隔 5 个点。
- `TrackMap.tsx`：新增 `BrakeAccelMarkers` 子组件，制动点用红色倒三角标注，加速点用绿色正三角标注，Tooltip 显示减速/加速幅度。
- `TrackAnalysisTab.tsx`：右侧面板顶部新增"显示制动/加速点" Checkbox 开关。

**9.5 最佳合成圈：**

- `trackCalc.ts`：新增 `calculateTheoreticalBest()`，遍历所有圈的扇区取最小时间，返回合成总时间和各扇区最快来源。
- `LapTable.tsx`：表格底部追加"理论最佳"行，紫色 Tag 标记，扇区时间用金色高亮，显示来自哪一圈的合成。

**修改文件：**
- `src/store/appStore.ts` — 新增 selectedLapIndices / showBrakeAccelMarkers 状态及 actions
- `src/utils/trackCalc.ts` — 新增 detectBrakeEvents / detectAccelEvents / calculateTheoreticalBest
- `src/components/TrackAnalysis/TelemetryCharts.tsx` — 完全重写：多圈速度对比 + 加速度曲线 + 扇区柱状图
- `src/components/TrackAnalysis/TrackMap.tsx` — 多圈彩色轨迹 + 制动/加速标注
- `src/components/TrackAnalysis/LapTable.tsx` — 可选圈交互 + 理论最佳行
- `src/components/TrackAnalysis/TrackAnalysisTab.tsx` — 新增标注开关

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功

---

### #012 — 2026-05-28：高德卫星图默认 + 移除加速度曲线

**改动 1 — 高德卫星图作为默认地图源：**

- `store/appStore.ts`：新增 `mapProvider: 'gaode' | 'esri'`（默认 `'gaode'`），`setMapProvider()` setter
- `TrackMap.tsx`：根据 `mapProvider` 状态切换瓦片源：
  - `'gaode'`：高德卫星瓦片 `wprd0{s}.is.autonavi.com/appmaptile?style=6` + 高德路网标注 `style=8`
  - `'esri'`：ESRI World Imagery + Reference 标注
- `TrackAnalysisTab.tsx`：右侧面板顶部新增 Radio.Group 地图源选择器（高德卫星 / ESRI卫星）

**改动 2 — 移除加速度曲线图：**

- `TelemetryCharts.tsx`：删除加速度图表区块（`AccelPoint` 接口、`buildAccelData` 函数、`accelData` useMemo、`calculateAcceleration` 导入、整个加速度 `<LineChart>` 区块）

**修改文件：**
- `src/store/appStore.ts` — 新增 mapProvider 状态
- `src/components/TrackAnalysis/TrackMap.tsx` — 根据 mapProvider 切换瓦片源
- `src/components/TrackAnalysis/TrackAnalysisTab.tsx` — 新增地图源选择器 + 整合标注开关
- `src/components/TrackAnalysis/TelemetryCharts.tsx` — 移除加速度曲线相关代码

**验证结果：**
- `npx tsc -b` 通过
- `npx vite build` 成功
