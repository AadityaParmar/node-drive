# Node Drive Client - Java Edition

Complete Java implementation of the Node Drive client with support for Windows XP, 7, and 10+.

## Features

- ✅ **Full Windows XP Support** (Java 8 + Launch4j)
- ✅ **macOS Support** with bundled JRE
- ✅ **Directory watching** with automatic file upload
- ✅ **File change detection** (create, modify, delete)
- ✅ **SHA-256 checksums** for data integrity
- ✅ **HTTP client** for server communication
- ✅ **Comprehensive logging** with color-coded console output
- ✅ **Standalone executables** - No Java installation required!

## Requirements

### Development

- Java 8 or higher
- Gradle (wrapper included)

### Runtime (for executables)

- Windows XP, 7, 8, 10, or 11
- No Java installation required (JRE bundled in executable)

## Project Structure

```
java-client/
├── src/main/java/com/nodedrive/client/
│   ├── Main.java                  # Application entry point
│   ├── DirectoryWatcher.java      # File system watcher
│   ├── ServerApiClient.java       # HTTP client for server
│   ├── AppLog.java                # Logging utility
│   └── FileInfo.java              # File metadata utilities
├── build.gradle                   # Gradle build configuration
├── gradlew                        # Gradle wrapper (Unix)
├── gradlew.bat                    # Gradle wrapper (Windows)
└── README.md                      # This file
```

## Building

### Quick Start - Build All Executables

```bash
# Build all executables for all platforms (macOS + Windows)
./gradlew exportAll

# Output: build/executables/
# - node-drive-js-client(depricated)-macos
# - node-drive-js-client(depricated)-winxp.exe
# - node-drive-js-client(depricated)-win7.exe
# - node-drive-js-client(depricated)-win10.exe
```

**Note:** These executables require Java to be installed on the user's system.

### Create Standalone Packages (No Java Required!)

For executables that users can run **without installing Java**:

```bash
# Step 1: Download JRE distributions (interactive helper script)
./download-jre.sh

# Step 2: Build standalone packages with bundled JRE
./gradlew packageStandalone

# Output: build/distributions/
# - node-drive-js-client(depricated)-macos.tar.gz (~80MB)
# - node-drive-js-client(depricated)-winxp.zip (~85MB)
# - node-drive-js-client(depricated)-win7.zip (~90MB)
# - node-drive-js-client(depricated)-win10.zip (~90MB)
```

**See [STANDALONE_BUILD_GUIDE.md](STANDALONE_BUILD_GUIDE.md) for detailed instructions.**

### Platform-Specific Builds

```bash
# macOS only
./gradlew buildMacExe

# Windows XP (32-bit)
./gradlew buildWinXpExe

# Windows 7+ (64-bit)
./gradlew buildWin7Exe

# Windows 10+ (64-bit)
./gradlew buildWin10Exe

# All Windows executables
./gradlew buildWindowsExes
```

### JAR File Only

```bash
# Build fat JAR with all dependencies
./gradlew jar

# Output: build/libs/java-js-client(depricated)-1.0.0.jar
```

## Running

### Run with Gradle

```bash
# Default settings (watches ~/Documents/node-drive/target, connects to localhost:3000)
./gradlew run

# With custom watch path
./gradlew run --args="/path/to/watch"

# With custom watch path and server URL
./gradlew run --args="/path/to/watch http://server:3000"
```

### Run JAR Directly

```bash
# Default settings
java -jar build/libs/java-client-1.0.0.jar

# With arguments
java -jar build/libs/java-client-1.0.0.jar /path/to/watch http://server:3000
```

### Run Windows Executable

```cmd
# Default settings
node-drive-client-win10.exe

# With arguments
node-drive-client-win10.exe C:\path\to\watch http://server:3000
```

## Configuration

### Command Line Arguments

```
java -jar java-client-1.0.0.jar [WATCH_PATH] [SERVER_URL]
```

- `WATCH_PATH` - Directory to watch for file changes (default: `~/Documents/node-drive/target`)
- `SERVER_URL` - Server URL (default: `http://localhost:3000`)

### Environment Variables

- `NODE_DRIVE_SERVER_URL` - Server URL (overridden by command line argument)

## Documentation

- **[BUILD_GUIDE.md](BUILD_GUIDE.md)** - Detailed build instructions and troubleshooting
- **[STANDALONE_BUILD_GUIDE.md](STANDALONE_BUILD_GUIDE.md)** - Create standalone executables with bundled JRE
- **[EXECUTABLES_GUIDE.md](EXECUTABLES_GUIDE.md)** - Platform-specific executable creation

## Available Gradle Tasks

### Build Tasks

- `jar` - Build fat JAR with dependencies
- `buildMacExe` - Build macOS executable
- `buildWinXpExe` - Build Windows XP executable
- `buildWin7Exe` - Build Windows 7 executable
- `buildWin10Exe` - Build Windows 10 executable
- `buildWindowsExes` - Build all Windows executables
- `exportAll` - Build all platform executables

### Distribution Tasks (Standalone with JRE)

- `downloadJreInfo` - Show JRE download instructions
- `packageMacStandalone` - Package macOS with bundled JRE
- `packageWindowsStandalone` - Package Windows with bundled JRE
- `packageStandalone` - Package all platforms with bundled JRE

### Development Tasks

- `build` - Build and test project
- `test` - Run tests
- `run` - Run application
- `clean` - Clean build artifacts

## Comparison: Java vs Node.js Client

| Feature             | Java Client           | Node.js Client        |
|---------------------|-----------------------|-----------------------|
| **Windows XP**      | ✅ Full support        | ❌ Not supported       |
| **Windows 7**       | ✅ Full support        | ✅ Supported           |
| **Windows 10+**     | ✅ Full support        | ✅ Supported           |
| **Executable Size** | ~100-150MB (with JRE) | ~30-40MB              |
| **Build Tool**      | ✅ Gradle + Launch4j   | ❌ pkg (no XP support) |
| **Language**        | Java 8                | TypeScript/JavaScript |
| **Performance**     | Excellent             | Good                  |
| **Stability**       | Very stable           | Good                  |

## Dependencies

- **OkHttp 4.9.3** - HTTP client (Java 8 compatible)
- **Gson 2.10.1** - JSON processing
- **SLF4J 1.7.36** - Logging facade

## Development

### Run Tests

```bash
./gradlew test
```

### Clean Build

```bash
./gradlew clean build
```

### Show Build Info

```bash
./gradlew buildInfo
```

## Troubleshooting

### "Java not found" when running JAR

Make sure Java 8 or higher is installed:

```bash
java -version
```

### Gradle build fails

Try cleaning first:

```bash
./gradlew clean
./gradlew build
```

### Launch4j fails to create executable

- Ensure Java 8 JDK is installed (not just JRE)
- Check that Launch4j configuration points to correct JAR file
- Verify icon file exists (if specified)

### Windows executable doesn't start

- Check that `jre/` folder is present next to the .exe
- Verify JRE version is Java 8
- Check antivirus isn't blocking the executable

## License

ISC

## Author

Node Drive Team
