# Docker Build Guide for Java Client

This guide explains how to build the Java client using Docker, which provides a consistent build environment regardless of your operating system.

## Prerequisites

### Install Docker

**macOS:**
```bash
# Option 1: Using Homebrew (recommended)
brew install --cask docker
open -a Docker

# Option 2: Manual installation
# Visit https://www.docker.com/products/docker-desktop
# Download Docker Desktop for Mac and install
```

**Verify Docker Installation:**
```bash
docker --version
docker ps
```

## Quick Start

### Option 1: Using the Build Script (Recommended)

The simplest way to build the Java client with all Windows executables:

```bash
cd java-client
./docker-build.sh
```

This will:
1. Build a Docker image with Java 8, Gradle, and Launch4j
2. Compile the Java client into a JAR file
3. Create Windows executables for XP, 7, and 10+
4. Create macOS executable (shell script wrapper)
5. Output all artifacts to `build/` directory

**Build Output:**
- `build/libs/java-client-1.0.0.jar` (2.9 MB)
- `build/executables/node-drive-client-winxp.exe` (3.0 MB - Windows XP 32-bit)
- `build/executables/node-drive-client-win7.exe` (3.0 MB - Windows 7+ 64-bit)
- `build/executables/node-drive-client-win10.exe` (3.0 MB - Windows 10/11 64-bit)
- `build/executables/node-drive-client-macos` (2 KB - macOS shell script)

**For JAR-only build (faster):**
```bash
./docker-build.sh --jar-only
```

### Option 2: Manual Docker Build

If you prefer to run Docker commands manually:

**Build all executables (JAR + Windows .exe files):**
```bash
cd java-client

# Build the Docker image (uses x86_64 emulation for launch4j compatibility)
docker build --platform linux/amd64 -t node-drive-java-builder .

# Run the build and extract artifacts
docker run --rm --platform linux/amd64 -v "$(pwd)/build:/app/build" node-drive-java-builder
```

**Build JAR only (faster):**
```bash
docker build -f Dockerfile.simple -t node-drive-java-builder .
docker run --rm -v "$(pwd)/build:/app/build" node-drive-java-builder
```

## Available Dockerfiles

### 1. `Dockerfile` (Full Build - Recommended)
- **Purpose**: Build JAR + all Windows & macOS executables
- **What it includes**: Java 8 JDK + Gradle + Launch4j
- **Output**:
  - `build/libs/java-client-1.0.0.jar` (2.9 MB)
  - `build/executables/node-drive-client-winxp.exe` (3.0 MB - Windows XP 32-bit)
  - `build/executables/node-drive-client-win7.exe` (3.0 MB - Windows 7+ 64-bit)
  - `build/executables/node-drive-client-win10.exe` (3.0 MB - Windows 10/11 64-bit)
  - `build/executables/node-drive-client-macos` (2 KB - macOS shell script)
- **Build time**: ~40-60 seconds (after first build)
- **Reliability**: ✅ Works on all platforms (uses x86_64 emulation)
- **Platform**: Uses `linux/amd64` for launch4j compatibility

**When to use**:
- You want all build artifacts in one go
- You need Windows & macOS executables without platform-specific machines
- You want a complete, reproducible cross-platform build

### 2. `Dockerfile.simple` (JAR Only - Fast)
- **Purpose**: Build only the JAR file
- **What it includes**: Java 8 JDK + Gradle
- **Output**: `build/libs/java-client-1.0.0.jar` (2.9 MB)
- **Build time**: ~20-30 seconds (after first build)
- **Reliability**: ✅ Highly reliable, native platform

**When to use**:
- You just need the JAR file
- You want the fastest possible build
- You'll create Windows executables later using Launch4j locally

## Testing the Output

### Test the JAR file

```bash
# Run with default settings
java -jar build/libs/java-client-1.0.0.jar

# Run with custom path and server
java -jar build/libs/java-client-1.0.0.jar /path/to/watch http://server:3000
```

### Verify the JAR contents

```bash
# List files in the JAR
jar tf build/libs/java-client-1.0.0.jar

# Check for Main class
jar tf build/libs/java-client-1.0.0.jar | grep Main
```

## Build Output Details

| File | Size | Description |
|------|------|-------------|
| `build/libs/java-client-1.0.0.jar` | ~2.9 MB | Standalone JAR file (requires Java 8+ to run) |
| `build/executables/node-drive-client-winxp.exe` | ~3.0 MB | Windows XP executable (32-bit, requires Java 8+ on target) |
| `build/executables/node-drive-client-win7.exe` | ~3.0 MB | Windows 7 executable (64-bit, requires Java 8+ on target) |
| `build/executables/node-drive-client-win10.exe` | ~3.0 MB | Windows 10+ executable (64-bit, requires Java 8+ on target) |
| `build/executables/node-drive-client-macos` | ~2 KB | macOS executable (shell script, requires Java 8+ or bundled JRE) |

**Notes:**
- All Windows executables are created using Launch4j and verified as valid PE32 executables.
- The macOS executable is a shell script wrapper that works on both Intel and Apple Silicon Macs.

## Windows Executables

The Docker build automatically creates Windows executables for all Windows versions using Launch4j!

**What you get:**
- ✅ `node-drive-client-winxp.exe` - Windows XP compatible (32-bit)
- ✅ `node-drive-client-win7.exe` - Windows 7+ (64-bit)
- ✅ `node-drive-client-win10.exe` - Windows 10/11 (64-bit)

