package com.nodedrive.client;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Application logging utility.
 * Port of appLog.ts from Node.js client.
 */
public class AppLog {

    private static final String ANSI_RESET = "\u001B[0m";
    private static final String ANSI_CYAN = "\u001B[36m";
    private static final String ANSI_RED = "\u001B[31m";
    private static final String ANSI_GREEN = "\u001B[32m";

    private static Path logDir;
    private static final SimpleDateFormat timestampFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    private static final SimpleDateFormat fileNameFormat = new SimpleDateFormat("yyyy-MM-dd-HH");

    static {
        // Initialize log directory
        String userDir = System.getProperty("user.dir");
        logDir = Paths.get(userDir, "logs");
        ensureLogDirectory();
    }

    private static void ensureLogDirectory() {
        try {
            if (!Files.exists(logDir)) {
                Files.createDirectories(logDir);
            }
        } catch (IOException e) {
            System.err.println("Failed to create log directory: " + e.getMessage());
        }
    }

    private static String getTimestamp() {
        return timestampFormat.format(new Date());
    }

    private static String getLogFileName() {
        return fileNameFormat.format(new Date()) + ".log";
    }

    private static String formatLogMessage(String logType, String className, String message) {
        return String.format("%s | %s | [CLIENT] %s | %s",
                getTimestamp(), logType, className, message);
    }

    private static void writeToFile(String logMessage) {
        try {
            Path logFile = logDir.resolve(getLogFileName());
            String messageWithNewline = logMessage + System.lineSeparator();

            Files.write(logFile,
                    messageWithNewline.getBytes(),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND);
        } catch (IOException e) {
            System.err.println("Failed to write to log file: " + e.getMessage());
        }
    }

    private static void logToConsole(String color, String logMessage) {
        System.out.println(color + logMessage + ANSI_RESET);
    }

    public static void debug(String className, String message) {
        String logMessage = formatLogMessage("D", className, message);
        logToConsole(ANSI_CYAN, logMessage);
        writeToFile(logMessage);
    }

    public static void error(String className, String message) {
        String logMessage = formatLogMessage("E", className, message);
        logToConsole(ANSI_RED, logMessage);
        writeToFile(logMessage);
    }

    public static void info(String className, String message) {
        String logMessage = formatLogMessage("I", className, message);
        logToConsole(ANSI_GREEN, logMessage);
        writeToFile(logMessage);
    }

    public static void warn(String className, String message) {
        String logMessage = formatLogMessage("W", className, message);
        logToConsole(ANSI_RED, logMessage);
        writeToFile(logMessage);
    }
}
