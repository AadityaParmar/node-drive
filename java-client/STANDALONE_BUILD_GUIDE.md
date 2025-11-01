# Standalone Executable Build Guide

This guide explains how to create **standalone executables** that users can run **without installing Java**.

## Overview

By default, the executables created by `./gradlew exportAll` require Java to be installed on the user's system. This guide shows how to bundle the Java Runtime Environment (JRE) with your executables to create truly standalone packages.

## Quick Start

### Option 1: Automated Download (Recommended)

```bash
# Step 1: Run the JRE download helper script
./download-jre.sh

# Follow the interactive prompts to download JREs
# Choose option 4 to download all platforms

# Step 2: Build standalone packages
./gradlew packageStandalone
```

### Option 2: Manual Download

```bash
# Step 1: See download instructions
./gradlew downloadJreInfo

# Step 2: Download JREs manually and extract to build/jre/

# Step 3: Build standalone packages
./gradlew packageStandalone
```

## Detailed Instructions

### 1. Download JRE Distributions

You need to download JRE for each platform you want to support:

#### macOS (64-bit)
- **Download from:** https://adoptium.net/temurin/releases/?version=8&os=mac&arch=x64
- **File type:** `.tar.gz`
- **Extract to:** `build/jre/macos/jre/`
- **Verify:** `build/jre/macos/jre/Contents/Home/bin/java` should exist

#### Windows 10/7 (64-bit)
- **Download from:** https://adoptium.net/temurin/releases/?version=8&os=windows&arch=x64
- **File type:** `.zip`
- **Extract to:** `build/jre/windows-x64/jre/`
- **Verify:** `build/jre/windows-x64/jre/bin/java.exe` should exist

#### Windows XP (32-bit)
- **Download from:** https://adoptium.net/temurin/releases/?version=8&os=windows&arch=x86
- **File type:** `.zip`
- **Extract to:** `build/jre/windows-x86/jre/`
- **Verify:** `build/jre/windows-x86/jre/bin/java.exe` should exist

### 2. Directory Structure

After downloading and extracting, your directory should look like:

```
java-client/
├── build/
│   └── jre/
│       ├── macos/
│       │   └── jre/
│       │       └── Contents/
│       │           └── Home/
│       │               └── bin/
│       │                   └── java
│       ├── windows-x64/
│       │   └── jre/
│       │       └── bin/
│       │           └── java.exe
│       └── windows-x86/
│           └── jre/
│               └── bin/
│                   └── java.exe
```

### 3. Build Standalone Packages

Once JREs are in place, run:

```bash
# Build all standalone packages
./gradlew packageStandalone
```

Or build for specific platforms:

```bash
# macOS only
./gradlew packageMacStandalone

# Windows only
./gradlew packageWindowsStandalone
```

## Output

Standalone packages are created in `build/distributions/`:

```
build/distributions/
├── node-drive-client-macos.tar.gz      # macOS standalone (~80MB with JRE)
├── node-drive-client-win10.zip         # Windows 10 standalone (~90MB with JRE)
├── node-drive-client-win7.zip          # Windows 7 standalone (~90MB with JRE)
└── node-drive-client-winxp.zip         # Windows XP standalone (~85MB with JRE)
```

## How It Works

### macOS
The macOS executable is a shell script that:
1. First looks for `jre/` folder in the same directory
2. If found, uses the bundled Java runtime
3. If not found, falls back to system Java (if installed)
4. Shows helpful error if neither is available

### Windows
The Windows `.exe` files created by Launch4j:
1. Look for `jre/` folder next to the executable
2. If found, use the bundled Java runtime
3. If not found, look for system Java
4. Show error dialog if Java is not available

## Testing Standalone Packages

### macOS
```bash
# Extract the package
tar -xzf build/distributions/node-drive-client-macos.tar.gz

# Run the executable
./node-drive-client-macos/node-drive-client-macos /path/to/watch http://server:3000
```

### Windows
```bash
# Extract the ZIP file
# On Windows: Right-click -> Extract All
# On macOS/Linux with Wine:
unzip build/distributions/node-drive-client-win10.zip

# Run the executable
wine node-drive-client-win10/node-drive-client-win10.exe C:\\test http://localhost:3000
```

## Distribution

### What to Distribute

Users should download **only ONE** package for their platform:

