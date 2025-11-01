#!/bin/bash
# Script to download JRE distributions for bundling
# This creates standalone executables that don't require Java installation

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JRE_DIR="$SCRIPT_DIR/build/jre"

echo "========================================"
echo "JRE Download Script for Node Drive Client"
echo "========================================"
echo ""

# JRE versions and URLs (using Adoptium Temurin 8)
# Note: These are example URLs - update with actual release URLs
MACOS_JRE_URL="https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_mac_hotspot_8u392b08.tar.gz"
WIN64_JRE_URL="https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_windows_hotspot_8u392b08.zip"
WIN32_JRE_URL="https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x86-32_windows_hotspot_8u392b08.zip"

# Function to download and extract JRE
download_jre() {
    local platform=$1
    local url=$2
    local target_dir=$3
    local filename=$(basename "$url")

    echo "----------------------------------------"
    echo "Downloading JRE for $platform..."
    echo "URL: $url"
    echo "Target: $target_dir"

    # Create target directory
    mkdir -p "$target_dir"

    # Download if not already present
    if [ -f "$JRE_DIR/$filename" ]; then
        echo "✓ Already downloaded: $filename"
    else
        echo "Downloading $filename..."
        if command -v curl &> /dev/null; then
            curl -L -o "$JRE_DIR/$filename" "$url"
        elif command -v wget &> /dev/null; then
            wget -O "$JRE_DIR/$filename" "$url"
        else
            echo "Error: Neither curl nor wget found. Please install one of them."
            exit 1
        fi
        echo "✓ Downloaded: $filename"
    fi

    # Extract
    echo "Extracting to $target_dir..."
    if [[ $filename == *.tar.gz ]]; then
        tar -xzf "$JRE_DIR/$filename" -C "$target_dir" --strip-components=1
    elif [[ $filename == *.zip ]]; then
        if command -v unzip &> /dev/null; then
            unzip -q "$JRE_DIR/$filename" -d "$target_dir"
            # Move files if they're in a subdirectory
            if [ -d "$target_dir"/jdk* ]; then
                mv "$target_dir"/jdk*/* "$target_dir/" 2>/dev/null || true
                rm -rf "$target_dir"/jdk*
            fi
        else
            echo "Error: unzip command not found. Please install unzip."
            exit 1
        fi
    fi

    echo "✓ Extracted successfully"
}

# Function to show menu
show_menu() {
    echo ""
    echo "Select which JRE to download:"
    echo "  1) macOS (64-bit) - ~40MB"
    echo "  2) Windows 10/7 (64-bit) - ~45MB"
    echo "  3) Windows XP (32-bit) - ~40MB"
    echo "  4) All platforms - ~125MB total"
    echo "  5) Show current status"
    echo "  0) Exit"
    echo ""
    read -p "Enter your choice [0-5]: " choice
}

# Function to check JRE status
check_status() {
    echo ""
    echo "Current JRE Status:"
    echo "----------------------------------------"

    if [ -d "$JRE_DIR/macos/jre" ] && [ -f "$JRE_DIR/macos/jre/Contents/Home/bin/java" ]; then
        echo "✓ macOS JRE: Installed"
    else
        echo "✗ macOS JRE: Not found"
    fi

    if [ -d "$JRE_DIR/windows-x64/jre" ] && [ -f "$JRE_DIR/windows-x64/jre/bin/java.exe" ]; then
        echo "✓ Windows 64-bit JRE: Installed"
    else
        echo "✗ Windows 64-bit JRE: Not found"
    fi

    if [ -d "$JRE_DIR/windows-x86/jre" ] && [ -f "$JRE_DIR/windows-x86/jre/bin/java.exe" ]; then
        echo "✓ Windows 32-bit JRE: Installed"
    else
        echo "✗ Windows 32-bit JRE: Not found"
    fi
    echo "----------------------------------------"
}

# Create JRE directory
mkdir -p "$JRE_DIR"

# Main loop
while true; do
    show_menu

    case $choice in
        1)
            download_jre "macOS" "$MACOS_JRE_URL" "$JRE_DIR/macos/jre"
            ;;
        2)
            download_jre "Windows 64-bit" "$WIN64_JRE_URL" "$JRE_DIR/windows-x64/jre"
            ;;
        3)
            download_jre "Windows 32-bit" "$WIN32_JRE_URL" "$JRE_DIR/windows-x86/jre"
            ;;
        4)
            download_jre "macOS" "$MACOS_JRE_URL" "$JRE_DIR/macos/jre"
            download_jre "Windows 64-bit" "$WIN64_JRE_URL" "$JRE_DIR/windows-x64/jre"
            download_jre "Windows 32-bit" "$WIN32_JRE_URL" "$JRE_DIR/windows-x86/jre"
            echo ""
            echo "✓ All JREs downloaded successfully!"
            ;;
        5)
            check_status
            ;;
        0)
            echo "Exiting..."
            break
            ;;
        *)
            echo "Invalid choice. Please try again."
            ;;
    esac
done

echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
check_status
echo ""
echo "To create standalone packages:"
echo "  ./gradlew packageStandalone"
echo ""
echo "This will create distribution packages with bundled JRE"
echo "that users can run without installing Java!"
echo "========================================"
