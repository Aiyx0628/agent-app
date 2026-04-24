# AI 合同审阅调用流程

## 总览

```
用户打开 PDF
    │
    ▼
   PDF 加载与渲染                        [已完成]
    │ PDFDocumentProxy
    ▼
   PDF 文本解析 → ParsedDocument         [已完成]
    │ fullText[] + WordEntry[]（含坐标 + charOffset）
    ▼
   AI 合同分析（IPC）                    [已完成]
    │ pageTexts[] ──LLM──▶ JSON issues[]
    ▼
   结果解析 + Quote 坐标定位             [已完成]
    │ quote + hintPage → PageRect[]（PDF坐标）
    ▼
   Issue 排序 + 编号                     [已完成]
    │ 按页码/Y坐标升序，分配 number
    ▼
   高亮渲染 & 跳转                       [已完成]
```

---

## 步骤一：PDF 加载与渲染

**触发：** 用户点击 `+` 选择本地 PDF 后，`PdfPreview` 组件挂载。

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

**输入：** `file.path: string`
**输出：** `PDFDocumentProxy`（pdfjs 文档句柄，供后续步骤使用）

**完成程度：** ✅ 全部完成。

---

## 步骤二：PDF 文本解析（建立词索引）

`loadPdf` 完成后非阻塞地并发执行，不阻塞 canvas 渲染：

```javascript
// preview_pdf.jsx
parsePdf(doc, file.id).then(parsed => onParsed?.(parsed));
// onParsed → app.jsx setState(parsedDoc)
```

**实现文件：** `src/pdf/parser.ts → parsePdf(doc, docId)`

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

        charOffset = fullText.length   // ← 拼接前记录起始位置
        fullText  += item.str
        charEnd    = fullText.length   // ← 拼接后记录结束位置

        words.push({ pageIndex, str, x, y, width, height, charOffset, charEnd })

        prevRight = x + w
        prevY = y
```

### 输出数据结构

```typescript
// 整个文档的索引，存储在 app.jsx parsedDoc state
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
  str: string;            // 该词的原始文字
  x: number;             // PDF 用户空间坐标（左下原点，单位=点）
  y: number;
  width: number;
  height: number;
  charOffset: number;    // 在本页 fullText 中的起始字符位置（含前缀空白）
  charEnd: number;       // 在本页 fullText 中的结束字符位置
}
```

### charOffset 示例

```
fullText = "甲方应当 按期付款"
               ↑    ↑
words[0]: str="甲方应当", charOffset=0, charEnd=4
words[1]: str="按期付款", charOffset=5, charEnd=9
                         ^-- 空格占一位，所以 charOffset=5
```

**完成程度：** ✅ 全部完成。`parsedDoc` 是后续 quote 定位的唯一依据。

---

## 步骤三：传给 LLM 的内容

**触发：** 用户点击"🔍 分析合同"按钮 → `app.jsx.triggerAnalysis()`

### 构造输入文本

```javascript
// app.jsx
const pageTexts = parsedDoc.pages.map(p => p.fullText);
// → ['第1页全文', '第2页全文', ...]

// ai.ts（主进程）
const contractText = pageTexts
  .map((t, i) => `[第${i + 1}页]\n${t}`)
  .join('\n\n');
```

实际传给 LLM 的 user message 示例：

```
[第1页]
甲方：XX公司
乙方：YY公司
本合同由甲乙双方协商一致，签订如下条款…

[第2页]
第三条 付款方式
乙方应于合同签订后30日内支付首期款项…
```

### System Prompt（固定，`ai.ts` 顶部常量）

```
你是一名专业的中国合同法律顾问，专注于商业合同风险审查。
请审阅以下合同文本，识别所有潜在的法律风险、条款缺失、表述歧义和不公平条款。

输出规则：
1. 仅输出合法 JSON，不输出任何其他内容，不加 markdown 代码块
2. quote 字段必须是合同中的精确原文逐字引用，不超过 80 字
3. quote_page 为该引用所在页码（从 1 开始）
4. 分析维度：条款完整性、权利义务平衡、表述准确性、违约救济、知识产权归属、争议解决、付款安全

输出格式（严格遵守）：
{"issues":[{"severity":"high","category":"条款缺失","quote":"合同原文","quote_page":1,"body":"问题分析","recommendation":"修改建议"}]}

severity 只能为 "high"、"med"、"low" 之一
category 只能为以下之一：条款缺失、权利失衡、表述歧义、违约条款、知识产权、争议解决、支付风险、格式问题

