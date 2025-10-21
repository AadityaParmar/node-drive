// Export all public API
import * as fs from "node:fs";
import {AppLog} from "./appLog.js";
import {ServerApiClient} from "./ServerApiClient.js";
import {calculateFileChecksum} from "./simpleTest.js";
import {getFileInfo} from "./types.js";

function main()
{
  const client = new ServerApiClient({
    baseUrl: "http://localhost:3000",
    timeout: 5000,
    retryAttempts: 1,
    retryDelay: 100
  });
  AppLog.info("ServerApiClient", "Client initialized");
  const fileBuffer = fs.readFileSync("/Users/aditya/Documents/node-drive/target/test.txt");
  const file = getFileInfo(fileBuffer, "test.txt");
  AppLog.info("ServerApiClient", "File info: " + JSON.stringify(file));
  const checksum = calculateFileChecksum("/Users/aditya/Documents/node-drive/target/test.txt");
  client.uploadFile({
    username: "test",
    deviceId: "test",
    file: file.file,
    fileName: file.fileName,
    fileSize: file.fileSize,
    lastModified: file.lastModified,
    checksum: checksum

  });

}

main();
