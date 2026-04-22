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
  const bodyRef = React.useRef(null);
  const scale = zoom / 100;

  React.useImperativeHandle(zoomRef, () => ({ zoom, setZoom }));

  // Expose scrollToAnchor
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
  }));

  // Track current page (PDF only)
  React.useEffect(() => {
    if (!bodyRef.current || file.kind !== 'pdf') return;
    const body = bodyRef.current;
    const onScroll = () => {
      const pages = body.querySelectorAll('.pdf-page');
      const top = body.scrollTop + 120;
      let p = 1;
      pages.forEach((pg) => {
        if (pg.offsetTop <= top) p = parseInt(pg.dataset.page, 10);
      });
      setCurrentPage(p);
    };
    body.addEventListener('scroll', onScroll);
    return () => body.removeEventListener('scroll', onScroll);
  }, [file.kind]);

  const kind = file.kind;
  const meta = KIND_META[kind] || KIND_META.pdf;

  const pagesTotal = kind === 'pdf' ? (file.pages || 5) : kind === 'ppt' ? 24 : null;

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
        {kind === 'pdf' && (
          <div className="pager">
            <span>{String(currentPage).padStart(2, '0')}</span>
            <span className="sep">/</span>
            <span>{String(pagesTotal).padStart(2, '0')} 页</span>
          </div>
        )}
        {kind === 'ppt' && (
          <div className="pager">
            <span>{String(pptIdx + 1).padStart(2, '0')}</span><span className="sep">/</span><span>{String(PPT_SLIDES.length).padStart(2, '0')}</span>
          </div>
        )}
        <div className="zoom">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))}><Ic.minus/></button>
          <div className="val">{zoom}%</div>
          <button onClick={() => setZoom(z => Math.min(250, z + 10))}><Ic.plus/></button>
        </div>
      </div>
      <div className="cp-body" ref={bodyRef}>
        <div className="cp-scroll-wrap">
          <div className="cp-scroll" style={{
            zoom: kind === 'excel' || kind === 'image' ? 1 : scale,
          }}>
            {kind === 'pdf' && <PdfPreview/>}
            {kind === 'word' && <WordPreview/>}
            {kind === 'excel' && <ExcelPreview/>}
            {kind === 'ppt' && <PptPreview slideIdx={pptIdx} setSlideIdx={setPptIdx}/>}
            {kind === 'image' && <ImagePreview/>}
          </div>
        </div>
      </div>
    </div>
  );
}
