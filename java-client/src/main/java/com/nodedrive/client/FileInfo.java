package com.nodedrive.client;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.io.IOException;

/**
 * File information utility.
 * Port of types.ts getFileInfo from Node.js client.
 */
public class FileInfo {

    public static class Info {
        public byte[] file;
        public String fileName;
        public long fileSize;
        public long lastModified;

        public Info(byte[] file, String fileName, long fileSize, long lastModified) {
            this.file = file;
            this.fileName = fileName;
            this.fileSize = fileSize;
            this.lastModified = lastModified;
        }

        @Override
        public String toString() {
            return String.format("FileInfo{fileName=%s, size=%d, lastModified=%d}",
                    fileName, fileSize, lastModified);
        }
    }

    /**
     * Get file information from file buffer and path
     */
    public static Info getFileInfo(byte[] fileBuffer, String filePath) {
        try {
            Path path = Paths.get(filePath);
            String fileName = path.getFileName().toString();

            long fileSize = fileBuffer.length;
            long lastModified = System.currentTimeMillis();

            // Try to get actual file metadata if file exists
            if (Files.exists(path)) {
                try {
                    BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
                    lastModified = attrs.lastModifiedTime().toMillis();
                } catch (IOException e) {
                    // Use current time as fallback
                    AppLog.warn("FileInfo", "Could not read file attributes: " + e.getMessage());
                }
            }

            return new Info(fileBuffer, fileName, fileSize, lastModified);
        } catch (Exception e) {
            AppLog.error("FileInfo", "Error getting file info: " + e.getMessage());
            throw new RuntimeException("Failed to get file info", e);
        }
    }

    /**
     * Generate timestamped filename for unique uploads
     */
    public static String generateTimestampedFileName(String originalFileName) {
        int dotIndex = originalFileName.lastIndexOf('.');
        String name;
        String extension;

        if (dotIndex > 0) {
            name = originalFileName.substring(0, dotIndex);
            extension = originalFileName.substring(dotIndex);
        } else {
            name = originalFileName;
            extension = "";
        }

        long timestamp = System.currentTimeMillis();
        return name + "_" + timestamp + extension;
    }
}
