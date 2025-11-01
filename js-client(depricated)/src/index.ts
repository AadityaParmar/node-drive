// Export all public API
import * as os from "node:os";
import {AppLog} from "./appLog.js";
import {DirectoryWatcher, type FileEvent, FileEventType} from "./DirectoryWatcher.js";
import {ServerApiClient} from "./ServerApiClient.js";
import {getFileInfo} from "./types.js";

// Export public classes and types
export {DirectoryWatcher, FileEventType};
export type {FileEvent};

function getDeviceId(): string
{
  const hostname = os.hostname();
  const interfaces = os.networkInterfaces();

  // Find the first non-internal network interface with a MAC address
  const mac = Object.values(interfaces)
  .flat()
  .find(i => i && !i.internal && i.mac && i.mac !== "00:00:00:00:00:00")?.mac || "unknown";

  return `${hostname}-${mac}`;
}

function main()
{
  const username = os.userInfo().username;
  const deviceId = getDeviceId();

  AppLog.info("main", `Username: ${deviceId}`);

  const client = new ServerApiClient({
    baseUrl: "http://localhost:3000",
    timeout: 5000,
    retryAttempts: 1,
    retryDelay: 100
  });
  const watcher = new DirectoryWatcher("/Users/aditya/Documents/node-drive/target", (event: FileEvent) =>
  {
    if(event.fileBuffer && event.checksum)
    {
      const file = getFileInfo(event.fileBuffer, event.filePath);
      AppLog.info("main", `File info: ${JSON.stringify(file)}`);
      client.uploadFile({
        username: username,
        deviceId: deviceId,
        file: file.file,
        fileName: file.fileName,
        fileSize: file.fileSize,
        lastModified: file.lastModified,
        checksum: event.checksum
      });
    }
  });
  watcher.start();
  const allFiles = watcher.getAllFiles();
  AppLog.info("main", `All files: ${JSON.stringify(allFiles)}`);

}

main();
