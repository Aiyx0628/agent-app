import * as React from 'react';
import { KIND_META } from './data';
import { Ic } from './icons';
import { ExcelPreview } from './preview_excel';
import { ImagePreview } from './preview_image';
import { PdfPreview } from './preview_pdf';
import { PptPreview, PPT_SLIDES } from './preview_ppt';
import { WordPreview } from './preview_word';

export function Preview({ file, zoomRef, scrollToRef }) {
  const [zoom, setZoom] = React.useState(100);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pptIdx, setPptIdx] = React.useState(0);
  const [runtimeMeta, setRuntimeMeta] = React.useState({});
  const [pageLayout, setPageLayout] = React.useState('single');
  const bodyRef = React.useRef(null);
  const pdfPreviewRef = React.useRef(null);
  const scale = zoom / 100;

  React.useImperativeHandle(zoomRef, () => ({ zoom, setZoom }));

  // Clear runtimeMeta and reset layout when switching files
  React.useEffect(() => {
    setRuntimeMeta({});
    setPageLayout('single');
  }, [file.id]);

  React.useImperativeHandle(scrollToRef, () => ({
    scrollToAnchor: (anchorId) => {
      const body = bodyRef.current;
      if (!body) return;
      const el = body.querySelector('#' + anchorId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1800);
    },
    scrollToPageAndRect: (pageIndex, rects) => {
      pdfPreviewRef.current?.scrollToPageAndRect(pageIndex, rects);
    },
  }));

  // Track current page (demo PDF only — real PDF uses canvas data-page)
  React.useEffect(() => {
    if (!bodyRef.current || file.kind !== 'pdf') return;
    const body = bodyRef.current;
    const onScroll = () => {
      const pages = body.querySelectorAll('.pdf-page, .pdf-canvas-page');
      const top = body.scrollTop + 120;
      let p = 1;
      pages.forEach((pg) => {
        const pageNum = parseInt(pg.dataset.page, 10);
        if (!isNaN(pageNum) && pg.offsetTop <= top) {
          // demo pages are 1-based, canvas pages are 0-based
          p = file.source === 'demo' ? pageNum : pageNum + 1;
        }
      });
      setCurrentPage(p);
    };
    body.addEventListener('scroll', onScroll);
    return () => body.removeEventListener('scroll', onScroll);
  }, [file.kind, file.source]);

  const kind = file.kind;
  const meta = KIND_META[kind] || KIND_META.pdf;
  const isRealPdf = kind === 'pdf' && file.source === 'local';

  const pagesTotal =
    runtimeMeta.pageCount ??
    (kind === 'pdf' ? (file.pages ?? null) : null);

  const pptTotal = runtimeMeta.pageCount ?? (file.source === 'demo' ? PPT_SLIDES.length : null);

  // Real PDF: scale is handled by canvas viewport — no CSS zoom needed
  // Demo PDF and other types: CSS zoom scales HTML content
  const cssZoom = isRealPdf || kind === 'excel' || kind === 'image' ? 1 : scale;

  return (
    <div className="pane center">
      <div className="cp-toolbar">
        <div className="doc-type" style={{ color: meta.color }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2, background: meta.color, display: 'inline-block'
          }}/>
          {meta.label}
        </div>
        <div className="doc-name">{file.name}</div>
        <div className="spacer"/>
        {kind === 'pdf' && pagesTotal != null && (
          <div className="pager">
            <span>{String(currentPage).padStart(2, '0')}</span>
            <span className="sep">/</span>
            <span>{String(pagesTotal).padStart(2, '0')} 页</span>
          </div>
        )}
        {kind === 'ppt' && pptTotal != null && (
          <div className="pager">
            <span>{String(pptIdx + 1).padStart(2, '0')}</span>
            <span className="sep">/</span>
            <span>{String(pptTotal).padStart(2, '0')}</span>
          </div>
        )}
        {isRealPdf && (
          <button
            className={`tb-btn${pageLayout === 'double' ? ' active' : ''}`}
            title="双页展示"
            onClick={() => setPageLayout(l => l === 'single' ? 'double' : 'single')}
          >
            ⊞ 双页
          </button>
        )}
        <div className="zoom">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))}><Ic.minus/></button>
          <div className="val">{zoom}%</div>
          <button onClick={() => setZoom(z => Math.min(250, z + 10))}><Ic.plus/></button>
        </div>
      </div>
      <div className="cp-body" ref={bodyRef}>
        <div className="cp-scroll-wrap">
          <div className="cp-scroll" style={{ zoom: cssZoom }}>
            {kind === 'pdf'   && <PdfPreview   ref={pdfPreviewRef} file={file} onMetaChange={setRuntimeMeta} scale={scale} pageLayout={pageLayout}/>}
            {kind === 'word'  && <WordPreview  file={file} onMetaChange={setRuntimeMeta}/>}
            {kind === 'excel' && <ExcelPreview file={file} onMetaChange={setRuntimeMeta}/>}
            {kind === 'ppt'   && <PptPreview   file={file} slideIdx={pptIdx} setSlideIdx={setPptIdx} onMetaChange={setRuntimeMeta}/>}
            {kind === 'image' && <ImagePreview file={file} onMetaChange={setRuntimeMeta}/>}
          </div>
        </div>
      </div>
    </div>
  );
}
