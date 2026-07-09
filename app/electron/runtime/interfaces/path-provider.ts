export interface PathProvider {
  getUserDataPath(): string;
  getHomePath(): string;
  getLogsPath(): string;
  getExePath(): string;
  getAppPath(): string;
  isPackaged(): boolean;
}