**How to use on Windows:**
1. Copy the `.exe` file to your Windows machine
2. Ensure Java 8+ is installed on the target machine (or bundle a JRE - see BUILD_GUIDE.md)
3. Double-click to run, or use from command line:
   ```cmd
   node-drive-client-win10.exe /path/to/watch http://server:3000
   ```

**Bundling JRE (Optional):**
For truly standalone executables that don't require Java installation, see [BUILD_GUIDE.md](BUILD_GUIDE.md) for instructions on bundling a JRE with the executables.

## macOS Executable

The Docker build automatically creates a macOS executable using a shell script wrapper!

**What you get:**
- ✅ `node-drive-client-macos` - Universal shell script for macOS (Intel & Apple Silicon)

**How to use on macOS:**
1. Copy the executable and JAR to your Mac:
   ```bash
   cp build/executables/node-drive-client-macos ~/
   cp build/libs/java-client-1.0.0.jar ~/
   ```
2. Make it executable (if needed):
   ```bash
   chmod +x ~/node-drive-client-macos
   ```
3. Run it:
   ```bash
   ~/node-drive-client-macos /path/to/watch http://server:3000
   ```

**Features:**
- Auto-detects system Java (Java 8+)
- Supports bundled JRE (optional)
- Works on both Intel and Apple Silicon Macs
- Provides helpful error messages if Java is not found

**Bundling JRE (Optional):**
For a truly standalone macOS app, you can bundle a JRE with the executable. See [BUILD_GUIDE.md](BUILD_GUIDE.md) for detailed instructions.

## Troubleshooting

### "docker: command not found"

**Solution**: Docker is not installed or not in your PATH
```bash
# Install Docker (macOS)
brew install --cask docker
open -a Docker

# Verify installation
docker --version
```

### "Cannot connect to the Docker daemon"

**Solution**: Docker Desktop is not running
```bash
# Start Docker Desktop
open -a Docker

# Wait a few seconds, then verify
docker ps
```

### Build fails with "launch4j" error

**Solution**: Use the simple Dockerfile instead
```bash
./docker-build.sh
# or
docker build -f Dockerfile.simple -t node-drive-java-builder .
```

### "Permission denied" when running docker-build.sh

**Solution**: Make the script executable
```bash
chmod +x docker-build.sh
```

### JAR file not created in build/libs/

**Solution**: Check Docker volume mounting
```bash
# Ensure you're in the java-client directory
pwd  # Should show /path/to/node-drive/java-client

# Check if build directory exists
ls -la build/

# Try manual build
docker run --rm -v "$(pwd)/build:/app/build" node-drive-java-builder
```

## Advanced Usage

### Clean Build (Remove Cache)

```bash
# Remove old build artifacts
rm -rf build/

# Rebuild Docker image from scratch
docker build --no-cache -f Dockerfile.simple -t node-drive-java-builder .
```

### Build with Different Java Version

Modify the Dockerfile to use a different base image:

```dockerfile
# Use Java 11 instead
FROM openjdk:11-jdk

# Rest of the Dockerfile...
```

### View Build Logs

```bash
# Build with verbose output
docker build -f Dockerfile.simple -t node-drive-java-builder . --progress=plain
```

### Extract Files from Container Without Volume Mount

```bash
# Build the image
docker build -f Dockerfile.simple -t node-drive-java-builder .

# Create a container (don't run it)
docker create --name temp-container node-drive-java-builder

# Copy files out
docker cp temp-container:/app/build/libs/java-client-1.0.0.jar ./

# Remove the container
docker rm temp-container
```

## Comparison: Docker vs Local Build

| Aspect | Docker Build | Local Build |
|--------|-------------|-------------|
| Setup Time | Install Docker (~5 min) | Install Java 8 + Gradle (~10 min) |
| Build Time | ~20-30 seconds | ~15-20 seconds |
| Consistency | ✅ Same on all systems | ⚠️ Depends on local setup |
| Disk Space | ~500 MB (image) | ~200 MB (Java + Gradle) |
| Isolation | ✅ Fully isolated | ❌ Uses local environment |
| Ease of Use | ✅ One command | ⚠️ Requires setup |

## CI/CD Integration

### GitHub Actions

```yaml
name: Build Java Client

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build with Docker
        run: |
          cd java-client
          docker build -f Dockerfile.simple -t node-drive-java-builder .
          docker run --rm -v "$(pwd)/build:/app/build" node-drive-java-builder

      - name: Upload JAR
        uses: actions/upload-artifact@v3
        with:
          name: java-client-jar
          path: java-client/build/libs/*.jar
```

### GitLab CI

```yaml
build-java-client:
  image: docker:latest
  services:
    - docker:dind
  script:
    - cd java-client
    - docker build -f Dockerfile.simple -t node-drive-java-builder .
    - docker run --rm -v "$(pwd)/build:/app/build" node-drive-java-builder
  artifacts:
    paths:
      - java-client/build/libs/*.jar
```

## Next Steps

After building the JAR file:

1. **Test it locally**: `java -jar build/libs/java-client-1.0.0.jar`
2. **Create Windows executables**: See [BUILD_GUIDE.md](BUILD_GUIDE.md#creating-windows-executables)
3. **Distribute**: Package with JRE for standalone distribution
4. **Deploy**: Run on your server or target machines

## Additional Resources

- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Complete build guide including Windows executables
- [Docker Documentation](https://docs.docker.com/)
- [Launch4j Documentation](http://launch4j.sourceforge.net/docs.html)
- [Gradle Documentation](https://docs.gradle.org/)
