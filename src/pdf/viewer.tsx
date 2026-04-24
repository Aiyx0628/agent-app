import * as React from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PageRect } from '../renderer/types';
import { PdfPageCanvas } from './page';

interface ActiveHighlight {
  pageIndex: number;
  rects: PageRect[];
}

export interface PdfViewerHandle {
  scrollToPageAndRect(pageIndex: number, rects: PageRect[]): void;
}

interface PdfRealViewerProps {
  doc: PDFDocumentProxy;
  scale: number;
  pageLayout?: 'single' | 'double';
  onPageCountChange?(count: number): void;
}

export const PdfRealViewer = React.forwardRef<PdfViewerHandle, PdfRealViewerProps>(
  function PdfRealViewer({ doc, scale, pageLayout = 'single', onPageCountChange }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [activeHighlight, setActiveHighlight] = React.useState<ActiveHighlight | null>(null);
    const pageCount = doc.numPages;

    React.useEffect(() => {
      onPageCountChange?.(pageCount);
    }, [pageCount]);

    React.useImperativeHandle(ref, () => ({
      scrollToPageAndRect(pageIndex: number, rects: PageRect[]) {
        setActiveHighlight({ pageIndex, rects });
        const container = containerRef.current;
        if (!container) return;
        const scrollHost = container.closest<HTMLElement>('.cp-body');
        if (!scrollHost) return;

        const pageEl = container.querySelector<HTMLElement>(`[data-page="${pageIndex}"]`);
        if (!pageEl) return;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const targetEl = pageEl.querySelector<HTMLElement>('.pdf-highlight.active') ?? pageEl;
            const hostRect = scrollHost.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const targetTop = scrollHost.scrollTop + targetRect.top - hostRect.top - 96;
            const maxScroll = scrollHost.scrollHeight - scrollHost.clientHeight;

            scrollHost.scrollTo({
              top: Math.max(0, Math.min(maxScroll, targetTop)),
              behavior: 'smooth',
            });
          });
        });
      },
    }));

    const pageProps = (i: number) => ({
      key: i,
      doc,
      pageIndex: i,
      scale,
      highlightRects: activeHighlight?.pageIndex === i ? activeHighlight.rects : undefined,
      highlightActive: activeHighlight?.pageIndex === i,
    });

    if (pageLayout === 'double') {
      const pairs: [number, number | null][] = [];
      for (let i = 0; i < pageCount; i += 2) {
        pairs.push([i, i + 1 < pageCount ? i + 1 : null]);
      }
      return (
        <div className="pdf-real-scroll" ref={containerRef}>
          {pairs.map(([a, b], pairIdx) => (
            <div key={pairIdx} className="pdf-double-row">
              <PdfPageCanvas {...pageProps(a)}/>
              {b !== null && <PdfPageCanvas {...pageProps(b)}/>}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="pdf-real-scroll" ref={containerRef}>
        {Array.from({ length: pageCount }, (_, i) => (
          <PdfPageCanvas {...pageProps(i)}/>
        ))}
      </div>
    );
  }
);
