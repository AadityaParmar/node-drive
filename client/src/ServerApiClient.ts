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

export class ServerApiClient {
  private readonly client: AxiosInstance;
  private readonly config: Required<ServerApiConfig>;

  constructor(config: ServerApiConfig) {
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
    try {
      const response = await this.client.get('/api/ping');
      return response.status === 200;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Check if file is already uploaded or partially uploaded
   * POST /api/upload/check
   */
  async checkUpload(request: UploadCheckRequest): Promise<UploadCheckResponse> {
    try {
      const response: AxiosResponse<UploadCheckResponse> = await this.client.post(
        '/api/upload/check',
        request
      );
      return response.data;
    } catch (error) {
      const apiError = this.handleError(error as AxiosError);
      
      // Handle 409 Conflict (file already exists and is complete)
      if (apiError.statusCode === 409 && apiError.response) {
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
    try {
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
        '/api/upload',
        formData,
        { headers }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Delete file from server
   * POST /api/delete
   */
  async deleteFile(request: DeleteRequest): Promise<DeleteResponse> {
    try {
      const response: AxiosResponse<DeleteResponse> = await this.client.post(
        '/api/delete',
        request
      );
      return response.data;
    } catch (error) {
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

    return uploadResponse;
  }

  /**
   * Update base URL
   */
  setBaseUrl(baseUrl: string): void {
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
