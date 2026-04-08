import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc';
import type { AppApi } from '../shared/types';

const api: AppApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IpcChannels.APP_GET_VERSION),
  },
  workspace: {
    selectDirectory: () => ipcRenderer.invoke(IpcChannels.WORKSPACE_SELECT_DIRECTORY),
    getCurrentWorkspace: () => ipcRenderer.invoke(IpcChannels.WORKSPACE_GET_CURRENT),
  },
};

contextBridge.exposeInMainWorld('api', api);
