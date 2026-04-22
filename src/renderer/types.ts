export type FileSource = 'demo' | 'local';
export type FileKind = 'pdf' | 'word' | 'excel' | 'ppt' | 'image';

export interface FileMeta {
  pageCount?: number;
  width?: number;
  height?: number;
  size?: number;
  mtime?: number;
}

export interface FileNode {
  id: string;
  type: 'file';
  kind: FileKind;
  name: string;
  source: FileSource;
  path?: string;
  meta?: FileMeta;
  starred?: boolean;
  issues?: number;
  pages?: number;
}

export interface FolderNode {
  id: string;
  type: 'folder';
  name: string;
  children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

export interface DirEntry {
  name: string;
  path: string;
  type: 'file' | 'folder';
  kind?: FileKind;
  children?: DirEntry[];
}

export interface ElectronAPI {
  file: {
    openDialog(opts?: { title?: string; extensions?: string[] }): Promise<{ canceled: boolean; paths: string[] }>;
    read(path: string): Promise<{ bytes: Uint8Array; mtime: number; size: number }>;
    stat(path: string): Promise<{ size: number; mtime: number; exists: boolean }>;
  };
}

const EXT_KIND_MAP: Record<string, FileKind> = {
  '.pdf': 'pdf',
  '.docx': 'word', '.doc': 'word',
  '.xlsx': 'excel', '.xls': 'excel',
  '.pptx': 'ppt', '.ppt': 'ppt',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
  '.gif': 'image', '.webp': 'image', '.svg': 'image',
};

export function extToKind(ext: string): FileKind | undefined {
  return EXT_KIND_MAP[ext.toLowerCase()];
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
