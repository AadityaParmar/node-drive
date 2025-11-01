package com.nodedrive.client;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.*;

/**
 * Directory watcher that monitors file changes and triggers callbacks.
 * Port of DirectoryWatcher.ts from Node.js client.
 */
public class DirectoryWatcher {

    public enum FileEventType {
        CREATED,
        MODIFIED,
        DELETED
    }

    public static class FileEvent {
        public final FileEventType type;
        public final String filePath;
        public final byte[] fileBuffer;
        public final String checksum;

        public FileEvent(FileEventType type, String filePath, byte[] fileBuffer, String checksum) {
            this.type = type;
            this.filePath = filePath;
            this.fileBuffer = fileBuffer;
            this.checksum = checksum;
        }

        @Override
        public String toString() {
            return String.format("FileEvent{type=%s, path=%s, checksum=%s, size=%d}",
                    type, filePath, checksum, fileBuffer != null ? fileBuffer.length : 0);
        }
    }

    public interface FileEventCallback {
        void onFileEvent(FileEvent event);
    }

    private final Path watchPath;
    private final FileEventCallback callback;
    private WatchService watchService;
    private volatile boolean running = false;
    private ExecutorService executor;
    private final Map<WatchKey, Path> watchKeys = new ConcurrentHashMap<>();

    public DirectoryWatcher(String path, FileEventCallback callback) {
        this.watchPath = Paths.get(path);
        this.callback = callback;
    }

    /**
     * Start watching the directory for file changes
     */
    public void start() throws IOException {
        if (running) {
            AppLog.warn("DirectoryWatcher", "Already running");
            return;
        }

        if (!Files.exists(watchPath)) {
            throw new IOException("Watch path does not exist: " + watchPath);
        }

        if (!Files.isDirectory(watchPath)) {
            throw new IOException("Watch path is not a directory: " + watchPath);
        }

        watchService = FileSystems.getDefault().newWatchService();

        // Register directory and all subdirectories recursively
        registerDirectoryRecursively(watchPath);

        running = true;
        executor = Executors.newSingleThreadExecutor();

        // Start watching in background thread
        executor.submit(() -> {
            AppLog.info("DirectoryWatcher", "Started watching: " + watchPath + " (recursive)");
            watchLoop();
        });
    }

    /**
     * Register a directory and all its subdirectories with the watch service
     */
    private void registerDirectoryRecursively(Path dir) throws IOException {
        Files.walkFileTree(dir, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attrs) throws IOException {
                WatchKey key = directory.register(watchService,
                        StandardWatchEventKinds.ENTRY_CREATE,
                        StandardWatchEventKinds.ENTRY_MODIFY,
                        StandardWatchEventKinds.ENTRY_DELETE);
                watchKeys.put(key, directory);
                AppLog.debug("DirectoryWatcher", "Registered: " + directory);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    /**
     * Stop watching the directory
     */
    public void stop() {
        if (!running) {
            return;
        }

        running = false;

        try {
            if (watchService != null) {
                watchService.close();
            }
        } catch (IOException e) {
            AppLog.error("DirectoryWatcher", "Error closing watch service: " + e.getMessage());
        }

        if (executor != null) {
            executor.shutdown();
            try {
                if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                    executor.shutdownNow();
                }
            } catch (InterruptedException e) {
                executor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }

        watchKeys.clear();
        AppLog.info("DirectoryWatcher", "Stopped watching: " + watchPath);
    }

    /**
     * Main watch loop
     */
    private void watchLoop() {
        while (running) {
            WatchKey key;
            try {
                // Wait for events (blocks until an event occurs)
                key = watchService.poll(1, TimeUnit.SECONDS);
                if (key == null) {
                    continue;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                AppLog.error("DirectoryWatcher", "Error polling watch service: " + e.getMessage());
                break;
            }

            // Get the directory for this watch key
            Path dir = watchKeys.get(key);
            if (dir == null) {
                AppLog.warn("DirectoryWatcher", "Watch key not recognized");
                key.reset();
                continue;
            }

            for (WatchEvent<?> event : key.pollEvents()) {
                WatchEvent.Kind<?> kind = event.kind();

                // Skip overflow events
                if (kind == StandardWatchEventKinds.OVERFLOW) {
                    continue;
                }

                @SuppressWarnings("unchecked")
                WatchEvent<Path> pathEvent = (WatchEvent<Path>) event;
                Path filename = pathEvent.context();
                Path fullPath = dir.resolve(filename);

                // If a new directory is created, register it
                if (kind == StandardWatchEventKinds.ENTRY_CREATE) {
                    try {
                        if (Files.isDirectory(fullPath)) {
                            registerDirectoryRecursively(fullPath);
                            AppLog.info("DirectoryWatcher", "Registered new directory: " + fullPath);
                        }
                    } catch (IOException e) {
                        AppLog.error("DirectoryWatcher", "Failed to register new directory: " + e.getMessage());
                    }
                }

                handleFileEvent(kind, fullPath);
            }

            // Reset the key
            boolean valid = key.reset();
            if (!valid) {
                watchKeys.remove(key);
                AppLog.warn("DirectoryWatcher", "Watch key no longer valid, removed from tracking");
            }
        }
    }

    /**
     * Handle a file system event
     */
    private void handleFileEvent(WatchEvent.Kind<?> kind, Path filePath) {
        try {
            FileEventType eventType;
            byte[] fileBuffer = null;
            String checksum = null;

            if (kind == StandardWatchEventKinds.ENTRY_CREATE) {
                eventType = FileEventType.CREATED;
                if (Files.exists(filePath) && Files.isRegularFile(filePath)) {
                    fileBuffer = Files.readAllBytes(filePath);
                    checksum = calculateChecksum(fileBuffer);
                }
            } else if (kind == StandardWatchEventKinds.ENTRY_MODIFY) {
                eventType = FileEventType.MODIFIED;
                if (Files.exists(filePath) && Files.isRegularFile(filePath)) {
                    fileBuffer = Files.readAllBytes(filePath);
                    checksum = calculateChecksum(fileBuffer);
                }
            } else if (kind == StandardWatchEventKinds.ENTRY_DELETE) {
                eventType = FileEventType.DELETED;
            } else {
                return;
            }

            FileEvent event = new FileEvent(eventType, filePath.toString(), fileBuffer, checksum);
            AppLog.debug("DirectoryWatcher", "File event: " + event);

            // Trigger callback
            callback.onFileEvent(event);

        } catch (Exception e) {
            AppLog.error("DirectoryWatcher", "Error handling file event: " + e.getMessage());
        }
    }

    /**
     * Get all files in the watched directory
     */
    public List<String> getAllFiles() throws IOException {
        List<String> files = new ArrayList<>();

        if (!Files.exists(watchPath)) {
            return files;
        }

        Files.walkFileTree(watchPath, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (attrs.isRegularFile()) {
                    files.add(file.toString());
                }
                return FileVisitResult.CONTINUE;
            }
        });

        return files;
    }

    /**
     * Calculate SHA-256 checksum of file data
     */
    private String calculateChecksum(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);

            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
