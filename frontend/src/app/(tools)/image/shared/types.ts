// Shared types for image processing tools

export interface RateLimitUsage {
  used: number;
  limit: number;
  resetsIn: number | null;
  isLimitReached: boolean;
}

export interface ImageProcessingResult {
  filename: string;
  originalFilename: string;
  downloadUrl: string;
  size?: number;
  width?: number;
  height?: number;
  mime?: string;
  compressionRatio?: number;
  originalFormat?: string;
  convertedFormat?: string;
}

export interface ProcessingJob {
  jobId: string;
  statusUrl: string;
}

export interface QueueStatus {
  position?: number | null;
  waitTime?: string | null;
  isProcessing?: boolean;
}

export interface VisualProgress {
  [fileIndex: number]: number;
}

export interface FileJobMapping {
  [fileIndex: number]: string;
}

export interface JobProgress {
  [jobId: string]: number;
}

export interface QueueStatusMapping {
  [jobId: string]: QueueStatus;
} 