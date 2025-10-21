export interface UploadCheckRequest {
  username: string;
  deviceId: string;
  fileName: string;
  fileSize: number;
  checksum: string;
}

export interface UploadCheckResponse {
  exists: boolean;
  uploadedSize: number;
  isComplete: boolean;
  uploadId?: string | undefined;
  shouldRestart?: boolean | undefined;
}

export interface UploadRequest {
  username: string;
  deviceId: string;
  fileName: string;
  fileSize: string; // number as string
  checksum: string;
  startByte?: string | undefined; // number as string, for resume
  lastModified: string; // ISO date
  uploadId?: string | undefined; // optional, for resume
  file: File | Buffer | Blob;
}

export interface UploadResponse {
  success: boolean;
  uploadId: string;
  bytesUploaded: number;
  isComplete: boolean;
  message?: string | undefined;
  actualSize?: number | undefined;
  expectedStartByte?: number | undefined;
}

export interface DeleteRequest {
  username: string;
  deviceId: string;
  fileName: string;
}

export interface DeleteResponse {
  success: boolean;
  message?: string | undefined; // optional error message
}

export interface ServerApiConfig {
  baseUrl: string;
  timeout?: number | undefined;
  retryAttempts?: number | undefined;
  retryDelay?: number | undefined;
}

export class ServerApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ServerApiError';
  }
}