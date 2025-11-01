# Complete Build Guide - Java Client for All Windows Versions

## Overview

This guide shows you how to build standalone executables for Windows XP, 7, and 10+ using Java 8 and Launch4j.

## Prerequisites

### Development Environment

- Java 8 JDK or higher (installed)
- Gradle (wrapper included, no installation needed)

### For Creating Windows Executables

- Launch4j tool (download from http://launch4j.sourceforge.net/)
- Java 8 JRE distributions (for bundling):
    - 32-bit for Windows XP
    - 64-bit for Windows 7+

## Quick Start

### 1. Build the JAR File

```bash
cd java-client
./gradlew build
```

**Output**: `build/libs/java-client-1.0.0.jar` (2.9 MB)

### 2. Test the JAR

```bash
# Run with default settings
java -jar build/libs/java-client-1.0.0.jar

# Run with custom path and server
java -jar build/libs/java-client-1.0.0.jar /path/to/watch http://server:3000
```

## Creating Windows Executables

### Method 1: Using Launch4j GUI (Easiest)

#### Step 1: Download Launch4j

- Visit: http://launch4j.sourceforge.net/
- Download and install for your platform (Windows, Mac, Linux)

#### Step 2: Download Java 8 JRE

**For Windows XP (32-bit)**:

```bash
# Download from: https://adoptium.net/temurin/releases/
# Filter: Version=8, OS=Windows, Architecture=x86 (32-bit)
# Example: OpenJDK8U-jre_x86-32_windows_hotspot_8u392b08.zip
```

**For Windows 7+ (64-bit)**:

```bash
# Download from: https://adoptium.net/temurin/releases/
# Filter: Version=8, OS=Windows, Architecture=x64
# Example: OpenJDK8U-jre_x64_windows_hotspot_8u392b08.zip
```

#### Step 3: Extract JRE

```bash
# Extract the downloaded JRE
# Place it in a folder named 'jre' in your project
java-client/
├── jre/               # Extracted JRE goes here
│   ├── bin/
│   ├── lib/
│   └── ...
└── build/libs/
    └── java-js-client(depricated)-1.0.0.jar
```

#### Step 4: Configure Launch4j

Open Launch4j and configure:

**Basic Tab:**

- Output file: `build/executables/node-drive-client-winxp.exe`
- Jar: `build/libs/java-client-1.0.0.jar`
- Icon: `src/main/resources/app.ico` (optional)

**Classpath Tab:**

- Main class: `com.nodedrive.client.Main`

**JRE Tab:**

- Bundled JRE path: `jre`
- Min JRE version: `1.8.0`
- For XP: Uncheck "Bundled JRE 64-bit"
- For Win7+: Check "Bundled JRE 64-bit"

**Version Info Tab** (optional):

- File version: `1.0.0.0`
- Product name: `Node Drive Client`
- Copyright: `Copyright © 2024`
- etc.

#### Step 5: Build

Click **"Build wrapper"** button in Launch4j

### Method 2: Using Launch4j Command Line

We've provided XML configuration files for you:

```bash
# Create executables directory
mkdir -p build/executables

# Windows XP (32-bit)
launch4jc launch4j-winxp.xml

# Windows 7 (64-bit)
launch4jc launch4j-win7.xml

# Windows 10+ (64-bit)
launch4jc launch4j-win10.xml
```

**On Mac/Linux**, install Launch4j first:

```bash
# Mac (using Homebrew)
brew install launch4j

# Linux (Ubuntu/Debian)
sudo apt-get install launch4j
```

### Method 3: Using Docker (Cross-platform)

Create a `Dockerfile`:

```dockerfile
FROM openjdk:8-jdk

# Install Launch4j
RUN apt-get update && apt-get install -y launch4j

WORKDIR /app
COPY . .[Dockerfile](Dockerfile)

RUN ./gradlew build
RUN launch4jc launch4j-win10.xml

CMD ["ls", "-lh", "build/executables/"]
```

Build:

```bash
docker build -t node-drive-builder .
docker run --rm -v $(pwd)/build:/app/build node-drive-builder
```

## Distribution Package Structure

After creating the executable, your distribution should look like:

```
node-drive-client/
├── node-drive-client-winxp.exe    # Or win7.exe, win10.exe
└── jre/                            # Bundled Java Runtime
    ├── bin/
    │   ├── java.exe
    │   └── ...
    ├── lib/
    │   └── ...
    └── ...
```

**Total size**: ~100-150 MB (including JRE)

## Distribution

### Option 1: ZIP Archive

```bash
# Create distribution archive
cd build/executables
zip -r node-drive-client-winxp.zip node-drive-client-winxp.exe jre/
```

### Option 2: Installer (Advanced)

Use tools like:

- **Inno Setup** (Windows installer creator)
- **NSIS** (Nullsoft Scriptable Install System)
- **Install4j** (Commercial, cross-platform)

Example Inno Setup script:

```inno
[Setup]
AppName=Node Drive Client
AppVersion=1.0.0
DefaultDirName={pf}\NodeDrive
DefaultGroupName=Node Drive
OutputBaseFilename=NodeDriveClientSetup

[Files]
Source: "node-drive-client-win10.exe"; DestDir: "{app}"
Source: "jre\*"; DestDir: "{app}\jre"; Flags: recursesubdirs

[Icons]
Name: "{group}\Node Drive Client"; Filename: "{app}\node-drive-client-win10.exe"
```

## Testing

### Test on Windows (without creating full distribution)

1. Build JAR:
   ```bash
   ./gradlew build
   ```

2. Run with Java:
   ```bash
   java -jar build/libs/java-client-1.0.0.jar
   ```

### Test Windows Executable

1. Copy to Windows machine (or VM)
2. Ensure JRE folder is in same directory
3. Double-click `.exe` or run from command line:
   ```cmd
   node-drive-client-win10.exe
   ```

### Testing on Virtual Machines

**Windows XP VM**:

- VirtualBox: https://www.virtualbox.org/
- Windows XP ISO (requires license)
- Test `node-drive-client-winxp.exe` (32-bit)

**Windows 7 VM**:

- VirtualBox or VMware
- Test `node-drive-client-win7.exe` (64-bit)

## Troubleshooting

### "Java not found" error

**Cause**: JRE not bundled or in wrong location

**Fix**: Ensure `jre/` folder is next to `.exe` file

### "Could not find or load main class"

**Cause**: JAR not properly packaged or Main class incorrect

**Fix**:

```bash
# Check JAR manifest
jar tf build/libs/java-client-1.0.0.jar | grep Main

# Should show: com/nodedrive/js-client(depricated)/Main.class
```

### Executable doesn't start

**Cause**: Antivirus blocking or wrong JRE architecture

**Fix**:

- Add exception to antivirus
- Verify JRE architecture matches (32-bit for XP, 64-bit for Win7+)

### "This program cannot be run in DOS mode"

**Cause**: Trying to run 64-bit exe on 32-bit system

**Fix**: Use correct executable:

- XP (32-bit) → `node-drive-client-winxp.exe` (32-bit JRE)
- Win7+ (64-bit) → `node-drive-client-win7.exe` (64-bit JRE)

## Build Automation Script

Create `build-all.sh`:

```bash
#!/bin/bash
set -e

echo "Building Java Client for all Windows versions..."

# Build JAR
echo "1. Building JAR..."
./gradlew clean build

# Check if Launch4j is available
if ! command -v launch4jc &> /dev/null; then
    echo "Launch4j not found. Install from http://launch4j.sourceforge.net/"
    echo "JAR file is ready at: build/libs/java-client-1.0.0.jar"
    exit 0
fi

# Create executables directory
mkdir -p build/executables

# Build Windows executables
echo "2. Building Windows XP executable (32-bit)..."
launch4jc launch4j-winxp.xml

echo "3. Building Windows 7 executable (64-bit)..."
launch4jc launch4j-win7.xml

echo "4. Building Windows 10+ executable (64-bit)..."
launch4jc launch4j-win10.xml

echo "Done! Executables are in build/executables/"
ls -lh build/executables/

echo ""
echo "Next steps:"
echo "1. Download Java 8 JRE and extract to 'jre/' folder"
echo "2. Distribute the .exe with the jre/ folder"
```

Make it executable:

```bash
chmod +x build-all.sh
./build-all.sh
```

## Comparison: Build Output Sizes

| Build Type         | Size    | Notes                                   |
|--------------------|---------|-----------------------------------------|
| JAR only           | 2.9 MB  | Requires Java 8+ installed              |
| EXE (no JRE)       | ~1 MB   | Wrapper only, requires Java installed   |
| EXE + JRE (32-bit) | ~100 MB | Fully standalone, Windows XP compatible |
| EXE + JRE (64-bit) | ~120 MB | Fully standalone, Windows 7+            |

## Development Workflow

```bash
# 1. Make code changes
vim src/main/java/com/nodedrive/client/Main.java

# 2. Build and test
./gradlew build
java -jar build/libs/java-client-1.0.0.jar

# 3. Create executable (when ready for distribution)
launch4jc launch4j-win10.xml

# 4. Test executable
./build/executables/node-drive-client-win10.exe
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Java Client

on: [ push ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up JDK 8
        uses: actions/setup-java@v2
        with:
          java-version: '8'
          distribution: 'temurin'

      - name: Build with Gradle
        run: |
          cd java-client
          ./gradlew build

      - name: Upload JAR
        uses: actions/upload-artifact@v2
        with:
          name: java-js-client(depricated)-jar
          path: java-js-client(depricated)/build/libs/*.jar
```

## Summary

**For Windows XP Support:**
✅ Use Java 8 + Launch4j (fully supported)

**For Modern Windows (7/10/11):**
✅ Use Java 8 (or newer) + Launch4j

**Cannot use:**
❌ Node.js + pkg (no XP support)

The Java approach gives you **complete Windows XP support** with modern tooling!
