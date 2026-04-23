import * as React from 'react';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';
import type { PageRect } from '../renderer/types';
import { HighlightOverlay } from './highlight';

interface PdfPageCanvasProps {
  doc: PDFDocumentProxy;
  pageIndex: number;
  scale: number;
  highlightRects?: PageRect[];
  highlightActive?: boolean;
}

export function PdfPageCanvas({ doc, pageIndex, scale, highlightRects, highlightActive }: PdfPageCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = React.useState<PageViewport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const page = await doc.getPage(pageIndex + 1); // pdfjs is 1-based
        const dpr = window.devicePixelRatio || 1;
        // logicalVp 用于坐标计算和 CSS 尺寸，renderVp 用于 canvas 物理像素
        const logicalVp = page.getViewport({ scale });
        const renderVp = page.getViewport({ scale: scale * dpr });
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 物理像素按 DPR 放大，CSS 尺寸保持逻辑尺寸
        canvas.width = Math.floor(renderVp.width);
        canvas.height = Math.floor(renderVp.height);
        canvas.style.width = Math.floor(logicalVp.width) + 'px';
        canvas.style.height = Math.floor(logicalVp.height) + 'px';

        await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;
        if (!cancelled) setViewport(logicalVp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [doc, pageIndex, scale]);

  return (
    <div
      className="pdf-canvas-page"
      data-page={pageIndex}
      style={{ minHeight: viewport ? Math.floor(viewport.height) : 1000 }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas ref={canvasRef}/>
        {viewport && highlightRects && highlightRects.length > 0 && (
          <HighlightOverlay
            rects={highlightRects}
            viewport={viewport}
            active={!!highlightActive}
          />
        )}
      </div>
      {error && (
        <div style={{ padding: 12, color: 'var(--sev-high)', fontSize: 12 }}>
          第 {pageIndex + 1} 页渲染失败: {error}
        </div>
      )}
    </div>
  );
}
