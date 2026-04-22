import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';

export function registerFileIpcHandlers(): void {
  ipcMain.handle('file:open-dialog', async (_, opts: { title?: string; extensions?: string[] } = {}) => {
    const result = await dialog.showOpenDialog({
      title: opts.title ?? '选择文件',
      properties: ['openFile', 'multiSelections'],
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
}
