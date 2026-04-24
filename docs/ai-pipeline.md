# AI 合同审阅调用流程

## 总览

```
用户打开 PDF / DOCX
    │
    ▼
   文件加载与渲染                          [已完成]
    │ PDF → pdfjs 渲染 + 文本坐标索引
    │ DOCX → mammoth HTML 渲染（无坐标）
    ▼
   远程文档解析（MinerU 服务）              [已完成]
    │ file.path ──multipart──▶ 121.40.89.172:8893
    │ ◀── md_content（Markdown 字符串，表格为 HTML）
    ▼
   AI 合同分析（IPC）                      [已完成]
    │ markdown ──LLM──▶ JSON issues[]
    ▼
   结果解析 + Quote 坐标定位               [已完成，PDF 专属]
    │ quote → PageRect[]（pdfjs 坐标，DOCX 跳过）
    ▼
   Issue 排序 + 编号                       [已完成]
    │ 按页码/Y坐标升序，分配 number
    ▼
   高亮渲染 & 跳转                         [已完成，PDF 专属]
```

---

## 步骤一：文件加载与渲染

**触发：** 用户点击 `+` 选择本地文件，`Preview` 组件按 `file.kind` 路由到对应子组件。

### PDF（`PdfPreview` → `PdfRealViewer`）

```
window.api.file.read(file.path)          // IPC: file:read (主进程 fs.readFile)
    │ { bytes: Uint8Array, size, mtime }
    ▼
loadPdf(bytes)                           // src/pdf/engine.ts
    │ 初始化 pdfjs worker（webpack asset/resource URL）
    │ pdfjsLib.getDocument({ data: bytes }).promise
    │ → PDFDocumentProxy
    ▼
PdfRealViewer → PdfPageCanvas × numPages
    ├── page.render({ canvas, viewport: scale × devicePixelRatio })  // HiDPI
    ├── TextLayer.render()               // 透明文字层，支持选中/复制
    └── AnnotationLayer.render()         // 内置高亮/链接（best-effort）
```

canvas 渲染完成后，**非阻塞并发**执行 pdfjs 文本坐标索引（步骤二）：

```javascript
// preview_pdf.jsx
parsePdf(doc, file.id).then(parsed => onParsed?.(parsed));
// onParsed → app.jsx setState(parsedDoc)
```

### DOCX（`WordPreview`）

使用 `mammoth` 将 DOCX 转为 HTML 在 iframe 中渲染，无坐标信息。分析功能可用，高亮跳转不可用。

**输出：** PDF → `PDFDocumentProxy`（渲染用）+ `ParsedDocument`（坐标高亮用）；DOCX → 渲染 HTML

---

## 步骤二：pdfjs 文本坐标索引（PDF 专属）

**文件：** `src/pdf/parser.ts → parsePdf(doc, docId)`

**用途：** 仅供步骤六的 quote 坐标定位，不再用于构造 AI 输入文本。

### 逐页处理逻辑

```
for 每页 i (0-based):
    page.getTextContent({ includeMarkedContent: false })
        └── items: TextItem[]

    for 每个 TextItem:
        x = transform[4]          // PDF 用户空间 x（左下原点，单位=点）
        y = transform[5]          // PDF 用户空间 y（向上为正）
        w = item.width
        h = item.height || |transform[3]|

        // 拼接 fullText，插入空白字符
        if yDiff > h × 0.5:
            fullText += '\n'       // 换行（行间距判断）
        elif x - prevRight > h × 0.3:
            fullText += ' '        // 词间空格（水平间距判断）

        charOffset = fullText.length
        fullText  += item.str
        charEnd    = fullText.length

        words.push({ pageIndex, str, x, y, width, height, charOffset, charEnd })
```

### 输出数据结构

```typescript
interface ParsedDocument {
  docId: string;          // = file.id
  pages: ParsedPage[];
}

interface ParsedPage {
  pageIndex: number;      // 0-based
  fullText: string;       // 整页所有文字拼接，以 \n 和空格分隔
  words: WordEntry[];     // 与 fullText 对齐的词级索引
}

interface WordEntry {
  pageIndex: number;
  str: string;
  x: number;             // PDF 用户空间坐标（左下原点，单位=点）
  y: number;
  width: number;
  height: number;
  charOffset: number;    // 在本页 fullText 中的起始字符位置
  charEnd: number;       // 在本页 fullText 中的结束字符位置
}
```

