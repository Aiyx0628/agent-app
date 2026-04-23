import type { PageViewport } from 'pdfjs-dist';
import type { PageRect } from '../renderer/types';

export interface DomRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// PDF 用户空间：左下原点，y 向上，单位=点 → DOM：左上原点，y 向下，单位=CSS px
export function pdfRectToDom(rect: PageRect, viewport: PageViewport): DomRect {
  const scale = viewport.scale;
  return {
    left: rect.x * scale,
    top: viewport.height - (rect.y + rect.height) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
