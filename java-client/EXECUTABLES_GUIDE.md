# Building Executables Guide

This guide explains how to build platform-specific executables for the Node Drive Java Client.

## Quick Start

### Build All Executables (Recommended)

To build executables for all platforms at once:

```bash
./gradlew exportAll
```

This will create:
- `node-drive-client-macos` - macOS executable
- `node-drive-client-winxp.exe` - Windows XP (32-bit)
- `node-drive-client-win7.exe` - Windows 7+ (64-bit)
- `node-drive-client-win10.exe` - Windows 10+ (64-bit)

All executables will be placed in `build/executables/`

## Platform-Specific Builds

### macOS Executable

```bash
./gradlew buildMacExe
```

**Output:** `build/executables/node-drive-client-macos`

**Requirements:**
- Java 8+ installed on the target system

**Distribution:**
The macOS executable is a shell script wrapper that:
- Checks for Java installation
- Runs the bundled JAR file
- Passes all command-line arguments to the application

You can distribute both:
- `node-drive-client-macos` (shell script)
- `java-client-1.0.0.jar` (JAR file)

**Usage:**
```bash
./node-drive-client-macos /path/to/watch http://server:3000
```

### Windows Executables

#### Prerequisites

To build Windows executables, you need Launch4j installed:

1. Download Launch4j from: http://launch4j.sourceforge.net/
2. Install it on your system
3. Set the `LAUNCH4J_HOME` environment variable:
   ```bash
   export LAUNCH4J_HOME=/path/to/launch4j
   ```

#### Build Individual Windows Versions

**Windows XP (32-bit):**
```bash
./gradlew buildWinXpExe
```

**Windows 7+ (64-bit):**
```bash
./gradlew buildWin7Exe
```

**Windows 10+ (64-bit):**
```bash
./gradlew buildWin10Exe
```

#### Build All Windows Versions

```bash
./gradlew buildWindowsExes
```

**Output:** `build/executables/node-drive-client-*.exe`

## Available Gradle Tasks

### Build Tasks
- `buildMacExe` - Build macOS executable
- `buildWinXpExe` - Build Windows XP executable
- `buildWin7Exe` - Build Windows 7 executable
- `buildWin10Exe` - Build Windows 10 executable
- `buildWindowsExes` - Build all Windows executables

### Distribution Tasks
- `exportAll` - Build all executables for all platforms

### Other Useful Tasks
- `jar` - Build the fat JAR file only
- `build` - Build and test the project
- `windowsExeBuildInfo` - Show detailed Windows build instructions

## Output Directory Structure

After running `./gradlew exportAll`, you'll have:

```
build/executables/
├── java-client-1.0.0.jar          # Fat JAR with all dependencies
├── node-drive-client-macos        # macOS executable (shell script)
├── node-drive-client-winxp.exe    # Windows XP 32-bit
├── node-drive-client-win7.exe     # Windows 7+ 64-bit
└── node-drive-client-win10.exe    # Windows 10+ 64-bit
```

## Distribution Notes

### macOS
- Requires Java 8 or later installed on the target system
- The executable checks for Java and shows a helpful error if not found
- Can be distributed with the JAR file for maximum compatibility

### Windows
- Executables can be distributed standalone if JRE is bundled
- To bundle JRE, create a `jre/` folder next to the .exe with a compatible JRE
- Windows XP requires 32-bit JRE
- Windows 7+ and 10 use 64-bit JRE

### JRE Download Links
- **Java 8 for macOS/Linux:** https://adoptium.net/temurin/releases/?version=8
- **Windows 32-bit (XP):** https://adoptium.net/temurin/releases/?version=8&os=windows&arch=x86
- **Windows 64-bit (7+):** https://adoptium.net/temurin/releases/?version=8&os=windows&arch=x64

## Troubleshooting

### Launch4j Not Found (Windows builds)

If you see an error about Launch4j not being found:

1. Install Launch4j from http://launch4j.sourceforge.net/
2. Set the environment variable:
   ```bash
   export LAUNCH4J_HOME=/path/to/launch4j
   ```
3. Run the build command again

### macOS Executable Permission Denied

If you get a permission denied error:
```bash
chmod +x build/executables/node-drive-client-macos
```

### Testing Built Executables

**macOS:**
```bash
./build/executables/node-drive-client-macos /tmp/test http://localhost:3000
```

**Windows (with Wine on macOS/Linux):**
```bash
wine build/executables/node-drive-client-win10.exe C:\\test http://localhost:3000
```

## Examples

### Complete Build Workflow

```bash
# Clean previous builds
./gradlew clean

# Build all executables
./gradlew exportAll

# Test macOS executable
./build/executables/node-drive-client-macos --help

# List all built files
ls -lh build/executables/
```

### Distribution Package

Create a distribution package with all executables:

```bash
# Build all executables
./gradlew exportAll

# Create distribution archive
cd build/executables
tar -czf node-drive-client-all-platforms.tar.gz *

# Or create a zip file
zip -r node-drive-client-all-platforms.zip *
```

## Development

To add support for additional platforms or modify the build:

1. Edit `build.gradle` - contains all build task definitions
2. For Windows configs, modify the Launch4j XML files:
   - `launch4j-win10.xml`
   - `launch4j-win7.xml`
   - `launch4j-winxp.xml`

## See Also

- [BUILD_GUIDE.md](BUILD_GUIDE.md) - General build instructions
- [README.md](README.md) - Project overview and usage
