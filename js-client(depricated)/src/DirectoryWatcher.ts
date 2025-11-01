import * as fs from "node:fs";
import * as path from "node:path";
import { AppLog } from "./appLog.js";
import { calculateFileChecksum } from "./utils/utils.js";

export enum FileEventType {
  INSERT = "insert",
  UPDATE = "update",
  DELETE = "delete"
}

export interface FileEvent {
  type: FileEventType;
  filePath: string;
  absolutePath: string;
  timestamp: Date;
  fileName: string;
  fileBuffer?: Buffer;
  checksum?: string;
}

export type FileEventCallback = (event: FileEvent) => void;

export interface DirectoryWatcherOptions {
  /**
   * Whether to ignore hidden files (files starting with .)
   * @default true
   */
  ignoreHidden?: boolean;

  /**
   * Debounce delay in milliseconds to avoid duplicate events
   * @default 100
   */
  debounceDelay?: number;

  /**
   * File extensions to watch (e.g., ['.txt', '.md']). If empty, watch all files.
   * @default []
   */
  fileExtensions?: string[];

  /**
   * Directories to exclude from watching (e.g., ['node_modules', '.git'])
   * @default ['node_modules', '.git']
   */
  excludeDirs?: string[];
}

interface FileState {
  exists: boolean;
  mtime: number;
  size: number;
}

/**
 * DirectoryWatcher class to monitor file system changes recursively
 * Detects file insert, update, and delete events
 */
export class DirectoryWatcher {
  private watcher: fs.FSWatcher | null = null;
  private watchPath: string;
  private callback: FileEventCallback;
  private options: Required<DirectoryWatcherOptions>;
  private fileStates: Map<string, FileState> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isWatching: boolean = false;

  constructor(
    watchPath: string,
    callback: FileEventCallback,
    options: DirectoryWatcherOptions = {}
  ) {
    this.watchPath = path.resolve(watchPath);
    this.callback = callback;
    this.options = {
      ignoreHidden: options.ignoreHidden ?? true,
      debounceDelay: options.debounceDelay ?? 100,
      fileExtensions: options.fileExtensions ?? [],
      excludeDirs: options.excludeDirs ?? ["node_modules", ".git"]
    };

    // Validate watch path
    if (!fs.existsSync(this.watchPath)) {
      throw new Error(`Watch path does not exist: ${this.watchPath}`);
    }

    const stats = fs.statSync(this.watchPath);
    if (!stats.isDirectory()) {
      throw new Error(`Watch path is not a directory: ${this.watchPath}`);
    }
  }

  /**
   * Start watching the directory
   */
  public start(): void {
    if (this.isWatching) {
      AppLog.info("DirectoryWatcher", `Already watching: ${this.watchPath}`);
      return;
    }

    // Initialize file states
    this.scanDirectory(this.watchPath);

    // Start watching
    try {
      this.watcher = fs.watch(
        this.watchPath,
        { recursive: true },
        (eventType, filename) => {
          if (filename) {
            this.handleFileEvent(eventType, filename);
          }
        }
      );

      this.isWatching = true;
      AppLog.info("DirectoryWatcher", `Started watching: ${this.watchPath}`);
    } catch (error) {
      AppLog.error("DirectoryWatcher", `Failed to start watching: ${error}`);
      throw error;
    }
  }

  /**
   * Stop watching the directory
   */
  public stop(): void {
    if (!this.isWatching) {
      AppLog.info("DirectoryWatcher", "Not currently watching");
      return;
    }

    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Close watcher
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.isWatching = false;
    this.fileStates.clear();
    AppLog.info("DirectoryWatcher", `Stopped watching: ${this.watchPath}`);
  }

  /**
   * Check if the watcher is currently active
   */
  public isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Get the path being watched
   */
  public getWatchPath(): string {
    return this.watchPath;
  }

  /**
   * Get all files recursively in the given directory
   * @param dirPath - The directory path to scan (defaults to watched directory)
   * @returns Array of file paths (relative to the watched directory)
   */
  public getAllFiles(dirPath?: string): string[] {
    const scanPath = dirPath ? path.resolve(dirPath) : this.watchPath;
    const files: string[] = [];

    try {
      this.collectFiles(scanPath, files);
    } catch (error) {
      AppLog.error("DirectoryWatcher", `Error getting all files: ${error}`);
    }

    return files;
  }

