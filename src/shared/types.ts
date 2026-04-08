export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface WorkspaceInfo {
  path: string | null;
}

export interface AppApi {
  app: {
    getVersion: () => Promise<string>;
  };
  workspace: {
    selectDirectory: () => Promise<string | null>;
    getCurrentWorkspace: () => Promise<string | null>;
  };
}
