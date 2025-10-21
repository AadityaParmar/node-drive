import { ServerApiClient, ServerApiError } from './index.js';

// Example usage of the ServerApiClient
async function main() {
  // Initialize the API client
  const apiClient = new ServerApiClient({
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  });

  try {
    // 1. Health check
    console.log('Testing server connection...');
    const isHealthy = await apiClient.ping();
    console.log('Server is healthy:', isHealthy);

    // 2. Example file upload workflow
    const username = 'john_doe';
    const deviceId = 'laptop_001';
    const fileName = 'document.pdf';
    const fileContent = Buffer.from('This is a test file content');
    const checksum = 'abc123def456'; // In real use, calculate actual checksum

    // Check if file already exists
    console.log('\nChecking if file exists...');
    const checkResponse = await apiClient.checkUpload({
      username,
      deviceId,
      fileName,
      fileSize: fileContent.length,
      checksum
    });

    console.log('Check response:', checkResponse);

    if (checkResponse.isComplete) {
      console.log('File already exists and is complete!');
    } else {
      // Upload the file
      console.log('\nUploading file...');
      const uploadResponse = await apiClient.uploadFile({
        username,
        deviceId,
        fileName,
        fileSize: fileContent.length.toString(),
        checksum,
        lastModified: new Date().toISOString(),
        file: fileContent,
        // For resumable uploads:
        startByte: checkResponse.uploadedSize > 0 ? checkResponse.uploadedSize.toString() : undefined,
        uploadId: checkResponse.uploadId
      });

      console.log('Upload response:', uploadResponse);
    }

    // 3. Example resumable upload (easier method)
    console.log('\nTesting resumable upload helper...');
    const resumableResponse = await apiClient.uploadFileResumable(
      fileContent,
      {
        username,
        deviceId,
        fileName: 'resumable_test.txt',
        checksum: 'xyz789abc123'
      },
      (bytesUploaded, totalBytes) => {
        console.log(`Progress: ${bytesUploaded}/${totalBytes} bytes (${Math.round(bytesUploaded / totalBytes * 100)}%)`);
      }
    );

    console.log('Resumable upload response:', resumableResponse);

    // 4. Delete a file
    console.log('\nDeleting file...');
    const deleteResponse = await apiClient.deleteFile({
      username,
      deviceId,
      fileName: 'resumable_test.txt'
    });

    console.log('Delete response:', deleteResponse);

  } catch (error) {
    if (error instanceof ServerApiError) {
      console.error('API Error:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response
      });
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Browser usage example
export function createBrowserExample() {
  return {
    // File upload from file input
    async uploadFromFileInput(fileInput: HTMLInputElement) {
      const apiClient = new ServerApiClient({
        baseUrl: 'http://localhost:3000'
      });

      const file = fileInput.files?.[0];
      if (!file) {
        throw new Error('No file selected');
      }

      // Calculate checksum (you'd use a proper hashing library)
      const checksum = await calculateFileChecksum(file);

      return apiClient.uploadFileResumable(
        file,
        {
          username: 'browser_user',
          deviceId: 'browser_001',
          fileName: file.name,
          checksum,
          lastModified: new Date(file.lastModified).toISOString()
        },
        (bytesUploaded, totalBytes) => {
          const progress = Math.round(bytesUploaded / totalBytes * 100);
          console.log(`Upload progress: ${progress}%`);
          // Update UI progress bar here
        }
      );
    }
  };
}

// Helper function to calculate file checksum (browser)
async function calculateFileChecksum(file: File): Promise<string> {
  // This is a simplified example - use crypto-js or similar library
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Error handling examples
export function handleApiErrors() {
  const apiClient = new ServerApiClient({
    baseUrl: 'http://localhost:3000'
  });

  // Example with comprehensive error handling
  return {
    async robustUpload(file: File) {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const result = await apiClient.uploadFileResumable(
            file,
            {
              username: 'user',
              deviceId: 'device',
              fileName: file.name,
              checksum: await calculateFileChecksum(file)
            }
          );
          return result;

        } catch (error) {
          retryCount++;
          
          if (error instanceof ServerApiError) {
            switch (error.statusCode) {
              case 409: // File already exists
                console.log('File already exists, skipping upload');
                return { success: true, isComplete: true };
                
              case 416: // Invalid range for resume
                console.log('Invalid resume range, starting fresh upload');
                // Could implement logic to start from beginning
                break;
                
              case 400: // Bad request
                console.error('Invalid request data:', error.message);
                throw error; // Don't retry bad requests
                
              case 500: // Server error
                if (retryCount < maxRetries) {
                  console.log(`Server error, retrying... (${retryCount}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue;
                }
                break;
            }
          }
          
          if (retryCount >= maxRetries) {
            throw error;
          }
        }
      }
    }
  };
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}