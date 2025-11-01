#!/bin/bash
set -e

echo "========================================================"
echo "  Node Drive Java Client - Docker Build"
echo "========================================================"

# Determine which Dockerfile to use
DOCKERFILE="Dockerfile"
BUILD_TYPE="JAR + All Windows Executables"

if [ "$1" = "--jar-only" ]; then
    DOCKERFILE="Dockerfile.simple"
    BUILD_TYPE="JAR Only"
    echo "Building: JAR file only (fast build)"
else
    echo "Building: JAR + Windows XP/7/10+ + macOS Executables"
fi

echo ""

# Build the Docker image
echo "Step 1: Building Docker image..."
echo "--------"
if [ "$1" != "--jar-only" ]; then
    # Use x86_64 platform for launch4j compatibility
    docker build --platform linux/amd64 -f ${DOCKERFILE} -t node-drive-java-builder .
else
    docker build -f ${DOCKERFILE} -t node-drive-java-builder .
fi

# Create output directory on host
mkdir -p build/libs
mkdir -p build/executables

echo ""
echo "Step 2: Running build and extracting artifacts..."
echo "--------"

# Run container and copy build artifacts
if [ "$1" != "--jar-only" ]; then
    docker run --rm --platform linux/amd64 \
      -v "$(pwd)/build:/app/build" \
      node-drive-java-builder
else
    docker run --rm \
      -v "$(pwd)/build:/app/build" \
      node-drive-java-builder
fi

echo ""
echo "========================================================"
echo "  ✓ Build Complete!"
echo "========================================================"
echo ""
echo "Build Artifacts:"
echo ""
echo "  📦 JAR File:"
echo "     build/libs/java-client-1.0.0.jar"
echo ""

if [ "$1" != "--jar-only" ]; then
    echo "  💻 Windows Executables:"
    echo "     build/executables/node-drive-client-winxp.exe  (Windows XP - 32-bit)"
    echo "     build/executables/node-drive-client-win7.exe   (Windows 7 - 64-bit)"
    echo "     build/executables/node-drive-client-win10.exe  (Windows 10+ - 64-bit)"
    echo ""
    echo "  🍎 macOS Executable:"
    echo "     build/executables/node-drive-client-macos      (macOS - Intel & Apple Silicon)"
    echo ""
    echo "  Note: Executables require Java 8+ on target system or bundle JRE"
    echo ""
fi

echo "========================================================"
echo ""
echo "Testing:"
echo "  java -jar build/libs/java-client-1.0.0.jar"
echo ""
echo "To build JAR only (faster):"
echo "  ./docker-build.sh --jar-only"
echo ""
echo "========================================================"
echo ""
