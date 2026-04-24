import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fetch as undiciFetch, FormData as UndiciFormData } from 'undici';

const PARSE_SERVICE_URL = 'http://121.40.89.172:8893/file_parse';

const EXT_KIND_MAP: Record<string, string> = {
  '.pdf': 'pdf',
  '.docx': 'word',
  '.doc': 'word',
  '.xlsx': 'excel',
  '.xls': 'excel',
  '.pptx': 'ppt',
  '.ppt': 'ppt',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.svg': 'image',
};

async function scanPath(entryPath: string): Promise<any | null> {
  const stat = await fs.stat(entryPath);
  const name = path.basename(entryPath);

  if (stat.isDirectory()) {
    const children = await fs.readdir(entryPath);
    const scanned = await Promise.all(
      children
        .filter(child => !child.startsWith('.'))
        .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
        .map(child => scanPath(path.join(entryPath, child)).catch(() => null)),
    );
    return {
      name,
      path: entryPath,
      type: 'folder',
      children: scanned.filter(Boolean),
    };
  }

  if (!stat.isFile()) return null;

  const ext = path.extname(name).toLowerCase();
  const kind = EXT_KIND_MAP[ext];
  if (!kind) return null;

  return {
    name,
    path: entryPath,
    type: 'file',
    kind,
  };
}

export function registerFileIpcHandlers(): void {
  ipcMain.handle('file:open-dialog', async (_, opts: { title?: string; extensions?: string[] } = {}) => {
    const result = await dialog.showOpenDialog({
      title: opts.title ?? '选择文件',
      properties: ['openFile', 'openDirectory', 'multiSelections'],
      filters: opts.extensions
        ? [{ name: 'Documents', extensions: opts.extensions }]
        : [{ name: 'All Files', extensions: ['*'] }],
    });
    return { canceled: result.canceled, paths: result.filePaths };
  });

  ipcMain.handle('file:read', async (_, { path: filePath }: { path: string }) => {
    const [stat, bytes] = await Promise.all([
      fs.stat(filePath),
      fs.readFile(filePath),
    ]);
    return {
      bytes: new Uint8Array(bytes),
      mtime: stat.mtimeMs,
      size: stat.size,
    };
  });

  ipcMain.handle('file:stat', async (_, { path: filePath }: { path: string }) => {
    try {
      const stat = await fs.stat(filePath);
      return { size: stat.size, mtime: stat.mtimeMs, exists: true };
    } catch {
      return { size: 0, mtime: 0, exists: false };
    }
  });

  ipcMain.handle('file:scan-paths', async (_, paths: string[]) => {
    const scanned = await Promise.all(
      paths.map(entryPath => scanPath(entryPath).catch(() => null)),
    );
    return scanned.filter(Boolean);
  });

  ipcMain.handle('file:parse-remote', async (_, filePath: string): Promise<{ markdown: string }> => {
    const [bytes, name] = await Promise.all([fs.readFile(filePath), Promise.resolve(path.basename(filePath))]);
    const formData = new UndiciFormData();
    formData.append('files', new Blob([bytes]), name);
    formData.append('format', 'markdown');
    formData.append('backend', 'pipeline');
    formData.append('return_images', 'false');

    const resp = await undiciFetch(PARSE_SERVICE_URL, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    });
    if (!resp.ok) throw new Error(`文档解析服务错误: HTTP ${resp.status}`);

    const result = await resp.json() as Record<string, any>;
    if (result.results && typeof result.results === 'object') {
      for (const fileData of Object.values(result.results) as any[]) {
        if (fileData?.md_content) return { markdown: fileData.md_content as string };
      }
    }
    throw new Error('解析服务未返回有效内容');
  });
}