**注意：** pdfjs 对表格的文本提取质量较差（单元格顺序可能乱序）。AI 分析已改用远程服务的 Markdown 输出，此处索引仅供 quote 高亮定位使用（best-effort）。

---

## 步骤三：远程文档解析（MinerU 服务）

**触发：** 用户点击"🔍 分析合同" → `triggerAnalysis()` 首次运行时调用，结果缓存在 `remoteParsed` state，同一文件重复分析不重复请求。

### 调用链

```
// app.jsx
window.api.file.parseRemote(file.path)   // IPC: file:parse-remote
    │
    ▼ 主进程 file.ts
fs.readFile(filePath)                    // 读取文件字节
    │
    ▼
POST http://121.40.89.172:8893/file_parse
Content-Type: multipart/form-data
  files=<file bytes>
  format=markdown
  backend=pipeline
  return_images=false
    │
    ▼ 响应
{
  "results": {
    "<filename>": {
      "md_content": "# 合同标题\n\n## 一、...\n\n<table>...</table>\n..."
    }
  }
}
    │
    ▼ 主进程提取 md_content，返回
{ markdown: string }
    │
    ▼ app.jsx
setRemoteParsed({ markdown })
```

### 输出特征

- 整个文档为**一段连续 Markdown 字符串**，无页码边界标记
- 章节标题转为 `##` heading
- 表格渲染为 HTML `<table>` 标签（非 Markdown 表格语法），合并单元格保留 `rowspan`/`colspan`
- 图片不返回（`return_images=false`）

### 状态缓存

```javascript
// app.jsx
const [remoteParsed, setRemoteParsed] = React.useState(null);

// 切换文件时重置
React.useEffect(() => {
  setRemoteParsed(null);
  // ...其他状态重置
}, [activeId]);
```

---

## 步骤四：传给 LLM 的内容

**触发：** `triggerAnalysis()` 取到 `remoteParsed.markdown` 后调用 `window.api.ai.analyze(markdown)`。

### 输入

直接将 Markdown 字符串作为 user message，不再拼接 `[第N页]` 分隔符：

```javascript
// app.jsx
const json = await window.api.ai.analyze(remoteParsed.markdown);

// ai.ts（主进程）
const messages = [
  { role: "system", content: ANALYZE_SYSTEM_PROMPT },
  { role: "user",   content: markdown }
];
```

### System Prompt（固定，`ai.ts` 顶部常量）

```
你是一名专业的中国合同法律顾问，专注于商业合同风险审查。
请审阅以下合同文本，识别所有潜在的法律风险、条款缺失、表述歧义和不公平条款。

输出规则：
1. 仅输出合法 JSON，不输出任何其他内容，不加 markdown 代码块
2. quote 字段必须是合同中的精确原文逐字引用，不超过 80 字，直接从文本中截取，不做任何修改
3. 分析维度：条款完整性、权利义务平衡、表述准确性、违约救济、知识产权归属、争议解决、付款安全

输出格式（严格遵守）：
{"issues":[{"severity":"high","category":"条款缺失","quote":"合同原文","body":"问题分析","recommendation":"修改建议"}]}

severity 只能为 "high"、"med"、"low" 之一
category 只能为以下之一：条款缺失、权利失衡、表述歧义、违约条款、知识产权、争议解决、支付风险、格式问题

合同文本（Markdown 格式，表格以 HTML 呈现）：
```

### API 调用参数

```
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
{
  model: config.model,
  temperature: 0.2,
  response_format: { type: "json_object" },  // 400/422时自动降级去掉此字段
  messages: [
    { role: "system", content: ANALYZE_SYSTEM_PROMPT },
    { role: "user",   content: markdown }
  ]
}
```

---

## 步骤五：LLM 返回格式

LLM 应返回纯 JSON（无 markdown fence），`ai.ts` 将原始字符串直接通过 IPC 返回。

### LLM 返回示例

