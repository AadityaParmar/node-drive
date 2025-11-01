import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { DirectoryWatcher, FileEventType, FileEvent } from "../DirectoryWatcher";

describe("DirectoryWatcher", () => {
  let tempDir: string;
  let watcher: DirectoryWatcher;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "watcher-test-"));
  });

  afterEach(() => {
    // Stop watcher if running
    if (watcher && watcher.isActive()) {
      watcher.stop();
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should create DirectoryWatcher instance", () => {
    const callback = jest.fn();
    watcher = new DirectoryWatcher(tempDir, callback);
    expect(watcher).toBeInstanceOf(DirectoryWatcher);
    expect(watcher.getWatchPath()).toBe(tempDir);
  });

  test("should throw error for non-existent directory", () => {
    const callback = jest.fn();
    const nonExistentPath = path.join(tempDir, "non-existent");
    expect(() => {
      new DirectoryWatcher(nonExistentPath, callback);
    }).toThrow("Watch path does not exist");
  });

  test("should throw error for file path instead of directory", () => {
    const callback = jest.fn();
    const filePath = path.join(tempDir, "test.txt");
    fs.writeFileSync(filePath, "test");

    expect(() => {
      new DirectoryWatcher(filePath, callback);
    }).toThrow("Watch path is not a directory");
  });

  test("should start and stop watching", () => {
    const callback = jest.fn();
    watcher = new DirectoryWatcher(tempDir, callback);

    expect(watcher.isActive()).toBe(false);
    watcher.start();
    expect(watcher.isActive()).toBe(true);
    watcher.stop();
    expect(watcher.isActive()).toBe(false);
  });

  test("should detect file creation (INSERT)", (done) => {
    const callback = jest.fn((event: FileEvent) => {
      expect(event.type).toBe(FileEventType.INSERT);
      expect(event.filePath).toBe("test.txt");
      expect(event.absolutePath).toBe(path.join(tempDir, "test.txt"));
      expect(event.timestamp).toBeInstanceOf(Date);
      done();
    });

    watcher = new DirectoryWatcher(tempDir, callback);
    watcher.start();

    // Create a file after a short delay
    setTimeout(() => {
      fs.writeFileSync(path.join(tempDir, "test.txt"), "Hello World");
    }, 100);
  }, 5000);

  test("should detect file update (UPDATE)", (done) => {
    // Create initial file
    const filePath = path.join(tempDir, "test.txt");
    fs.writeFileSync(filePath, "Initial content");

    let eventCount = 0;
    const callback = jest.fn((event: FileEvent) => {
      eventCount++;
      if (eventCount === 1) {
        // First event should be UPDATE (file already existed when watcher started)
        expect(event.type).toBe(FileEventType.UPDATE);
        expect(event.filePath).toBe("test.txt");
        done();
      }
    });

    watcher = new DirectoryWatcher(tempDir, callback);
    watcher.start();

    // Update the file after a short delay
    setTimeout(() => {
      fs.writeFileSync(filePath, "Updated content");
    }, 200);
  }, 5000);

  test("should detect file deletion (DELETE)", (done) => {
    // Create initial file
    const filePath = path.join(tempDir, "test.txt");
    fs.writeFileSync(filePath, "Content");

    const callback = jest.fn((event: FileEvent) => {
      if (event.type === FileEventType.DELETE) {
        expect(event.filePath).toBe("test.txt");
        expect(event.absolutePath).toBe(filePath);
        done();
      }
    });

    watcher = new DirectoryWatcher(tempDir, callback);
    watcher.start();

    // Delete the file after a short delay
    setTimeout(() => {
      fs.unlinkSync(filePath);
    }, 200);
  }, 5000);

  test("should ignore hidden files when configured", (done) => {
    const callback = jest.fn();

    watcher = new DirectoryWatcher(tempDir, callback, {
      ignoreHidden: true
    });
    watcher.start();

    // Create a hidden file
    setTimeout(() => {
      fs.writeFileSync(path.join(tempDir, ".hidden.txt"), "Hidden");
    }, 100);

    // Wait and verify callback was not called
    setTimeout(() => {
      expect(callback).not.toHaveBeenCalled();
      done();
    }, 500);
  }, 5000);

  test("should watch only specified file extensions", (done) => {
    const callback = jest.fn((event: FileEvent) => {
      // Should only receive events for .txt files
      expect(event.filePath.endsWith(".txt")).toBe(true);
      done();
    });

    watcher = new DirectoryWatcher(tempDir, callback, {
      fileExtensions: [".txt"]
    });
    watcher.start();

    // Create files with different extensions
    setTimeout(() => {
      fs.writeFileSync(path.join(tempDir, "test.txt"), "Text file");
      fs.writeFileSync(path.join(tempDir, "test.md"), "Markdown file");
    }, 100);
  }, 5000);

  test("should exclude specified directories", (done) => {
    const callback = jest.fn();

    // Create excluded directory
    const excludedDir = path.join(tempDir, "node_modules");
    fs.mkdirSync(excludedDir);

    watcher = new DirectoryWatcher(tempDir, callback, {
      excludeDirs: ["node_modules"]
    });
    watcher.start();

    // Create a file in excluded directory
    setTimeout(() => {
      fs.writeFileSync(path.join(excludedDir, "test.txt"), "Excluded");
    }, 100);

    // Wait and verify callback was not called
    setTimeout(() => {
      expect(callback).not.toHaveBeenCalled();
      done();
    }, 500);
  }, 5000);

  test("should handle nested directory file creation", (done) => {
    // Create nested directory
    const nestedDir = path.join(tempDir, "subdir", "nested");
    fs.mkdirSync(nestedDir, { recursive: true });

    const callback = jest.fn((event: FileEvent) => {
      expect(event.type).toBe(FileEventType.INSERT);
      expect(event.filePath).toContain(path.join("subdir", "nested", "test.txt"));
      done();
    });

    watcher = new DirectoryWatcher(tempDir, callback);
    watcher.start();

    // Create a file in nested directory
    setTimeout(() => {
      fs.writeFileSync(path.join(nestedDir, "test.txt"), "Nested file");
    }, 100);
  }, 5000);

  test("should debounce rapid file changes", (done) => {
    const callback = jest.fn();

    watcher = new DirectoryWatcher(tempDir, callback, {
      debounceDelay: 200
    });
    watcher.start();

    const filePath = path.join(tempDir, "test.txt");

    // Make rapid changes
    setTimeout(() => {
      fs.writeFileSync(filePath, "Change 1");
      setTimeout(() => fs.appendFileSync(filePath, "Change 2"), 50);
      setTimeout(() => fs.appendFileSync(filePath, "Change 3"), 100);
    }, 100);

    // Check that callback was called only once (debounced)
    setTimeout(() => {
      // Should be called once or twice max due to debouncing
      expect(callback.mock.calls.length).toBeLessThanOrEqual(2);
      done();
    }, 1000);
  }, 5000);

  test("should get all files recursively", () => {
    // Create a directory structure
    const subdir = path.join(tempDir, "subdir");
    const nested = path.join(subdir, "nested");
    fs.mkdirSync(nested, { recursive: true });

    // Create files at different levels
    fs.writeFileSync(path.join(tempDir, "file1.txt"), "content 1");
    fs.writeFileSync(path.join(tempDir, "file2.txt"), "content 2");
    fs.writeFileSync(path.join(subdir, "file3.txt"), "content 3");
    fs.writeFileSync(path.join(nested, "file4.txt"), "content 4");

    const callback = jest.fn();
    watcher = new DirectoryWatcher(tempDir, callback);

    const allFiles = watcher.getAllFiles();

    expect(allFiles).toHaveLength(4);
    expect(allFiles).toContain("file1.txt");
    expect(allFiles).toContain("file2.txt");
    expect(allFiles).toContain(path.join("subdir", "file3.txt"));
    expect(allFiles).toContain(path.join("subdir", "nested", "file4.txt"));
  });

  test("should filter files by extension in getAllFiles", () => {
    // Create files with different extensions
    fs.writeFileSync(path.join(tempDir, "file1.txt"), "content 1");
    fs.writeFileSync(path.join(tempDir, "file2.md"), "content 2");
    fs.writeFileSync(path.join(tempDir, "file3.txt"), "content 3");

    const callback = jest.fn();
    watcher = new DirectoryWatcher(tempDir, callback, {
      fileExtensions: [".txt"]
    });

    const allFiles = watcher.getAllFiles();

    expect(allFiles).toHaveLength(2);
    expect(allFiles).toContain("file1.txt");
    expect(allFiles).toContain("file3.txt");
    expect(allFiles).not.toContain("file2.md");
  });

  test("should exclude hidden files in getAllFiles", () => {
    // Create regular and hidden files
    fs.writeFileSync(path.join(tempDir, "file1.txt"), "content 1");
    fs.writeFileSync(path.join(tempDir, ".hidden.txt"), "hidden content");
    fs.writeFileSync(path.join(tempDir, "file2.txt"), "content 2");

    const callback = jest.fn();
    watcher = new DirectoryWatcher(tempDir, callback, {
      ignoreHidden: true
    });

    const allFiles = watcher.getAllFiles();

    expect(allFiles).toHaveLength(2);
    expect(allFiles).toContain("file1.txt");
    expect(allFiles).toContain("file2.txt");
    expect(allFiles).not.toContain(".hidden.txt");
  });

  test("should exclude specified directories in getAllFiles", () => {
    // Create directories
    const nodeModules = path.join(tempDir, "node_modules");
    const src = path.join(tempDir, "src");
    fs.mkdirSync(nodeModules);
    fs.mkdirSync(src);

    // Create files in different directories
    fs.writeFileSync(path.join(tempDir, "file1.txt"), "content 1");
    fs.writeFileSync(path.join(nodeModules, "file2.txt"), "content 2");
    fs.writeFileSync(path.join(src, "file3.txt"), "content 3");

    const callback = jest.fn();
    watcher = new DirectoryWatcher(tempDir, callback, {
      excludeDirs: ["node_modules"]
    });

    const allFiles = watcher.getAllFiles();

    expect(allFiles).toHaveLength(2);
    expect(allFiles).toContain("file1.txt");
    expect(allFiles).toContain(path.join("src", "file3.txt"));
    expect(allFiles).not.toContain(path.join("node_modules", "file2.txt"));
  });
});
