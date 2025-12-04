export enum AppState {
  IDLE = 'IDLE',
  LOADING_CORE = 'LOADING_CORE',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface SplitResult {
  fileName: string;
  url: string;
  blob: Blob;
  size: number;
}

export interface LogEntry {
  type: 'info' | 'error' | 'success';
  message: string;
  timestamp: number;
}
