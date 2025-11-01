# DirectoryWatcher

A robust TypeScript class for monitoring file system changes recursively in a directory. Detects file creation, modification, and deletion events with configurable options.

## Features

- **Recursive Watching**: Monitors all subdirectories automatically
- **Event Detection**: Detects INSERT (create), UPDATE (modify), and DELETE events
- **Debouncing**: Built-in debouncing to avoid duplicate events
- **Filtering**: Filter by file extensions, exclude hidden files, and exclude specific directories
- **File Listing**: Get all files recursively in a directory
- **TypeScript Support**: Fully typed with comprehensive interfaces

## Installation

The DirectoryWatcher is part of the client package. Import it as follows:

```typescript
import { DirectoryWatcher, FileEventType, type FileEvent } from "./DirectoryWatcher.js";
```

## Basic Usage

```typescript
import { DirectoryWatcher, FileEventType, type FileEvent } from "./DirectoryWatcher.js";

// Define callback function
const handleFileEvent = (event: FileEvent) => {
  console.log(`Event: ${event.type}`);
  console.log(`File: ${event.filePath}`);
  console.log(`File name: ${event.fileName}`);
  console.log(`Absolute path: ${event.absolutePath}`);
  console.log(`Timestamp: ${event.timestamp}`);

  // Access file contents and checksum for INSERT and UPDATE events
  if (event.fileBuffer) {
    console.log(`File size: ${event.fileBuffer.length} bytes`);
    // Process the file buffer as needed
    // const text = event.fileBuffer.toString('utf-8');
  }

  if (event.checksum) {
    console.log(`Checksum: ${event.checksum}`);
  }
};

// Create watcher instance
const watcher = new DirectoryWatcher("/path/to/watch", handleFileEvent);

// Start watching
watcher.start();

// Stop watching when done
watcher.stop();
```

## Advanced Configuration

```typescript
const watcher = new DirectoryWatcher("/path/to/watch", handleFileEvent, {
  ignoreHidden: true,                    // Ignore hidden files (default: true)
  debounceDelay: 100,                    // Debounce delay in ms (default: 100)
  fileExtensions: [".txt", ".md"],       // Watch specific extensions (default: all)
  excludeDirs: ["node_modules", ".git"]  // Exclude directories (default: ["node_modules", ".git"])
});
```

## Event Types

The `FileEventType` enum defines three event types:

- `FileEventType.INSERT` - File was created
- `FileEventType.UPDATE` - File was modified
- `FileEventType.DELETE` - File was deleted

## FileEvent Interface

```typescript
interface FileEvent {
  type: FileEventType;      // Event type (INSERT, UPDATE, DELETE)
  filePath: string;         // Relative path from watched directory
  absolutePath: string;     // Absolute file path
  timestamp: Date;          // When the event occurred
  fileName: string;         // File name (basename)
  fileBuffer?: Buffer;      // File contents (available for INSERT and UPDATE, undefined for DELETE)
  checksum?: string;        // SHA-256 checksum (available for INSERT and UPDATE, undefined for DELETE)
}
```

**Notes**:
- `fileName` - The file name extracted from the path (e.g., "document.txt")
- `fileBuffer` - Contains the file contents as a Buffer for INSERT and UPDATE events. Automatically read by the watcher. For DELETE events, this is `undefined`.
- `checksum` - SHA-256 hash of the file contents, calculated using `calculateFileChecksum`. Available for INSERT and UPDATE events, `undefined` for DELETE events.

## Methods

### `start(): void`

Start watching the directory for file changes.

```typescript
watcher.start();
```

### `stop(): void`

Stop watching the directory and clean up resources.

```typescript
watcher.stop();
```

### `isActive(): boolean`

Check if the watcher is currently active.

```typescript
if (watcher.isActive()) {
  console.log("Watcher is running");
}
```

### `getWatchPath(): string`

Get the path being watched.

```typescript
const path = watcher.getWatchPath();
```

### `getAllFiles(dirPath?: string): string[]`

Get all files recursively in the watched directory (or a specified directory). Returns an array of relative file paths.

```typescript
const allFiles = watcher.getAllFiles();
console.log(`Found ${allFiles.length} files:`);
allFiles.forEach(file => console.log(file));

// Or specify a different directory to scan
const filesInSubdir = watcher.getAllFiles("/path/to/subdir");
```

## Complete Example

```typescript
import { DirectoryWatcher, FileEventType, type FileEvent } from "./DirectoryWatcher.js";

function main() {
  const watchDir = "/Users/aditya/Documents/my-files";

  const handleFileEvent = (event: FileEvent) => {
    switch (event.type) {
      case FileEventType.INSERT:
        console.log(`New file created: ${event.filePath}`);
        console.log(`File name: ${event.fileName}`);
        if (event.fileBuffer && event.checksum) {
          console.log(`File size: ${event.fileBuffer.length} bytes`);
          console.log(`Checksum: ${event.checksum}`);
          // Upload file to server using the buffer and checksum
          // uploadToServer({
          //   fileName: event.fileName,
          //   filePath: event.filePath,
          //   buffer: event.fileBuffer,
          //   checksum: event.checksum
          // });
        }
        break;

      case FileEventType.UPDATE:
        console.log(`File updated: ${event.filePath}`);
        console.log(`File name: ${event.fileName}`);
        if (event.fileBuffer && event.checksum) {
          console.log(`File size: ${event.fileBuffer.length} bytes`);
          console.log(`Checksum: ${event.checksum}`);
          // Sync changes to server using the buffer and checksum
          // syncToServer({
          //   fileName: event.fileName,
          //   filePath: event.filePath,
          //   buffer: event.fileBuffer,
          //   checksum: event.checksum
          // });
        }
        break;

      case FileEventType.DELETE:
        console.log(`File deleted: ${event.filePath}`);
        console.log(`File name: ${event.fileName}`);
        // Handle file deletion (e.g., remove from server)
        // Note: fileBuffer and checksum are undefined for DELETE events
        // deleteFromServer(event.fileName);
        break;
    }
  };

  const watcher = new DirectoryWatcher(watchDir, handleFileEvent, {
    ignoreHidden: true,
    debounceDelay: 200,
    fileExtensions: [".txt", ".md", ".pdf"],
    excludeDirs: ["node_modules", ".git", "temp"]
  });

  // Get initial file list
  const allFiles = watcher.getAllFiles();
  console.log(`Initially found ${allFiles.length} files`);

  // Start watching
  watcher.start();

  // Graceful shutdown
  process.on("SIGINT", () => {
    watcher.stop();
    process.exit(0);
  });
}

main();
```

## Error Handling

The DirectoryWatcher handles errors internally and logs them using the AppLog system. However, errors in the callback function are caught and logged without stopping the watcher.

```typescript
const handleFileEvent = (event: FileEvent) => {
  try {
    // Your processing logic
    processFile(event.filePath);
  } catch (error) {
    console.error(`Error processing file: ${error}`);
    // Error is caught by watcher and logged
  }
};
```

## Notes

- The watcher uses Node.js's `fs.watch` with the `recursive` option
- Events are debounced to prevent duplicate notifications
- File states are tracked to differentiate between INSERT and UPDATE events
- The watcher respects the filtering options (hidden files, extensions, excluded directories) in both watching and file listing
- When watching is stopped, all timers and resources are cleaned up automatically

## Testing

Run the tests with:

```bash
npm test DirectoryWatcher.test.ts
```

See `examples/directoryWatcherExample.ts` for a complete working example.
