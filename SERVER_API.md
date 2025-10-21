# Server API Specification

This document describes the API endpoints that the server needs to implement to work with the File Monitor Agent.

## Base URL
The server should run on a configurable URL (default: `http://localhost:3000`)

## API Endpoints

### 1. Health Check
**GET** `/api/ping`
- **Purpose**: Test server connectivity
- **Response**: `200 OK` with any content

### 2. Upload Check
**POST** `/api/upload/check`
- **Purpose**: Check if file is already uploaded or partially uploaded
- **Request Body**:
```json
{
  "username": "string",
  "deviceId": "string",
  "fileName": "string",
  "fileSize": number,
  "checksum": "string"
}
```
- **Response**:
```json
{
  "exists": boolean,
  "uploadedSize": number,
  "isComplete": boolean,
  "uploadId": "string" // optional, for partial uploads
}
```

### 3. File Upload
**POST** `/api/upload`
- **Purpose**: Upload file (supports resumable uploads)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `username`: string
  - `deviceId`: string
  - `fileName`: string
  - `fileSize`: string (number as string)
  - `checksum`: string
  - `startByte`: string (number as string, for resume)
  - `lastModified`: string (ISO date)
  - `uploadId`: string (optional, for resume)
  - `file`: File stream
- **Headers**:
  - `Content-Range`: `bytes {start}-{end}/{total}` (for partial uploads)
- **Response**:
```json
{
  "success": boolean,
  "uploadId": "string",
  "bytesUploaded": number,
  "isComplete": boolean,
  "message": "string" // optional error message
}
```

### 4. File Delete
**POST** `/api/delete`
- **Purpose**: Delete file from server
- **Request Body**:
```json
{
  "username": "string",
  "deviceId": "string",
  "fileName": "string"
}
```
- **Response**:
```json
{
  "success": boolean,
  "message": "string" // optional error message
}
```

## Error Handling

### HTTP Status Codes
- `200 OK`: Success
- `409 Conflict`: File already exists and is complete
- `416 Range Not Satisfiable`: Invalid range for resumable upload
- `400 Bad Request`: Invalid request data
- `500 Internal Server Error`: Server error

### Resumable Upload Logic
1. Client calls `/api/upload/check` to see if file exists
2. If partially uploaded, server returns `uploadedSize` and `uploadId`
3. Client resumes upload from `startByte = uploadedSize`
4. Server validates range and continues upload
5. If upload is interrupted, process can be repeated

## File Storage
- Files should be stored with metadata including:
  - Username and device ID for organization
  - Original filename and path
  - File size and checksum for integrity
  - Upload timestamp
  - Completion status

## Example Server Implementation
A simple Express.js server implementing these endpoints would look like:

```javascript
const express = require('express');
const multer = require('multer');
const app = express();

app.get('/api/ping', (req, res) => res.sendStatus(200));

app.post('/api/upload/check', (req, res) => {
  // Check if file exists and return status
});

app.post('/api/upload', multer().single('file'), (req, res) => {
  // Handle file upload with resume support
});

app.post('/api/delete', (req, res) => {
  // Handle file deletion
});

app.listen(3000);
```

This server implementation will be created separately from this file monitoring agent.