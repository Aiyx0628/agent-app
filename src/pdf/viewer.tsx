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
  onPageCountChange?(count: number): void;
}

export const PdfRealViewer = React.forwardRef<PdfViewerHandle, PdfRealViewerProps>(
  function PdfRealViewer({ doc, scale, onPageCountChange }, ref) {
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
        const pageEl = container.querySelector<HTMLElement>(`[data-page="${pageIndex}"]`);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
    }));

    return (
      <div className="pdf-real-scroll" ref={containerRef}>
        {Array.from({ length: pageCount }, (_, i) => (
          <PdfPageCanvas
            key={i}
            doc={doc}
            pageIndex={i}
            scale={scale}
            highlightRects={activeHighlight?.pageIndex === i ? activeHighlight.rects : undefined}
            highlightActive={activeHighlight?.pageIndex === i}
          />
        ))}
      </div>
    );
  }
);