  /**
   * Helper method to recursively collect files
   */
  private collectFiles(dirPath: string, files: string[]): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.watchPath, fullPath);

        // Skip excluded directories
        if (entry.isDirectory() && this.isExcludedDir(entry.name)) {
          continue;
        }

        // Skip hidden files if configured
        if (this.options.ignoreHidden && entry.name.startsWith(".")) {
          continue;
        }

        if (entry.isDirectory()) {
          this.collectFiles(fullPath, files);
        } else if (entry.isFile()) {
          if (this.shouldWatchFile(entry.name)) {
            files.push(relativePath);
          }
        }
      }
    } catch (error) {
      AppLog.error("DirectoryWatcher", `Error reading directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Scan directory to build initial file states
   */
  private scanDirectory(dirPath: string): void {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.watchPath, fullPath);

        // Skip excluded directories
        if (entry.isDirectory() && this.isExcludedDir(entry.name)) {
          continue;
        }

        // Skip hidden files if configured
        if (this.options.ignoreHidden && entry.name.startsWith(".")) {
          continue;
        }

        if (entry.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          if (this.shouldWatchFile(entry.name)) {
            const stats = fs.statSync(fullPath);
            this.fileStates.set(relativePath, {
              exists: true,
              mtime: stats.mtimeMs,
              size: stats.size
            });
          }
        }
      }
    } catch (error) {
      AppLog.error("DirectoryWatcher", `Error scanning directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileEvent(eventType: string, filename: string): void {
    const absolutePath = path.join(this.watchPath, filename);

    // Check if it's a directory in excluded list
    const pathParts = filename.split(path.sep);
    if (pathParts.some(part => this.isExcludedDir(part))) {
      return;
    }

    // Skip hidden files if configured
    const basename = path.basename(filename);
    if (this.options.ignoreHidden && basename.startsWith(".")) {
      return;
    }

    // Skip if not a watched file extension
    if (!this.shouldWatchFile(basename)) {
      return;
    }

    // Debounce the event
    const existingTimer = this.debounceTimers.get(filename);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.processFileEvent(filename, absolutePath);
      this.debounceTimers.delete(filename);
    }, this.options.debounceDelay);

    this.debounceTimers.set(filename, timer);
  }

  /**
   * Process the file event and determine the event type
   */
  private processFileEvent(filename: string, absolutePath: string): void {
    const exists = fs.existsSync(absolutePath);
    const previousState = this.fileStates.get(filename);

    let eventType: FileEventType;

    if (exists) {
      const stats = fs.statSync(absolutePath);

      // Skip directories
      if (stats.isDirectory()) {
        return;
      }

      const currentState: FileState = {
        exists: true,
        mtime: stats.mtimeMs,
        size: stats.size
      };

      if (!previousState || !previousState.exists) {
        // File was created (INSERT)
        eventType = FileEventType.INSERT;
      } else {
        // File was modified (UPDATE)
        // Check if actually modified (mtime or size changed)
        if (
          currentState.mtime !== previousState.mtime ||
          currentState.size !== previousState.size
        ) {
          eventType = FileEventType.UPDATE;
        } else {
          // No actual change, skip
          return;
        }
      }

      this.fileStates.set(filename, currentState);
    } else {
      // File was deleted (DELETE)
      if (!previousState || !previousState.exists) {
        // File didn't exist before, skip
        return;
      }

      eventType = FileEventType.DELETE;
      this.fileStates.set(filename, {
        exists: false,
        mtime: 0,
        size: 0
      });
    }

    // Emit the event
    const event: FileEvent = {
      type: eventType,
      filePath: filename,
      absolutePath: absolutePath,
      timestamp: new Date(),
      fileName: path.basename(filename)
    };

    // Read file buffer and calculate checksum for INSERT and UPDATE events
    if (exists && (eventType === FileEventType.INSERT || eventType === FileEventType.UPDATE)) {
      try {
        event.fileBuffer = fs.readFileSync(absolutePath);
        event.checksum = calculateFileChecksum(absolutePath);
      } catch (error) {
        AppLog.error("DirectoryWatcher", `Error reading file buffer/checksum for ${filename}: ${error}`);
      }
    }

    try {
      this.callback(event);
    } catch (error) {
      AppLog.error("DirectoryWatcher", `Error in callback: ${error}`);
    }
  }

  /**
   * Check if a directory should be excluded
   */
  private isExcludedDir(dirName: string): boolean {
    return this.options.excludeDirs.includes(dirName);
  }

  /**
   * Check if a file should be watched based on extension
   */
  private shouldWatchFile(filename: string): boolean {
    if (this.options.fileExtensions.length === 0) {
      return true;
    }

    const ext = path.extname(filename).toLowerCase();
    return this.options.fileExtensions.some(
      allowedExt => allowedExt.toLowerCase() === ext
    );
  }
}
