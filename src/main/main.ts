import { app, BrowserWindow } from 'electron';
import { registerFileIpcHandlers } from './ipc/file';
import { registerAiIpcHandlers } from './ipc/ai';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const TRAFFIC_LIGHT_POSITION = { x: 14, y: 13 };

if (require('electron-squirrel-startup')) {
  app.quit();
}

function keepNativeTitleHidden(win: BrowserWindow): void {
  win.setTitle('');
  win.on('page-title-updated', (event) => {
    event.preventDefault();
    win.setTitle('');
  });

  const restoreChrome = () => {
    win.setTitle('');
    win.setWindowButtonPosition?.(TRAFFIC_LIGHT_POSITION);
  };

  win.on('focus', restoreChrome);
  win.on('enter-full-screen', restoreChrome);
  win.on('leave-full-screen', restoreChrome);
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '',
    titleBarStyle: 'hidden',
    trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    backgroundColor: '#f8f8f8',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  keepNativeTitleHidden(win);
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  return win;
}

app.whenReady().then(() => {
  registerFileIpcHandlers();
  registerAiIpcHandlers();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
