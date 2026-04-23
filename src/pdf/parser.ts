import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface WordEntry {
  pageIndex: number;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  charOffset: number;
  charEnd: number;
}

export interface ParsedPage {
  pageIndex: number;
  fullText: string;
  words: WordEntry[];
}

export interface ParsedDocument {
  docId: string;
  pages: ParsedPage[];
}

export async function parsePdf(doc: PDFDocumentProxy, docId: string): Promise<ParsedDocument> {
  const pages: ParsedPage[] = [];

  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const content = await page.getTextContent({ includeMarkedContent: false } as any);

    const words: WordEntry[] = [];
    let fullText = '';
    let prevRight = -Infinity;
    let prevY = -Infinity;

    for (const item of content.items as any[]) {
      const str: string = item.str ?? '';
      if (!str.trim()) continue;

      const t = item.transform as number[];
      const x = t[4];
      const y = t[5];
      const w = item.width as number;
      const h = (item.height as number) || Math.abs(t[3]);

      // Insert newline when Y changes significantly, space when X gap > threshold
      const yDiff = Math.abs(y - prevY);
      if (fullText.length > 0) {
        if (yDiff > h * 0.5) {
          fullText += '\n';
        } else if (x - prevRight > h * 0.3) {
          fullText += ' ';
        }
      }

      const charOffset = fullText.length;
      fullText += str;
      const charEnd = fullText.length;

      words.push({ pageIndex: i, str, x, y, width: w, height: h, charOffset, charEnd });

      prevRight = x + w;
      prevY = y;
    }

    pages.push({ pageIndex: i, fullText, words });
  }

  return { docId, pages };
}
