#!/bin/bash
# Docker Build Script for Node Drive Java Client
#
# This script automatically:
# 1. Reads configuration from gradle.properties (watchPath, serverUrl)
# 2. Updates Launch4j XML files with the latest values
# 3. Builds JAR and executables using Docker
#
# Usage:
#   ./docker-build.sh              # Build JAR + all executables
#   ./docker-build.sh --jar-only   # Build JAR only (faster)
#
# The script ensures that all Windows executables (.exe) are built with
# the correct configuration from gradle.properties, so you don't need to
# manually update the XML files.

set -e

echo "========================================================"
echo "  Node Drive Java Client - Docker Build"
echo "========================================================"

# Update static XML files with values from gradle.properties
echo "Step 0: Updating Launch4j XML configurations from gradle.properties..."
echo "--------"

# Check if gradle.properties exists
if [ ! -f "gradle.properties" ]; then
    echo "ERROR: gradle.properties not found!"
    exit 1
fi

# Read values from gradle.properties
WATCH_PATH=$(grep "^watchPath=" gradle.properties | cut -d'=' -f2)
SERVER_URL=$(grep "^serverUrl=" gradle.properties | cut -d'=' -f2)
HEADLESS_MODE=$(grep "^headlessMode=" gradle.properties | cut -d'=' -f2)

# Default to false if not set
if [ -z "$HEADLESS_MODE" ]; then
    HEADLESS_MODE="false"
fi

# Validate that values were read
if [ -z "$WATCH_PATH" ]; then
    echo "ERROR: watchPath not found in gradle.properties!"
    exit 1
fi

if [ -z "$SERVER_URL" ]; then
    echo "ERROR: serverUrl not found in gradle.properties!"
    exit 1
fi

echo "  watchPath: $WATCH_PATH"
echo "  serverUrl: $SERVER_URL"
echo "  headlessMode: $HEADLESS_MODE"

# Determine headerType based on headlessMode
if [ "$HEADLESS_MODE" = "true" ]; then
    HEADER_TYPE="gui"
    echo "  headerType: gui (no terminal window)"
else
    HEADER_TYPE="console"
    echo "  headerType: console (with terminal window)"
fi

# Function to update XML file
update_xml() {
    local xml_file=$1
    local watch_path=$2
    local server_url=$3
    local header_type=$4

    # Update headerType
    sed -i.bak "s|<headerType>.*</headerType>|<headerType>${header_type}</headerType>|g" "$xml_file"

    # Check if opt tags already exist
    if grep -q "<opt>-Dnode.drive.watchPath=" "$xml_file"; then
        # Update existing opt tags
        sed -i.bak "s|<opt>-Dnode.drive.watchPath=.*</opt>|<opt>-Dnode.drive.watchPath=${watch_path}</opt>|g" "$xml_file"
        sed -i.bak "s|<opt>-Dnode.drive.serverUrl=.*</opt>|<opt>-Dnode.drive.serverUrl=${server_url}</opt>|g" "$xml_file"
    else
        # Add opt tags before </jre> tag
        sed -i.bak "s|</jre>|    <opt>-Dnode.drive.watchPath=${watch_path}</opt>\n    <opt>-Dnode.drive.serverUrl=${server_url}</opt>\n  </jre>|g" "$xml_file"
    fi

    # Remove backup file
    rm -f "${xml_file}.bak"
}

# Update all three XML files
update_xml "launch4j-win10.xml" "$WATCH_PATH" "$SERVER_URL" "$HEADER_TYPE"
update_xml "launch4j-win7.xml" "$WATCH_PATH" "$SERVER_URL" "$HEADER_TYPE"
update_xml "launch4j-winxp.xml" "$WATCH_PATH" "$SERVER_URL" "$HEADER_TYPE"

echo "  ✓ Updated launch4j-win10.xml"
echo "  ✓ Updated launch4j-win7.xml"
echo "  ✓ Updated launch4j-winxp.xml"
echo ""

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

# Generate build timestamp to bust Docker cache and ensure latest code is used
BUILD_TIMESTAMP=$(date +%s)
echo "Build timestamp: $BUILD_TIMESTAMP (ensures fresh build with latest code)"

# Build the Docker image
echo "Step 1: Building Docker image..."
echo "--------"
if [ "$1" != "--jar-only" ]; then
    # Use x86_64 platform for launch4j compatibility
    # Use --no-cache to ensure latest project files are always used
    docker build --platform linux/amd64 --no-cache --build-arg BUILD_TIMESTAMP=${BUILD_TIMESTAMP} -f ${DOCKERFILE} -t node-drive-java-builder .
else
    # Use --no-cache to ensure latest project files are always used
    docker build --no-cache --build-arg BUILD_TIMESTAMP=${BUILD_TIMESTAMP} -f ${DOCKERFILE} -t node-drive-java-builder .
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
