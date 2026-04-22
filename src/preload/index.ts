import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  file: {
    openDialog: (opts?: { title?: string; extensions?: string[] }) =>
      ipcRenderer.invoke('file:open-dialog', opts),
    read: (path: string) =>
      ipcRenderer.invoke('file:read', { path }),
    stat: (path: string) =>
      ipcRenderer.invoke('file:stat', { path }),
  },
});
