import type { ParsedDocument, WordEntry } from './parser';
import type { PageRect } from '../renderer/types';

export interface Span {
  pageIndex: number;
  rects: PageRect[];
}

function normalize(t: string): string {
  return t.replace(/[\s　，。！？；：""''【】（）《》、…—,.!?;:'"()\[\]{}]/g, '');
}

// Map a position in the normalized string back to the original string's char index
function normToOrigOffset(orig: string, normTarget: number): number {
  let normCount = 0;
  for (let i = 0; i < orig.length; i++) {
    if (normCount === normTarget) return i;
    if (normalize(orig[i]).length > 0) normCount++;
  }
  return orig.length;
}

function wordsToRects(words: WordEntry[]): PageRect[] {
  if (words.length === 0) return [];

  // Group by line using Y coordinate (4pt tolerance)
  const lines = new Map<number, WordEntry[]>();
  for (const w of words) {
    const key = Math.round(w.y / 4) * 4;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key)!.push(w);
  }

  const rects: PageRect[] = [];
  for (const lineWords of lines.values()) {
    const x = Math.min(...lineWords.map(w => w.x));
    const y = Math.min(...lineWords.map(w => w.y));
    const right = Math.max(...lineWords.map(w => w.x + w.width));
    const h = Math.max(...lineWords.map(w => w.height));
    rects.push({ x, y, width: right - x, height: h });
  }

  // Sort rects top-to-bottom (PDF y goes up, so sort descending)
  return rects.sort((a, b) => b.y - a.y);
}

function searchInPage(normQuote: string, pageIndex: number, parsed: ParsedDocument): Span | null {
  const page = parsed.pages[pageIndex];
  if (!page) return null;

  const normFull = normalize(page.fullText);
  const idx = normFull.indexOf(normQuote);
  if (idx === -1) return null;

  const charStart = normToOrigOffset(page.fullText, idx);
  const charEnd = normToOrigOffset(page.fullText, idx + normQuote.length);

  const matched = page.words.filter(w => w.charOffset >= charStart && w.charEnd <= charEnd + 1);
  if (matched.length === 0) return null;

  return { pageIndex, rects: wordsToRects(matched) };
}

export function resolveQuote(
  quote: string,
  hintPage: number,   // 1-based, AI-provided
  parsed: ParsedDocument,
): Span[] {
  const normQuote = normalize(quote);
  if (!normQuote) return [];

  const totalPages = parsed.pages.length;
  const hint0 = Math.max(0, Math.min(totalPages - 1, hintPage - 1));

  // Build search order: hint page first, then expanding outward
  const tried = new Set<number>();
  const order: number[] = [];
  for (let delta = 0; delta <= totalPages; delta++) {
    for (const candidate of [hint0 - delta, hint0 + delta]) {
      if (candidate >= 0 && candidate < totalPages && !tried.has(candidate)) {
        tried.add(candidate);
        order.push(candidate);
      }
    }
  }

  for (const pageIndex of order) {
    const span = searchInPage(normQuote, pageIndex, parsed);
    if (span) return [span];
  }

  // Cross-page fallback: try matching first 60% of quote on page N, rest on N+1
  const cutLen = Math.floor(normQuote.length * 0.6);
  if (cutLen > 3) {
    const front = normQuote.slice(0, cutLen);
    const back = normQuote.slice(-cutLen);
    for (let p = 0; p < totalPages - 1; p++) {
      const spanA = searchInPage(front, p, parsed);
      const spanB = searchInPage(back, p + 1, parsed);
      if (spanA && spanB) return [spanA, spanB];
    }
  }

  return [];
}
