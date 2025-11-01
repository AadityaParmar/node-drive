# PowerShell script for Windows - Docker Build Script for Node Drive Java Client
#
# This script automatically:
# 1. Reads configuration from gradle.properties (watchPath, serverUrl)
# 2. Updates Launch4j XML files with the latest values
# 3. Builds JAR and executables using Docker
#
# Usage:
#   .\docker-build.ps1              # Build JAR + all executables
#   .\docker-build.ps1 --jar-only   # Build JAR only (faster)
#
# The script ensures that all Windows executables (.exe) are built with
# the correct configuration from gradle.properties, so you don't need to
# manually update the XML files.

# Stop on errors
$ErrorActionPreference = "Stop"

Write-Host "========================================================"
Write-Host "  Node Drive Java Client - Docker Build"
Write-Host "========================================================"

# Update static XML files with values from gradle.properties
Write-Host "Step 0: Updating Launch4j XML configurations from gradle.properties..."
Write-Host "--------"

# Check if gradle.properties exists
if (-not (Test-Path "gradle.properties")) {
    Write-Host "ERROR: gradle.properties not found!" -ForegroundColor Red
    exit 1
}

# Read values from gradle.properties
$gradleProps = Get-Content "gradle.properties"
$watchPath = ($gradleProps | Where-Object { $_ -match "^watchPath=" }) -replace "^watchPath=", ""
$serverUrl = ($gradleProps | Where-Object { $_ -match "^serverUrl=" }) -replace "^serverUrl=", ""
$headlessMode = ($gradleProps | Where-Object { $_ -match "^headlessMode=" }) -replace "^headlessMode=", ""

# Default to false if not set
if ([string]::IsNullOrEmpty($headlessMode)) {
    $headlessMode = "false"
}

# Validate that values were read
if ([string]::IsNullOrEmpty($watchPath)) {
    Write-Host "ERROR: watchPath not found in gradle.properties!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($serverUrl)) {
    Write-Host "ERROR: serverUrl not found in gradle.properties!" -ForegroundColor Red
    exit 1
}

Write-Host "  watchPath: $watchPath"
Write-Host "  serverUrl: $serverUrl"
Write-Host "  headlessMode: $headlessMode"

# Determine headerType based on headlessMode
if ($headlessMode -eq "true") {
    $headerType = "gui"
    Write-Host "  headerType: gui (no terminal window)" -ForegroundColor Cyan
} else {
    $headerType = "console"
    Write-Host "  headerType: console (with terminal window)" -ForegroundColor Cyan
}

# Function to update XML file
function Update-Launch4jXml {
    param(
        [string]$xmlFile,
        [string]$watchPath,
        [string]$serverUrl,
        [string]$headerType
    )

    $content = Get-Content $xmlFile -Raw

    # Update headerType
    $content = $content -replace "<headerType>.*?</headerType>", "<headerType>$headerType</headerType>"

    # Check if opt tags already exist
    if ($content -match "<opt>-Dnode.drive.watchPath=") {
        # Update existing opt tags
        $content = $content -replace "<opt>-Dnode\.drive\.watchPath=.*?</opt>", "<opt>-Dnode.drive.watchPath=$watchPath</opt>"
        $content = $content -replace "<opt>-Dnode\.drive\.serverUrl=.*?</opt>", "<opt>-Dnode.drive.serverUrl=$serverUrl</opt>"
    } else {
        # Add opt tags before </jre> tag
        $optTags = "    <opt>-Dnode.drive.watchPath=$watchPath</opt>`n    <opt>-Dnode.drive.serverUrl=$serverUrl</opt>`n  </jre>"
        $content = $content -replace "</jre>", $optTags
    }

    Set-Content -Path $xmlFile -Value $content -NoNewline
}

# Update all three XML files
Update-Launch4jXml -xmlFile "launch4j-win10.xml" -watchPath $watchPath -serverUrl $serverUrl -headerType $headerType
Update-Launch4jXml -xmlFile "launch4j-win7.xml" -watchPath $watchPath -serverUrl $serverUrl -headerType $headerType
Update-Launch4jXml -xmlFile "launch4j-winxp.xml" -watchPath $watchPath -serverUrl $serverUrl -headerType $headerType