```json
{
  "issues": [
    {
      "severity": "high",
      "category": "支付风险",
      "quote": "乙方应于合同签订后30日内支付首期款项",
      "body": "付款期限过于宽松，且未约定逾期付款的违约责任",
      "recommendation": "建议将付款期限缩短至15日，并增加逾期付款每日0.05%的违约金条款"
    },
    {
      "severity": "med",
      "category": "条款缺失",
      "quote": "争议由双方协商解决",
      "body": "未约定协商不成时的仲裁或诉讼解决方式及管辖地",
      "recommendation": "建议补充：协商不成的，提交XX仲裁委员会仲裁"
    }
  ]
}
```

> **注意：** `quote_page` 字段已从输出格式中移除。远程服务返回的 Markdown 无页码边界，AI 无法可靠判断页码。quote 坐标定位时默认从第 1 页开始向外扩展搜索（`hintPage = r.quote_page ?? 1`）。

### Renderer 侧处理（`app.jsx`）

```javascript
const cleaned = json
  .replace(/^```[a-z]*\n?/i, '')
  .replace(/\n?```$/i, '')
  .trim();
const { issues: raw } = JSON.parse(cleaned);
```

---

## 步骤六：Quote 坐标定位（PDF 专属）

**文件：** `src/pdf/locator.ts → resolveQuote(quote, hintPage, parsedDoc)`

**前提：** 仅在 `parsedDoc` 存在时执行（即 PDF 文件）。DOCX 跳过此步骤，`loc` 仅含 `docId`。

**目标：** 把 LLM 返回的 `quote` 映射到 pdfjs 坐标索引（步骤二产物）中的物理坐标矩形。

> **准确率说明：** AI 的 quote 来源于 Markdown（远程服务输出），pdfjs 坐标来源于 pdfjs 文本提取。两者对同一内容的文字略有差异（尤其表格），规范化匹配可覆盖标点/空白差异，但表格内容可能匹配失败（降级为无高亮，不报错）。

### normalize()

```typescript
function normalize(t: string): string {
  // 去除所有空白字符和中英文标点
  return t.replace(/[\s　，。！？；：""''【】（）《》、…—,.!?;:'"()\[\]{}]/g, '');
}
```

### 搜索顺序

```
hint0 = (r.quote_page ?? 1) - 1    // 转为 0-based，无 quote_page 时从第0页开始

搜索顺序（delta 从 0 扩展到 totalPages）：
  delta=0: [hint0]
  delta=1: [hint0-1, hint0+1]
  delta=2: [hint0-2, hint0+2]
  ... 直到全部页都尝试过
```

### 页内定位（normToOrigOffset）

```
normFull  = normalize(page.fullText)
normQuote = normalize(quote)
normIdx   = normFull.indexOf(normQuote)

charStart = normToOrigOffset(page.fullText, normIdx)
charEnd   = normToOrigOffset(page.fullText, normIdx + normQuote.length)

matched = words.filter(w => w.charOffset >= charStart && w.charEnd <= charEnd + 1)
```

### 行分组 → PageRect[]

```typescript
// 以 4pt 为容差，将 Y 坐标相近的词归为同一行
const lineKey = Math.round(w.y / 4) * 4;

// 每行词合并为一个矩形，按 y 降序排列（视觉从上到下）
rects.sort((a, b) => b.y - a.y)
```

### 跨页 fallback

```typescript
const cutLen = Math.floor(normQuote.length * 0.6);
// 取 quote 前60% 在第 p 页 + 后60% 在第 p+1 页，两者都命中则返回两个 Span
```

### 返回值

```typescript
interface Span {
  pageIndex: number;   // 0-based 页码
  rects: PageRect[];   // PDF 用户空间坐标，一行一个 rect，从上到下
}
// 通常 1 个 Span（单页），跨页时 2 个，找不到时 []
```

---

## 步骤七：Issue 存储格式

```typescript
interface IssueItem {
  id: string;            // "ai-0", "ai-1", ...（原始LLM顺序）
  number: number;        // 显示编号（按页面位置排序后分配，从1开始）
  severity: 'high' | 'med' | 'low';
  category: string;
  quote: string;
  body: string;
  recommendation: string;

  loc: {
    docId: string;       // = file.id
    pageIndex?: number;  // 0-based，PDF 且 resolveQuote 命中时填充
    rects?: PageRect[];  // PDF 用户空间坐标，命中时填充；DOCX 或未命中时缺省
  };

  // 排序用辅助字段（不渲染）
  sourceIndex: number;
  sortPageIndex: number; // = loc.pageIndex，找不到时为 MAX_SAFE_INTEGER
  sortTop: number;       // = -rects[0].y（取负使升序 = 从上到下）
}
```

### 排序逻辑

```javascript
.sort((a, b) =>
  a.sortPageIndex - b.sortPageIndex  // 先按页码升序
  || a.sortTop - b.sortTop           // 同页按视觉从上到下
  || a.sourceIndex - b.sourceIndex   // 同位置保持 LLM 原序
)
```

---

## 步骤八：高亮渲染与跳转

### 点击 issue 卡片后的调用链

```
IssueCard onClick → onJumpToIssue(it)           // chat.jsx
    │
    ▼ app.jsx
setActiveIssue(it.id)
    │
    ├─ PDF 且 loc.rects 存在：
    │    PdfRealViewer.scrollToPageAndRect(loc.pageIndex, loc.rects)
    │        ├── setActiveHighlight({ pageIndex, rects })
    │        └── container.querySelector('[data-page="N"]').scrollIntoView({ smooth })
    │
    └─ DOCX 或 rects 缺省：无高亮，不滚动
```

### 坐标转换（PDF 用户空间 → DOM）

```typescript
// src/pdf/coordinator.ts
function pdfRectToDom(rect: PageRect, viewport: PageViewport): DomRect {
  const scale = viewport.scale;
  return {
    left:   rect.x * scale,
    top:    viewport.height - (rect.y + rect.height) * scale,  // y轴翻转
    width:  rect.width  * scale,
    height: rect.height * scale,
  };
}
```

```
PDF 用户空间（左下原点，y↑，单位=点）
    → × scale →
DOM 空间（左上原点，y↓，单位=CSS px）
```

---

## IPC 通道汇总

| Channel | 方向 | 类型 | 用途 |
|---|---|---|---|
| `file:open-dialog` | renderer → main | handle | 原生文件选择器 |
| `file:read` | renderer → main | handle | 读文件字节 + stat |
| `file:stat` | renderer → main | handle | 文件 stat |
| `file:scan-paths` | renderer → main | handle | 扫描路径（文件树） |
| `file:parse-remote` | renderer → main | handle | 调 MinerU 服务解析文档，返回 Markdown |
| `ai:get-config` | renderer → main | handle | 读 AI 配置 |
| `ai:set-config` | renderer → main | handle | 写 AI 配置 |
| `ai:analyze` | renderer → main | handle | 单次合同分析，返回 JSON 字符串 |
| `ai:chat` | renderer → main | send | 启动流式对话 |
| `ai:chunk` | main → renderer | send | 流式文本片段 |
| `ai:done` | main → renderer | send | 流式结束 |
| `ai:error` | main → renderer | send | 错误通知 |

---

## 配置项（持久化到 `userData/ai-config.json`）

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `baseUrl` | string | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `apiKey` | string | `""` | Bearer token |
| `model` | string | `gpt-4o` | 模型名称 |
| `proxyUrl` | string | `""` | HTTP 代理，如 `http://127.0.0.1:7890` |
| `timeout` | number | `60000` | 请求超时（毫秒） |

---

## 功能状态

| 功能 | 状态 |
|---|---|
| PDF AI 分析 | ✅ 远程 MinerU 解析 + AI 审阅 |
| DOCX AI 分析 | ✅ 远程 MinerU 解析 + AI 审阅（无高亮） |
| PDF quote 高亮定位 | ✅ best-effort（表格内容可能匹配失败） |
| Excel / PPT 文本提取 | ❌ 显示"暂不支持" |
| 扫描件 OCR（无文字层 PDF） | ❌ 未实现 |
| issue 采纳 / 忽略持久化 | ❌ 按钮存在但无逻辑 |
| 大文件虚拟滚动（50+页） | ❌ 全量渲染 |
| analyze 流式进度 | ❌ one-shot，等待期间只有旋转动画 |
| 多文档关联 issue | ❌ `loc.docId` 字段已预留 |
