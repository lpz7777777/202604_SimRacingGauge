interface ElectronAPI {
  openVideo: () => Promise<string | null>;
  openGpx: () => Promise<string | null>;
  openFile: (options?: Record<string, unknown>) => Promise<string | null>;
  readTextFile: (filePath: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
