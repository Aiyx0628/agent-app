import { ipcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc';
import * as workspaceService from '../services/workspaceService';

export function registerWorkspaceIpc(): void {
  ipcMain.handle(IpcChannels.WORKSPACE_SELECT_DIRECTORY, async () => {
    return workspaceService.selectDirectory();
  });

  ipcMain.handle(IpcChannels.WORKSPACE_GET_CURRENT, () => {
    return workspaceService.getCurrentWorkspace();
  });
}
