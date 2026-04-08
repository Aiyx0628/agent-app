import { ipcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc';
import * as appService from '../services/appService';

export function registerAppIpc(): void {
  ipcMain.handle(IpcChannels.APP_GET_VERSION, () => {
    return appService.getVersion();
  });
}
