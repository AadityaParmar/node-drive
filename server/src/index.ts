import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AppLog } from './appLog.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = './uploads';
const METADATA_FILE = './uploads/metadata.json';

interface FileMetadata {
  username: string;
  deviceId: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  uploadedSize: number;
  isComplete: boolean;
  lastModified: string;
  uploadTimestamp: string;
}

interface MetadataStore {
  [deviceId: string]: {
    [checksum: string]: FileMetadata;
  };
}

async function ensureDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function sanitizeForFilesystem(str: string): string {
  // Replace characters that are invalid in Windows/Unix filenames
  // Windows: < > : " / \ | ? *
  // We'll replace them with hyphens
  return str.replace(/[<>:"/\\|?*]/g, '-');
}

function getUserDeviceDir(username: string, deviceId: string): string {
  const sanitizedUsername = sanitizeForFilesystem(username);
  const sanitizedDeviceId = sanitizeForFilesystem(deviceId);
  return path.join(UPLOAD_DIR, `${sanitizedUsername}-${sanitizedDeviceId}`);
}

function getUploadPath(username: string, deviceId: string, fileName: string): string {
  const userDir = getUserDeviceDir(username, deviceId);
  return path.join(userDir, fileName);
}

async function loadAllMetadata(): Promise<MetadataStore> {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveAllMetadata(metadataStore: MetadataStore): Promise<void> {
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadataStore, null, 2));
}

async function loadMetadata(deviceId: string, checksum: string): Promise<FileMetadata | null> {
  const metadataStore = await loadAllMetadata();
  return metadataStore[deviceId]?.[checksum] || null;
}

async function saveMetadata(deviceId: string, checksum: string, metadata: FileMetadata): Promise<void> {
  const metadataStore = await loadAllMetadata();

  if (!metadataStore[deviceId]) {
    metadataStore[deviceId] = {};
  }

  metadataStore[deviceId][checksum] = metadata;
  await saveAllMetadata(metadataStore);
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

    const metadata = await loadMetadata(deviceId, checksum);

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
        isComplete: true
      });
    }

    // Handle file size mismatch - restart upload
    if (metadata.fileSize !== fileSize || metadata.checksum !== checksum) {
      AppLog.info('UploadCheckEndpoint', `File metadata mismatch detected, will restart upload: ${fileName} for user ${username}`);
      const uploadPath = getUploadPath(username, deviceId, fileName);
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

    const uploadPath = getUploadPath(username, deviceId, fileName);
    try {
      const stats = await fs.stat(uploadPath);
      return res.json({
        exists: true,
        uploadedSize: stats.size,
        isComplete: false
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
    const { username, deviceId, fileName, fileSize, checksum, startByte, lastModified } = req.body;
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

    let metadata = await loadMetadata(deviceId, checksum);

    if (!metadata) {
      metadata = {
        username,
        deviceId,
        fileName,
        fileSize: fileSizeNum,
        checksum,
        uploadedSize: 0,
        isComplete: false,
        lastModified,
        uploadTimestamp: new Date().toISOString()
      };
    }

    // Ensure user-device directory exists
    const userDeviceDir = getUserDeviceDir(username, deviceId);
    await fs.mkdir(userDeviceDir, { recursive: true });

    const uploadPath = getUploadPath(username, deviceId, fileName);

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

    await saveMetadata(deviceId, checksum, metadata);

    res.json({
      success: true,
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
    const { username, deviceId, fileName, checksum } = req.body;
    AppLog.info('DeleteEndpoint', `Delete request for ${fileName} from user ${username}`);

    if (!username || !deviceId || !fileName || !checksum) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const metadata = await loadMetadata(deviceId, checksum);

    if (!metadata) {
      return res.json({
        success: true,
        message: 'File not found, nothing to delete'
      });
    }

    const uploadPath = getUploadPath(username, deviceId, fileName);

    // Delete the actual file
    try {
      await fs.unlink(uploadPath);
    } catch {
      // File might not exist, continue with metadata cleanup
    }

    // Remove from metadata store
    const metadataStore = await loadAllMetadata();
    if (metadataStore[deviceId]?.[checksum]) {
      delete metadataStore[deviceId][checksum];

      // Clean up empty deviceId entries
      if (Object.keys(metadataStore[deviceId]).length === 0) {
        delete metadataStore[deviceId];
      }

      await saveAllMetadata(metadataStore);
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