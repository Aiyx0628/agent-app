import * as React from 'react';
import type { PageViewport } from 'pdfjs-dist';
import type { PageRect } from '../renderer/types';
import { pdfRectToDom } from './coordinator';

interface HighlightOverlayProps {
  rects: PageRect[];
  viewport: PageViewport;
  active: boolean;
}

export function HighlightOverlay({ rects, viewport, active }: HighlightOverlayProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {rects.map((r, i) => {
        const dom = pdfRectToDom(r, viewport);
        return (
          <div
            key={i}
            className={`pdf-highlight ${active ? 'active' : ''}`}
            style={{
              position: 'absolute',
              left: dom.left,
              top: dom.top,
              width: dom.width,
              height: dom.height,
            }}
          />
        );
      })}
    </div>
  );
}
