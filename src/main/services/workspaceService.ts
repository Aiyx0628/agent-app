import { dialog, BrowserWindow } from 'electron';

let currentWorkspace: string | null = null;

export async function selectDirectory(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;

  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Workspace Directory',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  currentWorkspace = result.filePaths[0];
  return currentWorkspace;
}

export function getCurrentWorkspace(): string | null {
  return currentWorkspace;
}
