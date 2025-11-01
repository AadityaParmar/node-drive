import { DirectoryWatcher, FileEventType, type FileEvent } from "../DirectoryWatcher.js";
import { AppLog } from "../appLog.js";

/**
 * Example usage of DirectoryWatcher
 */
function main() {
  // Define the directory to watch
  const watchDir = "/Users/aditya/Documents/node-drive/target";

  // Define the callback function
  const handleFileEvent = (event: FileEvent) => {
    switch (event.type) {
      case FileEventType.INSERT:
        AppLog.info("FileWatcher", `File created: ${event.filePath}`);
        AppLog.info("FileWatcher", `  File name: ${event.fileName}`);
        AppLog.info("FileWatcher", `  Absolute path: ${event.absolutePath}`);
        AppLog.info("FileWatcher", `  Timestamp: ${event.timestamp.toISOString()}`);
        if (event.fileBuffer) {
          AppLog.info("FileWatcher", `  Size: ${event.fileBuffer.length} bytes`);
        }
        if (event.checksum) {
          AppLog.info("FileWatcher", `  Checksum: ${event.checksum}`);
        }
        // Add your custom logic here, e.g., upload the file
        // You can use event.fileBuffer to access file contents
        break;

      case FileEventType.UPDATE:
        AppLog.info("FileWatcher", `File updated: ${event.filePath}`);
        AppLog.info("FileWatcher", `  File name: ${event.fileName}`);
        AppLog.info("FileWatcher", `  Absolute path: ${event.absolutePath}`);
        AppLog.info("FileWatcher", `  Timestamp: ${event.timestamp.toISOString()}`);
        if (event.fileBuffer) {
          AppLog.info("FileWatcher", `  Size: ${event.fileBuffer.length} bytes`);
        }
        if (event.checksum) {
          AppLog.info("FileWatcher", `  Checksum: ${event.checksum}`);
        }
        // Add your custom logic here, e.g., re-upload the file
        // You can use event.fileBuffer to access updated file contents
        break;

      case FileEventType.DELETE:
        AppLog.info("FileWatcher", `File deleted: ${event.filePath}`);
        AppLog.info("FileWatcher", `  File name: ${event.fileName}`);
        AppLog.info("FileWatcher", `  Absolute path: ${event.absolutePath}`);
        AppLog.info("FileWatcher", `  Timestamp: ${event.timestamp.toISOString()}`);
        // Add your custom logic here, e.g., delete from server
        // Note: fileBuffer and checksum will be undefined for DELETE events
        break;
    }
  };

  // Create watcher instance with options
  const watcher = new DirectoryWatcher(watchDir, handleFileEvent, {
    ignoreHidden: true,           // Ignore hidden files
    debounceDelay: 100,           // 100ms debounce
    fileExtensions: [],           // Watch all file types (or specify ['.txt', '.md'])
    excludeDirs: ["node_modules", ".git"] // Exclude these directories
  });

  // Get all files before starting watcher
  AppLog.info("Example", "Getting all files in directory...");
  const allFiles = watcher.getAllFiles();
  AppLog.info("Example", `Found ${allFiles.length} files:`);
  allFiles.forEach(file => {
    AppLog.info("Example", `  - ${file}`);
  });

  // Start watching
  AppLog.info("Example", "Starting directory watcher...");
  watcher.start();

  // Let it run for a while, then stop (for demonstration)
  // In a real application, you'd keep it running
  setTimeout(() => {
    AppLog.info("Example", "Stopping directory watcher...");
    watcher.stop();
  }, 60000); // Stop after 60 seconds

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    AppLog.info("Example", "Received SIGINT, stopping watcher...");
    watcher.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    AppLog.info("Example", "Received SIGTERM, stopping watcher...");
    watcher.stop();
    process.exit(0);
  });
}

// Run the example
main();