Write-Host "  [OK] Updated launch4j-win10.xml" -ForegroundColor Green
Write-Host "  [OK] Updated launch4j-win7.xml" -ForegroundColor Green
Write-Host "  [OK] Updated launch4j-winxp.xml" -ForegroundColor Green
Write-Host ""

# Determine which Dockerfile to use
$DOCKERFILE = "Dockerfile"
$BUILD_TYPE = "JAR + All Windows Executables"

if ($args[0] -eq "--jar-only") {
    $DOCKERFILE = "Dockerfile.simple"
    $BUILD_TYPE = "JAR Only"
    Write-Host "Building: JAR file only (fast build)"
} else {
    Write-Host "Building: JAR + Windows XP/7/10+ + macOS Executables"
}

Write-Host ""

# Generate build timestamp to bust Docker cache and ensure latest code is used
$BUILD_TIMESTAMP = [int][double]::Parse((Get-Date -UFormat %s))
Write-Host "Build timestamp: $BUILD_TIMESTAMP (ensures fresh build with latest code)"

# Build the Docker image
Write-Host "Step 1: Building Docker image..."
Write-Host "--------"
if ($args[0] -ne "--jar-only") {
    # Use x86_64 platform for launch4j compatibility
    # Use --no-cache to ensure latest project files are always used
    docker build --platform linux/amd64 --no-cache --build-arg BUILD_TIMESTAMP=$BUILD_TIMESTAMP -f $DOCKERFILE -t node-drive-java-builder .
} else {
    # Use --no-cache to ensure latest project files are always used
    docker build --no-cache --build-arg BUILD_TIMESTAMP=$BUILD_TIMESTAMP -f $DOCKERFILE -t node-drive-java-builder .
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Create output directory on host
New-Item -ItemType Directory -Force -Path "build/libs" | Out-Null
New-Item -ItemType Directory -Force -Path "build/executables" | Out-Null

Write-Host ""
Write-Host "Step 2: Running build and extracting artifacts..."
Write-Host "--------"

# Get the current directory path (convert to Unix-style for Docker)
$currentPath = (Get-Location).Path
$unixPath = $currentPath -replace '\\', '/' -replace '^([A-Za-z]):', { "/$($_.Groups[1].Value.ToLower())" }

# Run container and copy build artifacts
if ($args[0] -ne "--jar-only") {
    docker run --rm --platform linux/amd64 `
      -v "${currentPath}/build:/app/build" `
      node-drive-java-builder
} else {
    docker run --rm `
      -v "${currentPath}/build:/app/build" `
      node-drive-java-builder
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker run failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "========================================================"
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "Build Artifacts:"
Write-Host ""
Write-Host "  JAR File:"
Write-Host "     build/libs/java-client-1.0.0.jar"
Write-Host ""

if ($args[0] -ne "--jar-only") {
    Write-Host "  Windows Executables:"
    Write-Host "     build/executables/node-drive-client-winxp.exe  (Windows XP - 32-bit)"
    Write-Host "     build/executables/node-drive-client-win7.exe   (Windows 7 - 64-bit)"
    Write-Host "     build/executables/node-drive-client-win10.exe  (Windows 10+ - 64-bit)"
    Write-Host ""
    Write-Host "  macOS Executable:"
    Write-Host "     build/executables/node-drive-client-macos      (macOS - Intel & Apple Silicon)"
    Write-Host ""
    Write-Host "  Note: Executables require Java 8+ on target system or bundle JRE"
    Write-Host ""
}

Write-Host "========================================================"
Write-Host ""
Write-Host "Testing:"
Write-Host "  java -jar build/libs/java-client-1.0.0.jar"
Write-Host ""
Write-Host "To build JAR only (faster):"
Write-Host "  .\docker-build.ps1 --jar-only"
Write-Host ""
Write-Host "========================================================"
Write-Host ""
