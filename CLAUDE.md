# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Use the project-local Node runtime
NPM=/Users/zzp/sdk/node/node-v24.13.0-darwin-arm64/bin/npm
NPX=/Users/zzp/sdk/node/node-v24.13.0-darwin-arm64/bin/npx

npm start          # dev mode (electron-forge start, hot-reload renderer only)
npx tsc --noEmit   # type-check (no test suite exists)
npm run lint       # eslint .ts/.tsx/.js/.jsx
npm run make       # package → out/
```

There is no test suite. Type-check with `tsc --noEmit` before committing.

## Architecture

### Process Boundary

Electron runs two isolated processes that communicate only via IPC:

- **Main process** (`src/main/`) — Node.js, full file-system and network access. IPC handlers registered in `main.ts` at startup: `registerFileIpcHandlers()` and `registerAiIpcHandlers()`.
- **Renderer process** (`src/renderer/`) — sandboxed browser (contextIsolation + sandbox = true, no nodeIntegration). All Node access goes through `window.api` which is exposed by the preload bridge.
- **Preload** (`src/preload/index.ts`) — thin contextBridge layer; the only place that can call `ipcRenderer`. Defines the `window.api` surface that the renderer consumes.

Adding a new backend capability requires changes in three places: main IPC handler → preload bridge → `ElectronAPI` type in `types.ts`.

### IPC Channels

| Channel | Direction | Type | Purpose |
|---|---|---|---|
| `file:open-dialog` | renderer → main | handle | Native file picker |
| `file:read` | renderer → main | handle | Read file bytes + stat |
| `file:stat` | renderer → main | handle | File stat only |
| `ai:get-config` | renderer → main | handle | Load AI config from userData |
| `ai:set-config` | renderer → main | handle | Save AI config |
| `ai:analyze` | renderer → main | handle | One-shot contract analysis, returns JSON string |
| `ai:chat` | renderer → main | send | Start streaming chat; main pushes `ai:chunk` / `ai:done` / `ai:error` back |

### AI Layer (`src/main/ipc/ai.ts`)

Config persisted to `app.getPath('userData')/ai-config.json`. Fields: `baseUrl`, `apiKey`, `model`, `proxyUrl`, `timeout` (ms, default 60 000).

HTTP proxy uses `setGlobalDispatcher(new ProxyAgent(url))` from `undici` — this patches the global fetch dispatcher used by the openai SDK. Proxy is re-applied only when `proxyUrl` changes.

`ai:analyze` sends all page texts with `[第N页]` markers to the LLM. It tries `response_format: json_object` first and falls back to plain completion on HTTP 400 (for models that don't support it).

`ai:chat` streams via `for await (chunk of stream)` and pushes each text delta as `ai:chunk`. The preload multiplexes concurrent requests via a per-request `reqId`.

### PDF Pipeline (`src/pdf/`)

Four-stage pipeline, all running in the renderer:

1. **engine.ts** — `loadPdf(bytes)`: initialises pdfjs worker (loaded as `asset/resource` via webpack so `require()` returns a URL string), returns `PDFDocumentProxy`.
2. **parser.ts** — `parsePdf(doc, docId)`: extracts text items per page. Each `WordEntry` stores PDF user-space coords (`x`, `y` from `transform[4/5]`) plus `charOffset`/`charEnd` — its position in the page's `fullText` string. Called after canvas render starts (non-blocking).
3. **locator.ts** — `resolveQuote(quote, hintPage, parsed)`: finds AI-returned quote text in `ParsedDocument`. Normalises both strings (strip punctuation/whitespace), searches from hintPage outward, maps back to `WordEntry[]`, groups by Y-line into `PageRect[]`. Returns `[]` (not an error) when not found.
4. **coordinator.ts** — `pdfRectToDom(rect, viewport)`: converts PDF user-space (bottom-left origin, points) to DOM space (top-left origin, CSS px).
5. **viewer.tsx** / **page.tsx** / **highlight.tsx** — React components for rendering canvas + text layer + annotation layer + issue highlight overlay. `PdfRealViewer` exposes `scrollToPageAndRect` via `useImperativeHandle`.

### Renderer State Machine (`src/renderer/app.jsx`)

Central state lives in `App`:
- `activeId` — selected file ID
- `parsedDoc` — `ParsedDocument | null`, populated by `PdfPreview.onParsed` callback after PDF loads
- `analysisStatus` — `'idle' | 'analyzing' | 'done' | 'error'`
- `issues` — `IssueItem[]`, each with a `loc: IssueLocation` containing `pageIndex + rects[]` from `resolveQuote`

Switching `activeId` resets all analysis state. `triggerAnalysis` calls `window.api.ai.analyze(pageTexts)`, parses the JSON result, runs `resolveQuote` per issue, and sets `issues`.

### Three-Panel Layout

```
App
├── FileTree (left, draggable width)
├── Preview (center) → routes to PdfPreview / WordPreview / etc. by file.kind
│     └── PdfPreview → PdfRealViewer (canvas + layers) + calls onParsed
└── Chat (right, draggable width)
      ├── AiSettings panel (gear icon, saves to main via IPC)
      ├── Tab: 问题清单 → IssueCard list, driven by analysisStatus prop
      └── Tab: 对话 → streaming chat via window.api.ai.chat()
```

### Coordinate Systems

PDF user space: origin bottom-left, y-axis up, unit = points.
DOM space: origin top-left, y-axis down, unit = CSS px.
Conversion: `coordinator.ts:pdfRectToDom` using `viewport.height - (rect.y + rect.height) * scale`.

### Styling

Single CSS file: `src/renderer/styles.css`. Color system uses OKLCH throughout (defined as CSS custom properties in `:root`). Severity colours: `--sev-high` (red), `--sev-med` (amber), `--sev-low` (blue). Density and accent tweaks applied via `body.density-*` / `body.accent-*` classes by `tweaks.jsx`.
