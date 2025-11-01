# PowerShell script for Windows
# Stop on errors
$ErrorActionPreference = "Stop"

Write-Host "========================================================"
Write-Host "  Node Drive Java Client - Docker Build"
Write-Host "========================================================"

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

# Build the Docker image
Write-Host "Step 1: Building Docker image..."
Write-Host "--------"
if ($args[0] -ne "--jar-only") {
    # Use x86_64 platform for launch4j compatibility
    docker build --platform linux/amd64 -f $DOCKERFILE -t node-drive-java-builder .
} else {
    docker build -f $DOCKERFILE -t node-drive-java-builder .
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
Write-Host "  ✓ Build Complete!" -ForegroundColor Green
Write-Host "========================================================"
Write-Host ""
Write-Host "Build Artifacts:"
Write-Host ""
Write-Host "  📦 JAR File:"
Write-Host "     build/libs/java-client-1.0.0.jar"
Write-Host ""

if ($args[0] -ne "--jar-only") {
    Write-Host "  💻 Windows Executables:"
    Write-Host "     build/executables/node-drive-client-winxp.exe  (Windows XP - 32-bit)"
    Write-Host "     build/executables/node-drive-client-win7.exe   (Windows 7 - 64-bit)"
    Write-Host "     build/executables/node-drive-client-win10.exe  (Windows 10+ - 64-bit)"
    Write-Host ""
    Write-Host "  🍎 macOS Executable:"
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