- **macOS users:** `node-drive-client-macos.tar.gz`
- **Windows 10+ users:** `node-drive-client-win10.zip`
- **Windows 7 users:** `node-drive-client-win7.zip`
- **Windows XP users:** `node-drive-client-winxp.zip`

### User Installation Steps

**macOS:**
1. Download `node-drive-client-macos.tar.gz`
2. Extract the archive (double-click or use `tar -xzf`)
3. Run `node-drive-client-macos` from Terminal
4. No Java installation needed!

**Windows:**
1. Download the appropriate `.zip` file
2. Extract to a folder (Right-click → Extract All)
3. Run `node-drive-client-*.exe`
4. No Java installation needed!

## Available Gradle Tasks

### Distribution Tasks
- `downloadJreInfo` - Show JRE download instructions
- `packageMacStandalone` - Create macOS standalone package
- `packageWindowsStandalone` - Create all Windows standalone packages
- `packageStandalone` - Create all platform standalone packages
- `exportAll` - Build all executables (without bundled JRE)

### Build Tasks
- `buildMacExe` - Build macOS executable (script wrapper)
- `buildWin10Exe` - Build Windows 10 executable
- `buildWin7Exe` - Build Windows 7 executable
- `buildWinXpExe` - Build Windows XP executable
- `buildWindowsExes` - Build all Windows executables

## Comparison: Regular vs Standalone

### Regular Executables (`./gradlew exportAll`)
**Pros:**
- Smaller download size (~3MB)
- Faster build time
- Uses system Java (gets security updates)

**Cons:**
- Requires users to install Java
- May have compatibility issues with different Java versions
- Extra installation step for users

### Standalone Packages (`./gradlew packageStandalone`)
**Pros:**
- No Java installation required
- Guaranteed compatible Java version
- Better user experience (single download)
- Works on systems without admin rights

**Cons:**
- Larger download size (~80-90MB)
- Slower build time
- Includes JRE (doesn't get auto-updates)
- Larger disk space usage

## Troubleshooting

### JRE Not Found Warning

If you see:
```
⚠ Warning: JRE not found at build/jre/macos/jre
```

**Solution:**
1. Run `./download-jre.sh` or download JRE manually
2. Verify the directory structure matches the expected layout
3. Run `./gradlew packageStandalone` again

### Package Size Too Large

Standalone packages are 80-90MB because they include the entire JRE. This is normal.

To reduce size:
- Use JRE instead of JDK (already done in this guide)
- Compress executables with UPX (optional, may trigger antivirus)
- Consider using jlink to create minimal JRE (Java 9+)

### Testing Without Windows

To test Windows executables on macOS/Linux:
```bash
# Install Wine
brew install wine-stable  # macOS
# or: apt-get install wine  # Linux

# Run Windows executable
wine build/packages/node-drive-client-win10/node-drive-client-win10.exe
```

### Executable Doesn't Find Bundled JRE

**macOS:**
Ensure the JRE structure is:
```
node-drive-client-macos/
├── jre/
│   └── Contents/
│       └── Home/
│           └── bin/
│               └── java
└── node-drive-client-macos
```

**Windows:**
Ensure the JRE structure is:
```
node-drive-client-win10/
├── jre/
│   └── bin/
│       └── java.exe
└── node-drive-client-win10.exe
```

## GitHub Releases

To create a release with standalone executables:

```bash
# 1. Build all standalone packages
./gradlew packageStandalone

# 2. Create a GitHub release
gh release create v1.0.0 \
  build/distributions/node-drive-client-macos.tar.gz \
  build/distributions/node-drive-client-win10.zip \
  build/distributions/node-drive-client-win7.zip \
  build/distributions/node-drive-client-winxp.zip \
  --title "Node Drive Client v1.0.0" \
  --notes "Standalone executables with bundled Java Runtime"
```

## Advanced: Custom JRE

If you want to use a different JRE version:

1. Download your preferred JRE
2. Extract to the appropriate `build/jre/` directory
3. Ensure the binary paths are correct
4. Run `./gradlew packageStandalone`

The build script will automatically detect and bundle any JRE found in the expected directories.

## See Also

- [BUILD_GUIDE.md](BUILD_GUIDE.md) - General build instructions
- [EXECUTABLES_GUIDE.md](EXECUTABLES_GUIDE.md) - Regular executable build guide
- [README.md](README.md) - Project overview
