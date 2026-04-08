export const IpcChannels = {
  APP_GET_VERSION: 'app:get-version',
  WORKSPACE_SELECT_DIRECTORY: 'workspace:select-directory',
  WORKSPACE_GET_CURRENT: 'workspace:get-current',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
