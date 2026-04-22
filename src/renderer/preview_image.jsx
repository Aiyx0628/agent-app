import * as React from 'react';
import { Ic } from './icons';

const MIME_MAP = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
};

function ImageDemoContent() {
  return (
    <div className="img-frame">
      <div className="img-canvas">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: 'var(--ink-2)', marginBottom: 8 }}>◇  系统架构图  ◇</div>
          <div>drop 1920×1080 architecture diagram here</div>
        </div>
        <div className="corner-tag" style={{ top: 10, left: 10, background: 'oklch(0.95 0.02 255)', color: 'var(--accent-ink)' }}>
          PNG · 1.4 MB
        </div>
        <div className="corner-tag" style={{ top: 10, right: 10, background: 'oklch(0.95 0.02 145)', color: 'oklch(0.38 0.12 145)' }}>
          1920 × 1080
        </div>
      </div>
      <div className="img-meta">
        <span>系统架构图.png</span>
        <span>· 修改于 2026-04-12 14:02</span>
        <span>· 未审阅</span>
      </div>
    </div>
  );
}

export function ImagePreview({ file, onMetaChange }) {
  const [status, setStatus] = React.useState('idle');
  const [objectUrl, setObjectUrl] = React.useState(null);
  const [error, setError] = React.useState(null);
  const urlRef = React.useRef(null);

  React.useEffect(() => {
    if (file.source === 'demo') return;
    setStatus('loading');
    window.api.file.read(file.path)
      .then(({ bytes, size, mtime }) => {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
        const blob = new Blob([bytes], { type: MIME_MAP[ext] ?? 'image/png' });
        const url = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setObjectUrl(url);
        onMetaChange?.({ size, mtime });
        setStatus('loaded');
      })
      .catch(err => { setStatus('error'); setError(err.message); });
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, [file.id]);

  if (file.source === 'demo') return <ImageDemoContent/>;

  const frame = (children) => (
    <div className="img-frame">
      <div className="img-canvas" style={{ position: 'relative' }}>
        {children}
      </div>
      <div className="img-meta">
        <span>{file.name}</span>
      </div>
    </div>
  );

  if (status === 'idle' || status === 'loading') {
    return frame(<div className="img-loading-ring"/>);
  }

  if (status === 'error') {
    return (
      <div className="preview-error">
        <div className="err-icon"><Ic.alert/></div>
        <div>无法加载图片</div>
        <div className="err-msg">{error}</div>
        <button className="retry-btn" onClick={() => setStatus('idle')}>重试</button>
      </div>
    );
  }

  return frame(
    <img
      src={objectUrl}
      alt={file.name}
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
    />
  );
}
