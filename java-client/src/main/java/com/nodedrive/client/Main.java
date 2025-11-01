package com.nodedrive.client;

import java.io.IOException;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Enumeration;
import java.util.List;

/**
 * Main application entry point.
 * Port of index.ts from Node.js client.
 */
public class Main {

    /**
     * Get unique device ID based on hostname and MAC address
     */
    private static String getDeviceId() {
        try {
            String hostname = InetAddress.getLocalHost().getHostName();
            String mac = getMacAddress();
            return hostname + "-" + mac;
        } catch (Exception e) {
            AppLog.error("Main", "Error getting device ID: " + e.getMessage());
            return "unknown-device";
        }
    }

    /**
     * Get MAC address of the first non-loopback network interface
     */
    private static String getMacAddress() {
        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();

            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface ni = networkInterfaces.nextElement();

                // Skip loopback and inactive interfaces
                if (ni.isLoopback() || !ni.isUp()) {
                    continue;
                }

                byte[] mac = ni.getHardwareAddress();
                if (mac != null && mac.length > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < mac.length; i++) {
                        sb.append(String.format("%02X", mac[i]));
                        if (i < mac.length - 1) {
                            sb.append(":");
                        }
                    }
                    return sb.toString();
                }
            }
        } catch (SocketException e) {
            AppLog.error("Main", "Error getting MAC address: " + e.getMessage());
        }

        return "00:00:00:00:00:00";
    }

    public static void main(String[] args) {
        AppLog.info("Main", "===========================================");
        AppLog.info("Main", "Node Drive Client - Java Edition");
        AppLog.info("Main", "Version: 1.0.0");
        AppLog.info("Main", "Java Version: " + System.getProperty("java.version"));
        AppLog.info("Main", "OS: " + System.getProperty("os.name") + " " + System.getProperty("os.version"));
        AppLog.info("Main", "===========================================");

        // Get username and device ID
        String username = System.getProperty("user.name");
        String deviceId = getDeviceId();

        AppLog.info("Main", "Username: " + username);
        AppLog.info("Main", "Device ID: " + deviceId);

        // Parse command line arguments
        String watchPath = getWatchPath(args);
        String serverUrl = getServerUrl(args);

        AppLog.info("Main", "Watch Path: " + watchPath);
        AppLog.info("Main", "Server URL: " + serverUrl);

        // Initialize server client
        ServerApiClient.Config clientConfig = new ServerApiClient.Config(
                serverUrl,
                5000,  // timeout
                1,     // retry attempts
                100    // retry delay
        );
        ServerApiClient client = new ServerApiClient(clientConfig);

        // Test server connectivity
        AppLog.info("Main", "Testing server connectivity...");
        if (client.ping()) {
            AppLog.info("Main", "Server is reachable!");
        } else {
            AppLog.warn("Main", "Server is not reachable. Will continue anyway...");
        }

        // Initialize directory watcher
        DirectoryWatcher watcher = new DirectoryWatcher(watchPath, (event) -> {
            AppLog.info("Main", "File event detected: " + event);

            // Handle file creation and modification
            if (event.type == DirectoryWatcher.FileEventType.CREATED ||
                event.type == DirectoryWatcher.FileEventType.MODIFIED) {

                if (event.fileBuffer != null && event.checksum != null) {
                    // Get file info
                    FileInfo.Info fileInfo = FileInfo.getFileInfo(event.fileBuffer, event.filePath);
                    AppLog.info("Main", "File info: " + fileInfo);

                    // Create upload request
                    ServerApiClient.FileUploadRequest uploadRequest = new ServerApiClient.FileUploadRequest();
                    uploadRequest.username = username;
                    uploadRequest.deviceId = deviceId;
                    uploadRequest.file = fileInfo.file;
                    uploadRequest.fileName = fileInfo.fileName;
                    uploadRequest.fileSize = fileInfo.fileSize;
                    uploadRequest.lastModified = fileInfo.lastModified;
                    uploadRequest.checksum = event.checksum;

                    // Upload file to server
                    client.uploadFile(uploadRequest);
                }
            }
        });

        // Start watching
        try {
            watcher.start();

            // Get all existing files
            List<String> allFiles = watcher.getAllFiles();
            AppLog.info("Main", "Found " + allFiles.size() + " existing files");
            for (String file : allFiles) {
                AppLog.debug("Main", "  - " + file);
            }

            // Keep application running
            AppLog.info("Main", "Application started. Press Ctrl+C to exit.");

            // Add shutdown hook
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                AppLog.info("Main", "Shutting down...");
                watcher.stop();
                AppLog.info("Main", "Goodbye!");
            }));

            // Keep main thread alive
            while (true) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    break;
                }
            }

        } catch (IOException e) {
            AppLog.error("Main", "Failed to start directory watcher: " + e.getMessage());
            System.exit(1);
        }
    }

    /**
     * Get watch path from command line arguments, system property, or use default
     */
    private static String getWatchPath(String[] args) {
        // Priority 1: Command line argument
        if (args.length > 0) {
            return args[0];
        }

        // Priority 2: System property (from gradle.properties)
        String propPath = System.getProperty("node.drive.watchPath");
        if (propPath != null && !propPath.isEmpty()) {
            return propPath;
        }

        // Priority 3: Default to user's home directory + node-drive/target
        String userHome = System.getProperty("user.home");
        return userHome + "/Documents/node-drive/target";
    }

    /**
     * Get server URL from command line arguments, environment variable, system property, or use default
     */
    private static String getServerUrl(String[] args) {
        // Priority 1: Command line argument
        if (args.length > 1) {
            return args[1];
        }

        // Priority 2: Environment variable
        String envUrl = System.getenv("NODE_DRIVE_SERVER_URL");
        if (envUrl != null && !envUrl.isEmpty()) {
            return envUrl;
        }

        // Priority 3: System property (from gradle.properties)
        String propUrl = System.getProperty("node.drive.serverUrl");
        if (propUrl != null && !propUrl.isEmpty()) {
            return propUrl;
        }

        // Priority 4: Default
        return "http://localhost:3000";
    }
}
