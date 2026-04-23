import * as React from 'react';
import { TextLayer, AnnotationLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from 'pdfjs-dist';
import type { PageRect } from '../renderer/types';
import { HighlightOverlay } from './highlight';

// 最小 linkService 实现，满足 AnnotationLayer 所需接口
const MINIMAL_LINK_SERVICE = {
  externalLinkTarget: null,
  externalLinkRel: '',
  externalLinkEnabled: true,
  goToDestination: async () => {},
  goToPage: () => {},
  getDestinationHash: () => '',
  getAnchorUrl: (hash: string) => `#${hash}`,
  setHash: () => {},
  executeNamedAction: () => {},
  cachePageRef: () => {},
  isPageVisible: () => true,
  isPageCached: () => false,
  pagesCount: 0,
  page: 1,
  rotation: 0,
} as any;

interface PdfPageCanvasProps {
  doc: PDFDocumentProxy;
  pageIndex: number;
  scale: number;
  highlightRects?: PageRect[];
  highlightActive?: boolean;
}

async function renderTextLayer(page: PDFPageProxy, container: HTMLDivElement, logicalVp: PageViewport): Promise<TextLayer | null> {
  container.innerHTML = '';
  const layer = new TextLayer({
    textContentSource: page.streamTextContent({ includeMarkedContent: true }),
    container,
    viewport: logicalVp,
  });
  await layer.render();
  return layer;
}

async function renderAnnotationLayer(page: PDFPageProxy, container: HTMLDivElement, logicalVp: PageViewport): Promise<void> {
  container.innerHTML = '';
  const annotations = await page.getAnnotations({ intent: 'display' as any });
  if (!annotations.length) return;

  const annotLayer = new AnnotationLayer({
    div: container as HTMLDivElement,
    accessibilityManager: null as any,
    annotationCanvasMap: null as any,
    annotationEditorUIManager: null as any,
    annotationStorage: null as any,
    page: page as any,
    viewport: logicalVp.clone({ dontFlip: true }),
    structTreeLayer: null as any,
    commentManager: null as any,
    linkService: MINIMAL_LINK_SERVICE,
  });

  await annotLayer.render({
    viewport: logicalVp,
    div: container as HTMLDivElement,
    annotations,
    page: page as any,
    linkService: MINIMAL_LINK_SERVICE,
    renderForms: false,
    imageResourcesPath: '',
    enableScripting: false,
    hasJSActions: false,
    fieldObjects: null as any,
    downloadManager: null as any,
  });
}

export function PdfPageCanvas({ doc, pageIndex, scale, highlightRects, highlightActive }: PdfPageCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const textLayerRef = React.useRef<HTMLDivElement>(null);
  const annotLayerRef = React.useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = React.useState<PageViewport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const page = await doc.getPage(pageIndex + 1); // pdfjs is 1-based
        const dpr = window.devicePixelRatio || 1;
        const logicalVp = page.getViewport({ scale });
        const renderVp = page.getViewport({ scale: scale * dpr });
        if (cancelled) return;

        // ── Canvas ──
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.floor(renderVp.width);
        canvas.height = Math.floor(renderVp.height);
        canvas.style.width = Math.floor(logicalVp.width) + 'px';
        canvas.style.height = Math.floor(logicalVp.height) + 'px';
        await page.render({ canvasContext: ctx, viewport: renderVp, canvas }).promise;
        if (cancelled) return;

        // ── Text layer ──
        const textEl = textLayerRef.current!;
        textEl.style.width = Math.floor(logicalVp.width) + 'px';
        textEl.style.height = Math.floor(logicalVp.height) + 'px';
        await renderTextLayer(page, textEl, logicalVp);
        if (cancelled) return;

        // ── Annotation layer (best effort) ──
        const annotEl = annotLayerRef.current!;
        annotEl.style.width = Math.floor(logicalVp.width) + 'px';
        annotEl.style.height = Math.floor(logicalVp.height) + 'px';
        try {
          await renderAnnotationLayer(page, annotEl, logicalVp);
        } catch { /* annotation layer is optional */ }
        if (cancelled) return;

        setViewport(logicalVp);
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
      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        <canvas ref={canvasRef}/>
        <div ref={textLayerRef} className="pdfTextLayer"/>
        <div ref={annotLayerRef} className="pdfAnnotationLayer"/>
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