合同文本（每页以 [第N页] 标记分隔）：
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
    { role: "user",   content: contractText }
  ]
}
```

---

## 步骤四：LLM 返回格式

LLM 应返回纯 JSON（无 markdown fence），`ai.ts` 将原始字符串直接通过 IPC 返回。

### LLM 返回示例

```json
{
  "issues": [
    {
      "severity": "high",
      "category": "支付风险",
      "quote": "乙方应于合同签订后30日内支付首期款项",
      "quote_page": 2,
      "body": "付款期限过于宽松，且未约定逾期付款的违约责任",
      "recommendation": "建议将付款期限缩短至15日，并增加逾期付款每日0.05%的违约金条款"
    },
    {
      "severity": "med",
      "category": "条款缺失",
      "quote": "争议由双方协商解决",
      "quote_page": 4,
      "body": "未约定协商不成时的仲裁或诉讼解决方式及管辖地",
      "recommendation": "建议补充：协商不成的，提交XX仲裁委员会仲裁"
    }
  ]
}
```

### Renderer 侧处理（`app.jsx`）

```javascript
// 清理可能混入的 markdown fence
const cleaned = json
  .replace(/^```[a-z]*\n?/i, '')
  .replace(/\n?```$/i, '')
  .trim();
const { issues: raw } = JSON.parse(cleaned);
```

---

## 步骤五：Quote 坐标定位

**文件：** `src/pdf/locator.ts → resolveQuote(quote, hintPage, parsedDoc)`

**目标：** 把 LLM 返回的 `quote`（自然语言原文片段）映射到 PDF 页面上的物理坐标矩形。

### 为什么需要规范化？

LLM 返回的 quote 是"人读的文字"，而 `fullText` 是从 PDF 逐词拼接的，两者在标点、空白上可能不完全一致。直接 `indexOf` 会失败，所以先规范化再匹配。

### normalize()

```typescript
function normalize(t: string): string {
  // 去除所有空白字符和中英文标点
  return t.replace(/[\s　，。！？；：""''【】（）《》、…—,.!?;:'"()\[\]{}]/g, '');
}

// 示例
normalize("乙方应于合同签订后30日内，支付首期款项")
// → "乙方应于合同签订后30日内支付首期款项"
```

### 搜索顺序

```
hint0 = hintPage - 1    // 转为 0-based

搜索顺序（delta 从 0 扩展到 totalPages）：
  delta=0: [hint0]
  delta=1: [hint0-1, hint0+1]
  delta=2: [hint0-2, hint0+2]
  ...直到全部页都尝试过
```

### 页内定位（normToOrigOffset）

这是最关键的一步：在 normalize 后的字符串里找到位置后，需要映射回原始字符串的位置，才能对应到 `WordEntry.charOffset`。

```
normFull  = normalize(page.fullText)
normQuote = normalize(quote)
normIdx   = normFull.indexOf(normQuote)   // 在规范化字符串中的位置

// normToOrigOffset(orig, normTarget)：
// 遍历 orig 每个字符，统计"能进入 normalize 结果的字符"数 normCount
// 当 normCount === normTarget 时，返回当前在 orig 中的位置 i

charStart = normToOrigOffset(page.fullText, normIdx)
charEnd   = normToOrigOffset(page.fullText, normIdx + normQuote.length)
```

图解：

```
原始 fullText:  "乙方 应于，合同 签订后"
                 0123 4567 8 9012 345678
规范化:          "乙方应于合同签订后"
                  0123456789

normIdx = 0（从头开始）
normToOrigOffset(orig, 0) → 0   (charStart)
normToOrigOffset(orig, 9) → 13  (charEnd，跳过了空格和逗号)
```

### 筛选 WordEntry

```typescript
const matched = page.words.filter(
  w => w.charOffset >= charStart && w.charEnd <= charEnd + 1
);
```

`+1` 容差：应对 fullText 末尾无尾随空格时 charEnd 略小于 word.charEnd 的边界情况。

### 行分组 → PageRect[]

```typescript
// 以 4pt 为容差，将 Y 坐标相近的词归为同一行
const lineKey = Math.round(w.y / 4) * 4;

// 每行词合并为一个矩形
{
  x:      Math.min(...lineWords.map(w => w.x)),
  y:      Math.min(...lineWords.map(w => w.y)),
  width:  Math.max(...lineWords.map(w => w.x + w.width)) - x,
  height: Math.max(...lineWords.map(w => w.height)),
}

// 按 y 降序排列（PDF y 轴向上，视觉上从上到下）
rects.sort((a, b) => b.y - a.y)
```

多行 quote 示例（3行）：

```
┌────────────────────────────────┐  rect[0]: y=820, x=72, w=300, h=14
│ 乙方应于合同签订后30日内支付首期款项，    │
│ 并提交银行转账凭证。甲方在收到款项后     │  rect[1]: y=804, x=72, w=280, h=14
│ 七个工作日内出具收据。               │  rect[2]: y=788, x=72, w=200, h=14
└────────────────────────────────┘
```

### 跨页 fallback

当整段 quote 在单页内找不到时（quote 横跨两页页脚/页眉）：

```typescript
const cutLen = Math.floor(normQuote.length * 0.6);
// 取 quote 前60% 在第 p 页搜索
// 取 quote 后60% 在第 p+1 页搜索
// 两者都找到 → 返回 [spanA, spanB]（两个 Span，跨两页高亮）
```

### 返回值

```typescript
interface Span {
  pageIndex: number;   // 0-based 页码
  rects: PageRect[];   // PDF 用户空间坐标，一行一个 rect，从上到下
}

// resolveQuote 返回 Span[]
// 通常 1 个 Span（单页），跨页时 2 个，找不到时 []（不抛错）
```

---

## 步骤六：Issue 存储格式

`app.jsx triggerAnalysis` 最终写入 `issues` state 的数据结构：

```typescript
interface IssueItem {
  id: string;            // "ai-0", "ai-1", ...（原始LLM顺序）
  number: number;        // 显示编号（按页面位置排序后分配，从1开始）
  severity: 'high' | 'med' | 'low';
  category: string;      // LLM 返回的 category
  quote: string;         // LLM 返回的原文引用
  body: string;          // LLM 返回的问题分析
  recommendation: string;// LLM 返回的修改建议

  // 定位信息（由 resolveQuote 填充）
  loc: {
    docId: string;       // = file.id
    pageIndex?: number;  // 0-based，resolveQuote 找不到时缺省
    rects?: PageRect[];  // PDF 用户空间坐标，找不到时缺省
  };

  // 排序用辅助字段（不渲染）
  sourceIndex: number;   // LLM 返回的原始顺序
  sortPageIndex: number; // = loc.pageIndex，找不到时为 MAX_SAFE_INTEGER
  sortTop: number;       // = -rects[0].y（y越大=越靠上，取负使升序=从上到下）
}
```

### 排序逻辑

```javascript
.sort((a, b) =>
  a.sortPageIndex - b.sortPageIndex  // 先按页码升序
  || a.sortTop - b.sortTop           // 同页按视觉从上到下（-y 升序）
  || a.sourceIndex - b.sourceIndex   // 同位置保持 LLM 原序
)
```

排序后再分配 `number: idx + 1`，所以卡片编号与页面位置对应，而不是 LLM 返回顺序。

---

## 步骤七：高亮渲染与跳转

### 点击 issue 卡片后的调用链

```
IssueCard onClick → onJumpToIssue(it)           // chat.jsx
    │
    ▼ app.jsx
setActiveIssue(it.id)
PdfRealViewer.scrollToPageAndRect(it.loc.pageIndex, it.loc.rects)
    │                                             // viewer.tsx
    ├── setActiveHighlight({ pageIndex, rects })  // React state
    └── container.querySelector('[data-page="N"]').scrollIntoView({ smooth })
```

### HighlightOverlay 渲染

每个 `PdfPageCanvas` 渲染时：

```jsx
{viewport && highlightRects && highlightRects.length > 0 && (
  <HighlightOverlay rects={highlightRects} viewport={viewport} active={!!highlightActive}/>
)}
```

`HighlightOverlay`（`src/pdf/highlight.tsx`）对每个 `PageRect` 调用坐标转换后渲染：

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

坐标系说明：

```
PDF 用户空间           DOM 空间
┌──────────────┐      ┌──────────────┐
│              │  →   │ top=0        │
│  y↑          │      │              │
│  origin      │      │              │
│  bottom-left │      │  origin      │
└──────────────┘      │  top-left    │
  单位: 点             └──────────────┘
                        单位: CSS px
转换：
  DOM.left   = rect.x × scale
  DOM.top    = viewport.height − (rect.y + rect.height) × scale
```

### 渲染结果

```jsx
<div
  className="pdf-highlight active"   // active 时有脉冲动画
  style={{ position: 'absolute', left, top, width, height }}
/>
```

**找不到时的行为：** `loc.rects` 为空/缺省 → `scrollToPageAndRect` 不调用，`HighlightOverlay` 不渲染。issue 卡片正常显示，仅无高亮，不崩溃。

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

## 待实现

| 功能 | 状态 |
|---|---|
| Word / Excel / PPT 文本提取 | ❌ 显示"暂不支持" |
| 扫描件 OCR（无文字层 PDF） | ❌ 未实现 |
| issue 采纳 / 忽略持久化 | ❌ 按钮存在但无逻辑 |
| 大文件虚拟滚动（50+页） | ❌ 全量渲染 |
| analyze 流式进度 | ❌ one-shot，等待期间只有旋转动画 |
| 多文档关联 issue | ❌ `loc.docId` 字段已预留 |
