# Agent App — AI 合同审阅桌面客户端

基于 Electron + React + TypeScript 构建的 AI 辅助合同审阅工具，支持多格式文件预览、智能问题标注与跳转。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 41 + electron-forge + webpack 5 |
| UI | React 19 + TypeScript 5.4 |
| PDF 渲染 | pdfjs-dist v5（canvas + text layer + annotation layer） |
| 样式 | 原生 CSS，OKLCH 颜色系统 |
| IPC | contextBridge + ipcRenderer（sandbox 模式） |

---

## 已实现功能

### 应用框架

- [x] 三面板布局（文件树 / 预览 / AI 助手），面板宽度可拖拽调整
- [x] macOS 原生窗口控件（红绿灯），标题栏无自定义按钮遮挡
- [x] 全局设计 Token（OKLCH 颜色、阴影、字体），Tweaks 面板可调节主题
- [x] Electron IPC 骨架：`file:open-dialog`、`file:read`、`file:stat`

### 文件树

- [x] 树形结构展示，支持展开/折叠文件夹
- [x] 文件名实时搜索过滤
- [x] `+` 按钮调起原生文件选择对话框，选中文件动态插入树中
- [x] 文件角标显示 issue 数量
- [x] 收藏标星标记

### 多格式文件预览路由

- [x] 按 `file.kind` 路由到对应预览组件：PDF / Word / Excel / PPT / 图片
- [x] 按 `file.source`（`demo` | `local`）区分 Demo 内容与真实文件
- [x] 所有组件均有三态 UI：Demo 渲染 / 加载骨架（shimmer） / 错误卡片+重试

### PDF 预览（本地文件）

- [x] **Canvas 渲染**：pdfjs-dist 逐页渲染，支持任意 PDF
- [x] **HiDPI 适配**：canvas 物理像素 × `devicePixelRatio`，Retina 屏清晰锐利
- [x] **Text Layer**：透明文字覆盖层，支持鼠标框选文字、`Cmd+C` 复制
- [x] **Annotation Layer**：渲染 PDF 内置高亮、下划线、删除线、超链接
- [x] **坐标变换**：PDF 用户空间（左下原点，点）→ DOM 空间（左上原点，px）
- [x] **Issue 高亮矩形**：几何坐标定位，点击 issue 卡片滚动到对应页并高亮矩形，带脉冲动画
- [x] **缩放**：toolbar 缩放控件调整 canvas viewport scale，每次重新渲染保证清晰度
- [x] **双页展示**：toolbar ⊞ 双页 切换按钮，两页并排显示
- [x] **横向溢出滚动**：窗口窄于页面宽度时横向滚动，PDF 不压缩变形
- [x] **页码追踪**：滚动时自动更新 toolbar 当前页码

### PDF 预览（Demo 模式）

- [x] 硬编码 HTML 合同内容（5 页），锚点式跳转 + flash 高亮效果

### 其他格式预览（Demo 模式）

- [x] **Word**：仿文档排版骨架 + Demo 富文本内容
- [x] **Excel**：表格骨架 + Demo 多 Sheet 数据
- [x] **PPT**：幻灯片缩略图侧边栏 + Demo 内容，支持翻页
- [x] **图片**：本地图片通过 IPC 读取字节，`Blob → ObjectURL → <img>` 真实显示

### AI 助手面板

- [x] 问题清单 Tab：severity 分级（高/中/低）、问题原文、问题点、建议
- [x] 对话 Tab：消息气泡，引用跳转（cite 点击定位原文）
- [x] Issue 点击跳转：Demo PDF 走锚点，本地 PDF 走 `scrollToPageAndRect`
- [x] 动态 issues：本地 PDF 调用 mock 分析服务，Demo PDF 使用预置数据
- [x] 动态问题计数显示

### Mock 服务层（后端 API 合约镜像）

- [x] `IssueItem` / `IssueLocation` / `PageRect` / `DocumentAnalysisResult` 接口定义
- [x] `analyzePdf(docId)` → 返回含 `pageIndex + rects[]` 的 IssueItem[]
- [x] 数据结构与后端 API 合约对齐，便于后续替换为真实调用

---

## 待实现功能

### PDF 能力

