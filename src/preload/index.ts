import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  file: {
    openDialog: (opts?: { title?: string; extensions?: string[] }) =>
      ipcRenderer.invoke('file:open-dialog', opts),
    getDroppedPaths: (files: File[]): string[] =>
      files.map(file => webUtils.getPathForFile(file)).filter(Boolean),
    scanPaths: (paths: string[]) =>
      ipcRenderer.invoke('file:scan-paths', paths),
    read: (path: string) =>
      ipcRenderer.invoke('file:read', { path }),
    stat: (path: string) =>
      ipcRenderer.invoke('file:stat', { path }),
    parseRemote: (filePath: string): Promise<{ markdown: string }> =>
      ipcRenderer.invoke('file:parse-remote', filePath),
  },

  ai: {
    getConfig: (): Promise<{ baseUrl: string; apiKey: string; model: string }> =>
      ipcRenderer.invoke('ai:get-config'),

    setConfig: (patch: Partial<{ baseUrl: string; apiKey: string; model: string }>): Promise<void> =>
      ipcRenderer.invoke('ai:set-config', patch),

    analyze: (markdown: string): Promise<string> =>
      ipcRenderer.invoke('ai:analyze', markdown),

    chat: (
      messages: Array<{ role: string; content: string }>,
      onChunk: (text: string) => void,
      onDone: () => void,
      onError: (err: string) => void,
    ): (() => void) => {
      const reqId = Date.now().toString(36) + Math.random().toString(36).slice(2);

      const chunkH = (_: unknown, id: string, text: string) => { if (id === reqId) onChunk(text); };
      const doneH  = (_: unknown, id: string)              => { if (id === reqId) { cleanup(); onDone(); } };
      const errorH = (_: unknown, id: string, err: string) => { if (id === reqId) { cleanup(); onError(err); } };

      const cleanup = () => {
        ipcRenderer.removeListener('ai:chunk', chunkH);
        ipcRenderer.removeListener('ai:done',  doneH);
        ipcRenderer.removeListener('ai:error', errorH);
      };

      ipcRenderer.on('ai:chunk', chunkH);
      ipcRenderer.on('ai:done',  doneH);
      ipcRenderer.on('ai:error', errorH);
      ipcRenderer.send('ai:chat', reqId, messages);
      return cleanup;
    },
  },
});
