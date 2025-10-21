import axios, { type AxiosInstance, type AxiosResponse, AxiosError } from 'axios';
import type {
  UploadCheckRequest,
  UploadCheckResponse,
  UploadRequest,
  UploadResponse,
  DeleteRequest,
  DeleteResponse,
  ServerApiConfig
} from './types.js';
import { ServerApiError } from './types.js';
import { AppLog } from './appLog.js';

export class ServerApiClient {
  private readonly client: AxiosInstance;
  private readonly config: Required<ServerApiConfig>;
  private requestCounter: number = 0;

  constructor(config: ServerApiConfig) {
    AppLog.info('ServerApiClient', `Initializing client with baseUrl: ${config.baseUrl}`);
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    } as Required<ServerApiConfig>;

    const axiosConfig: any = {
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (this.config.timeout !== undefined) {
      axiosConfig.timeout = this.config.timeout;
    }

    this.client = axios.create(axiosConfig);

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        if (
          error.response?.status === 500 &&
          originalRequest &&
          !originalRequest._retry &&
          (originalRequest._retryCount || 0) < (this.config.retryAttempts || 3)
        ) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          AppLog.debug('ServerApiClient', `[RETRY] Attempt ${originalRequest._retryCount} for ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
          await this.delay((this.config.retryDelay || 1000) * (originalRequest._retryCount || 1));
          if (originalRequest) {
            return this.client(originalRequest);
          }
        }

        throw this.handleError(error);
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  private getFullUrl(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }

  private logRequest(reqId: string, method: string, url: string, data?: any): void {
    AppLog.info('ServerApiClient', `>> ${reqId} ${method.toUpperCase()} ${url}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`);
  }

  private logResponse(reqId: string, status: number, url: string, data?: any): void {
    AppLog.info('ServerApiClient', `<< ${reqId} ${status} ${url}${data ? ` | Response: ${JSON.stringify(data)}` : ''}`);
  }

  private logException(reqId: string, method: string, url: string, error: any): void {
    AppLog.error('ServerApiClient', `!! ${reqId} ${method.toUpperCase()} ${url} | Exception: ${error.message || error}`);
  }

  private handleError(error: AxiosError): ServerApiError {
    if (error.response) {
      const errorData = error.response.data as any;
      return new ServerApiError(
        errorData?.message || error.message,
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      return new ServerApiError('Network error: No response from server');
    } else {
      return new ServerApiError(`Request error: ${error.message}`);
    }
  }

  /**
   * Health check endpoint
   * GET /api/ping
   */
  async ping(): Promise<boolean> {
    const reqId = this.generateRequestId();
    const path = '/api/ping';
    const fullUrl = this.getFullUrl(path);
    
    try {
      this.logRequest(reqId, 'GET', fullUrl);
      const response = await this.client.get(path);
      const isHealthy = response.status === 200;
      this.logResponse(reqId, response.status, fullUrl, { healthy: isHealthy });
      return isHealthy;
    } catch (error) {
      this.logException(reqId, 'GET', fullUrl, error);
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Check if file is already uploaded or partially uploaded
   * POST /api/upload/check
   */
  async checkUpload(request: UploadCheckRequest): Promise<UploadCheckResponse> {
    const reqId = this.generateRequestId();
    const path = '/api/upload/check';
    const fullUrl = this.getFullUrl(path);
    
    try {
      this.logRequest(reqId, 'POST', fullUrl, request);
      const response: AxiosResponse<UploadCheckResponse> = await this.client.post(path, request);
      this.logResponse(reqId, response.status, fullUrl, response.data);
      return response.data;
    } catch (error) {
      this.logException(reqId, 'POST', fullUrl, error);
      const apiError = this.handleError(error as AxiosError);
      
      // Handle 409 Conflict (file already exists and is complete)
      if (apiError.statusCode === 409 && apiError.response) {
        this.logResponse(reqId, 409, fullUrl, apiError.response);
        return apiError.response as UploadCheckResponse;
      }
      
      throw apiError;
    }
  }

  /**
   * Upload file with resumable support
   * POST /api/upload
   */
  async uploadFile(request: UploadRequest): Promise<UploadResponse> {
    const reqId = this.generateRequestId();
    const path = '/api/upload';
    const fullUrl = this.getFullUrl(path);
    
    try {
      // Log request with metadata (not the file content for brevity)
      const logData = {
        username: request.username,
        deviceId: request.deviceId,
        fileName: request.fileName,
        fileSize: request.fileSize,
        checksum: request.checksum,
        startByte: request.startByte,
        uploadId: request.uploadId,
        fileType: request.file instanceof File ? 'File' : request.file instanceof Blob ? 'Blob' : 'Buffer'
      };
      this.logRequest(reqId, 'POST', fullUrl, logData);
      
      const formData = new FormData();
      
      // Add form fields
      formData.append('username', request.username);
      formData.append('deviceId', request.deviceId);
      formData.append('fileName', request.fileName);
      formData.append('fileSize', request.fileSize);
      formData.append('checksum', request.checksum);
      formData.append('lastModified', request.lastModified);
      
      if (request.startByte) {
        formData.append('startByte', request.startByte);
      }
      
      if (request.uploadId) {
        formData.append('uploadId', request.uploadId);
      }

      // Add file
      if (request.file instanceof File) {
        formData.append('file', request.file);
      } else if (request.file instanceof Blob) {
        formData.append('file', request.file, request.fileName);
      } else {
        // Handle Buffer for Node.js environment - convert to Uint8Array first
        const uint8Array = new Uint8Array(request.file);
        const blob = new Blob([uint8Array]);
        formData.append('file', blob, request.fileName);
      }

      // Set content range header for resumable uploads
      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data'
      };

      if (request.startByte) {
        const startByte = parseInt(request.startByte);
        const fileSize = parseInt(request.fileSize);
        let chunkSize: number;
        
        if (request.file instanceof File || request.file instanceof Blob) {
          chunkSize = request.file.size;
        } else {
          chunkSize = request.file.length;
        }
        
        const endByte = startByte + chunkSize - 1;
        headers['Content-Range'] = `bytes ${startByte}-${endByte}/${fileSize}`;
      }

      const response: AxiosResponse<UploadResponse> = await this.client.post(
        path,
        formData,
        { headers }
      );

      this.logResponse(reqId, response.status, fullUrl, response.data);
      return response.data;
    } catch (error) {
      this.logException(reqId, 'POST', fullUrl, error);
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Delete file from server
   * POST /api/delete
   */
  async deleteFile(request: DeleteRequest): Promise<DeleteResponse> {
    const reqId = this.generateRequestId();
    const path = '/api/delete';
    const fullUrl = this.getFullUrl(path);
    
    try {
      this.logRequest(reqId, 'POST', fullUrl, request);
      const response: AxiosResponse<DeleteResponse> = await this.client.post(path, request);
      this.logResponse(reqId, response.status, fullUrl, response.data);
      return response.data;
    } catch (error) {
      this.logException(reqId, 'POST', fullUrl, error);
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Helper method for resumable file upload
   * Automatically handles checking existing upload and resuming if needed
   */
  async uploadFileResumable(
    file: File | Buffer,
    metadata: {
      username: string;
      deviceId: string;
      fileName: string;
      checksum: string;
      lastModified?: string | undefined;
    },
    onProgress?: (bytesUploaded: number, totalBytes: number) => void
  ): Promise<UploadResponse> {
    const fileSize = file instanceof File ? file.size : file.length;
    const lastModified = metadata.lastModified || new Date().toISOString();
    AppLog.info('ServerApiClient', `[RESUMABLE] Starting upload for file: ${metadata.fileName}, size: ${fileSize} bytes`);

    // Check if file already exists or is partially uploaded
    const checkResponse = await this.checkUpload({
      username: metadata.username,
      deviceId: metadata.deviceId,
      fileName: metadata.fileName,
      fileSize,
      checksum: metadata.checksum
    });

    // If file is already complete, return success
    if (checkResponse.isComplete) {
      AppLog.info('ServerApiClient', `[RESUMABLE] File already complete, skipping upload: ${metadata.fileName}`);
      return {
        success: true,
        uploadId: checkResponse.uploadId || '',
        bytesUploaded: fileSize,
        isComplete: true
      };
    }

    // Prepare upload request
    const uploadRequest: UploadRequest = {
      username: metadata.username,
      deviceId: metadata.deviceId,
      fileName: metadata.fileName,
      fileSize: fileSize.toString(),
      checksum: metadata.checksum,
      lastModified,
      file
    };

    // Handle resumable upload
    if (checkResponse.exists && checkResponse.uploadedSize > 0) {
      const startByte = checkResponse.uploadedSize;
      AppLog.info('ServerApiClient', `[RESUMABLE] Resuming upload from byte ${startByte} for file: ${metadata.fileName}`);
      
      if (file instanceof File) {
        uploadRequest.file = file.slice(startByte);
      } else {
        uploadRequest.file = file.subarray(startByte);
      }
      
      uploadRequest.startByte = startByte.toString();
      uploadRequest.uploadId = checkResponse.uploadId;
    }

    // Perform upload
    const uploadResponse = await this.uploadFile(uploadRequest);

    // Call progress callback if provided
    if (onProgress) {
      onProgress(uploadResponse.bytesUploaded, fileSize);
    }

    AppLog.info('ServerApiClient', `[RESUMABLE] Upload ${uploadResponse.isComplete ? 'completed' : 'in progress'} for file: ${metadata.fileName}`);
    return uploadResponse;
  }

  /**
   * Update base URL
   */
  setBaseUrl(baseUrl: string): void {
    AppLog.info('ServerApiClient', `Updating base URL to: ${baseUrl}`);
    this.config.baseUrl = baseUrl;
    this.client.defaults.baseURL = baseUrl;
  }

  /**
   * Get current configuration
   */
  getConfig(): ServerApiConfig {
    return { ...this.config };
  }
}
