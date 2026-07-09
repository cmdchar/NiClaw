export interface ExternalShell {
  openExternal(url: string): Promise<void>;
  showItemInFolder(fullPath: string): void;
}
