import * as React from 'react';

export function ImagePreview() {
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