- [ ] **文字搜索 / Find-in-page**：接入 pdfjs PDFFindController，高亮搜索结果
- [ ] **大文件虚拟滚动**：仅渲染视口内的页，超过 50 页时避免全量渲染卡顿
- [ ] **扫描件 OCR**：对无文字层的扫描 PDF 接入 OCR，生成可选文字层
- [ ] **页面旋转**：支持 0/90/180/270° 旋转，坐标变换需同步更新
- [ ] **缩略图侧边栏**：类 PPT 的页面缩略图面板，点击快速跳页

### Word / Excel / PPT 真实渲染

- [ ] **Word**：接入 docx-preview 或 mammoth.js，渲染 `.docx` 真实内容
- [ ] **Excel**：接入 SheetJS（xlsx），渲染真实表格数据
- [ ] **PPT**：接入 pptxgenjs 解析或后端转换为图片序列

### AI 能力接入

- [ ] **真实后端 API**：将 mock 分析服务替换为真实 HTTP/WebSocket 调用
- [ ] **流式输出**：对话 Tab 接入 SSE / WebSocket，支持打字机效果
- [ ] **多文档关联**：issue 可跨文件引用（loc.docId 机制已就绪）
- [ ] **采纳/忽略持久化**：issue 操作状态写入本地 SQLite 或后端

### 标注与编辑

- [ ] **手动高亮**：用户框选文字后可添加自定义高亮颜色
- [ ] **批注**：在 PDF 页面添加文字批注，覆盖于 Annotation Layer 之上
- [ ] **导出**：将审阅结果（问题清单 + 批注）导出为 PDF 或 Word 报告

### 工程化

- [ ] **自动化测试**：Playwright 端到端测试，覆盖 issue 跳转、文字选中等核心路径
- [ ] **打包与分发**：electron-forge maker 配置，生成 macOS `.dmg` 和 Windows `.exe`
- [ ] **自动更新**：接入 electron-updater，支持后台静默更新
- [ ] **性能监控**：渲染帧率、IPC 延迟埋点，Sentry 崩溃上报

---

## 目录结构

```
src/
├── main/
│   ├── main.ts              # Electron 主进程入口
│   └── ipc/
│       └── file.ts          # IPC handlers: open-dialog / read / stat
├── preload/
│   └── index.ts             # contextBridge 暴露 window.api
├── pdf/                     # PDF 渲染模块
│   ├── engine.ts            # pdfjs-dist 封装，loadPdf()
│   ├── coordinator.ts       # PDF 坐标 → DOM 坐标变换
│   ├── highlight.tsx        # Issue 高亮矩形 Overlay
│   ├── page.tsx             # 单页渲染（Canvas + Text + Annotation）
│   └── viewer.tsx           # 多页滚动容器，scrollToPageAndRect
├── services/
│   └── mock/
│       └── mockPdfIssues.ts # Mock PDF 分析服务
└── renderer/
    ├── app.jsx              # 根组件，三面板布局，issue 导航
    ├── types.ts             # 全局类型：FileNode / IssueItem / PageRect …
    ├── data.jsx             # Demo 数据（FILE_TREE / CONTRACT_ISSUES）
    ├── filetree.jsx         # 左面板：文件树 + 搜索
    ├── preview.jsx          # 中面板：格式路由，zoom，scrollToRef
    ├── preview_pdf.jsx      # PDF 预览：Demo + 骨架 + PdfRealViewer
    ├── preview_word.jsx     # Word 预览（Demo + 骨架）
    ├── preview_excel.jsx    # Excel 预览（Demo + 骨架）
    ├── preview_ppt.jsx      # PPT 预览（Demo + 骨架）
    ├── preview_image.jsx    # 图片预览（真实加载）
    ├── chat.jsx             # 右面板：AI 助手，issue 清单，对话
    ├── titlebar.jsx         # 顶部标题栏
    ├── icons.jsx            # 图标组件
    ├── styles.css           # 全局样式（OKLCH token + 组件样式）
    └── tweaks.jsx           # 主题 Tweaks 面板
```

---

## 开发

```bash
npm install
npm start          # 启动开发模式
npx tsc --noEmit   # 类型检查
npm run make       # 打包
```
