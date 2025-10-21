import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AppLog } from './appLog.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = './uploads';
const METADATA_DIR = './metadata';

interface FileMetadata {
  username: string;
  deviceId: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  uploadId: string;
  uploadedSize: number;
  isComplete: boolean;
  lastModified: string;
  uploadTimestamp: string;
}

async function ensureDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(METADATA_DIR, { recursive: true });
}

function getFileKey(username: string, deviceId: string, fileName: string): string {
  return `${username}_${deviceId}_${fileName}`;
}

function getMetadataPath(fileKey: string): string {
  return path.join(METADATA_DIR, `${fileKey}.json`);
}

function getUploadPath(uploadId: string): string {
  return path.join(UPLOAD_DIR, uploadId);
}

async function loadMetadata(fileKey: string): Promise<FileMetadata | null> {
  try {
    const metadataPath = getMetadataPath(fileKey);
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveMetadata(fileKey: string, metadata: FileMetadata): Promise<void> {
  const metadataPath = getMetadataPath(fileKey);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

async function calculateChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

// Health check endpoint
app.get('/api/ping', (req, res) => {
  AppLog.debug('HealthCheck', 'Ping request received');
  res.sendStatus(200);
});

// Upload check endpoint
app.post('/api/upload/check', async (req, res) => {
  try {
    const { username, deviceId, fileName, fileSize, checksum } = req.body;
    AppLog.debug('UploadCheckEndpoint', `Upload check request for ${fileName} from user ${username}`);
    
    if (!username || !deviceId || !fileName || !fileSize || !checksum) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileKey = getFileKey(username, deviceId, fileName);
    const metadata = await loadMetadata(fileKey);

    if (!metadata) {
      return res.json({
        exists: false,
        uploadedSize: 0,
        isComplete: false
      });
    }

    if (metadata.isComplete && metadata.checksum === checksum && metadata.fileSize === fileSize) {
      AppLog.info('UploadCheckEndpoint', `File already exists and complete: ${fileName} for user ${username}`);
      return res.status(409).json({
        exists: true,
        uploadedSize: metadata.fileSize,
        isComplete: true,
        uploadId: metadata.uploadId
      });
    }

    // Handle file size mismatch - restart upload
    if (metadata.fileSize !== fileSize || metadata.checksum !== checksum) {
      AppLog.info('UploadCheckEndpoint', `File metadata mismatch detected, will restart upload: ${fileName} for user ${username}`);
      const uploadPath = getUploadPath(metadata.uploadId);
      try {
        await fs.unlink(uploadPath);
      } catch {
        // File might not exist, continue
      }
      
      return res.json({
        exists: false,
        uploadedSize: 0,
        isComplete: false,
        shouldRestart: true
      });
    }

    const uploadPath = getUploadPath(metadata.uploadId);
    try {
      const stats = await fs.stat(uploadPath);
      return res.json({
        exists: true,
        uploadedSize: stats.size,
        isComplete: false,
        uploadId: metadata.uploadId
      });
    } catch {
      return res.json({
        exists: false,
        uploadedSize: 0,
        isComplete: false
      });
    }
  } catch (error) {
    AppLog.error('UploadCheckEndpoint', `Upload check error: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { username, deviceId, fileName, fileSize, checksum, startByte, lastModified, uploadId } = req.body;
    const file = req.file;

    if (!username || !deviceId || !fileName || !fileSize || !checksum || !file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const fileSizeNum = parseInt(fileSize);
    const startByteNum = parseInt(startByte || '0');
    AppLog.info('UploadEndpoint', `Upload request for ${fileName} from user ${username}, startByte: ${startByteNum}`);
    
    const fileKey = getFileKey(username, deviceId, fileName);
    let metadata = await loadMetadata(fileKey);
    let currentUploadId = uploadId;

    if (!metadata) {
      currentUploadId = uuidv4();
      metadata = {
        username,
        deviceId,
        fileName,
        fileSize: fileSizeNum,
        checksum,
        uploadId: currentUploadId,
        uploadedSize: 0,
        isComplete: false,
        lastModified,
        uploadTimestamp: new Date().toISOString()
      };
    }

    const uploadPath = getUploadPath(metadata.uploadId);
    
    // Handle range validation for resumable uploads
    if (startByteNum > 0) {
      try {
        const stats = await fs.stat(uploadPath);
        if (startByteNum !== stats.size) {
          AppLog.error('UploadEndpoint', `Range mismatch: expected ${startByteNum}, actual ${stats.size} for ${fileName}`);
          return res.status(416).json({
            success: false,
            message: 'Invalid range for resumable upload',
            actualSize: stats.size,
            expectedStartByte: startByteNum
          });
        }
      } catch {
        AppLog.error('UploadEndpoint', `Upload file not found for resume: ${uploadPath} for ${fileName}`);
        return res.status(416).json({
          success: false,
          message: 'Upload file not found for resume'
        });
      }
    }

    // Append or create file
    if (startByteNum === 0) {
      await fs.writeFile(uploadPath, file.buffer);
    } else {
      const fileHandle = await fs.open(uploadPath, 'a');
      await fileHandle.write(file.buffer);
      await fileHandle.close();
    }

    const stats = await fs.stat(uploadPath);
    metadata.uploadedSize = stats.size;
    
    // Check if upload is complete
    if (metadata.uploadedSize >= metadata.fileSize) {
      const actualChecksum = await calculateChecksum(uploadPath);
      if (actualChecksum === metadata.checksum) {
        metadata.isComplete = true;
        AppLog.info('UploadEndpoint', `File upload completed successfully: ${fileName} for user ${username}`);
      } else {
        await fs.unlink(uploadPath);
        AppLog.error('UploadEndpoint', `Checksum verification failed for file: ${fileName} for user ${username}`);
        return res.status(400).json({
          success: false,
          message: 'Checksum verification failed'
        });
      }
    }

    await saveMetadata(fileKey, metadata);

    res.json({
      success: true,
      uploadId: metadata.uploadId,
      bytesUploaded: metadata.uploadedSize,
      isComplete: metadata.isComplete
    });

  } catch (error) {
    AppLog.error('UploadEndpoint', `Upload error: ${error}`);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// File delete endpoint
app.post('/api/delete', async (req, res) => {
  try {
    const { username, deviceId, fileName } = req.body;
    AppLog.info('DeleteEndpoint', `Delete request for ${fileName} from user ${username}`);
    
    if (!username || !deviceId || !fileName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const fileKey = getFileKey(username, deviceId, fileName);
    const metadata = await loadMetadata(fileKey);

    if (!metadata) {
      return res.json({
        success: true,
        message: 'File not found, nothing to delete'
      });
    }

    const uploadPath = getUploadPath(metadata.uploadId);
    const metadataPath = getMetadataPath(fileKey);

    try {
      await fs.unlink(uploadPath);
    } catch {
      // File might not exist, continue with metadata cleanup
    }

    try {
      await fs.unlink(metadataPath);
    } catch {
      // Metadata might not exist
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    AppLog.error('DeleteEndpoint', `Delete error: ${error}`);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

async function startServer() {
  try {
    AppLog.info('Server', 'Starting server...');
    await ensureDirectories();
    AppLog.debug('Server', 'Directories ensured');
    app.listen(PORT, () => {
      AppLog.info('Server', `Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    AppLog.error('Server', `Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer();