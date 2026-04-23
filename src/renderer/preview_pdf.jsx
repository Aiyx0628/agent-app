import * as React from 'react';
import { Ic } from './icons';
import { loadPdf } from '../pdf/engine';
import { parsePdf } from '../pdf/parser';
import { PdfRealViewer } from '../pdf/viewer';

export const PdfPreview = React.forwardRef(function PdfPreview(
  { file, onMetaChange, onParsed, scale = 1, pageLayout = 'single' },
  ref,
) {
  const [status, setStatus] = React.useState('idle');
  const [error, setError] = React.useState(null);
  const [docProxy, setDocProxy] = React.useState(null);
  const viewerRef = React.useRef(null);

  React.useImperativeHandle(ref, () => ({
    scrollToPageAndRect: (pageIndex, rects) => {
      viewerRef.current?.scrollToPageAndRect(pageIndex, rects);
    },
  }));

  React.useEffect(() => {
    if (file.source !== 'local') return;
    setStatus('loading');
    setDocProxy(null);

    let cancelled = false;
    (async () => {
      try {
        const { bytes, size, mtime } = await window.api.file.read(file.path);
        if (cancelled) return;
        const doc = await loadPdf(bytes);
        if (cancelled) return;
        onMetaChange?.({ size, mtime, pageCount: doc.numPages });
        setDocProxy(doc);
        setStatus('ready');
        // parse text index after canvas render starts (non-blocking)
        parsePdf(doc, file.id).then(parsed => { if (!cancelled) onParsed?.(parsed); });
      } catch (e) {
        if (!cancelled) { setStatus('error'); setError(e.message); }
      }
    })();

    return () => { cancelled = true; };
  }, [file.id]);

  if (file.source !== 'local') {
    return (
      <div className="preview-empty">
        <div className="empty-icon">📄</div>
        <div>请通过左侧 + 按钮添加 PDF 文件</div>
      </div>
    );
  }

  if (status === 'idle' || status === 'loading') {
    return <div className="preview-loading"><div className="loading-spinner"/></div>;
  }

  if (status === 'error') {
    return (
      <div className="preview-error">
        <div className="err-icon"><Ic.alert/></div>
        <div>无法加载文件</div>
        <div className="err-msg">{error}</div>
        <button className="retry-btn" onClick={() => setStatus('idle')}>重试</button>
      </div>
    );
  }

  return (
    <PdfRealViewer
      ref={viewerRef}
      doc={docProxy}
      scale={scale}
      pageLayout={pageLayout}
      onPageCountChange={(count) => onMetaChange?.({ pageCount: count })}
    />
  );
});
