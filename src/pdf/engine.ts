import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

function ensureWorker(): void {
  if (workerInitialized) return;
  // webpack asset/resource rule converts this require to a file URL string
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const workerUrl: string = require('pdfjs-dist/build/pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  workerInitialized = true;
}

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  ensureWorker();
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  return loadingTask.promise;
}

export { pdfjsLib };
