# Node Drive

A cross-platform file monitoring and synchronization system with extensive Windows support, including Windows XP.
https://notepad.pw/txfsitPfcyvdfwoiGMvU
## Overview

Node Drive is a client-server system that monitors directories for file changes and automatically synchronizes them to a central server. It consists of a Node.js/TypeScript server and a Java-based client with full backward compatibility for legacy Windows systems.

## Features

- **Real-time File Monitoring**: Automatically detects file changes (create, modify, delete)
- **SHA-256 Checksums**: Ensures file integrity during transfers
- **Resumable Uploads**: Supports interrupted upload recovery
- **Cross-Platform**: Works on Windows (XP through 11), macOS, and Linux
- **Backward Compatible**: Full Windows XP support via Java 8 client
- **RESTful API**: Clean HTTP API for file operations
- **Device Management**: Multi-device support with unique device IDs

## Architecture

```
┌─────────────────────┐
│   Java Client       │    Monitors directories
│  (File Watcher)     │    Detects changes
│                     │    Uploads to server
└──────────┬──────────┘
           │
           │ HTTP/REST API
           │
           ▼
┌─────────────────────┐
│   Node.js Server    │    Receives uploads
│  (Express + TS)     │    Stores files
│                     │    Manages metadata
└─────────────────────┘
```

## Platform Support

| Platform | Support | Executable Type | Notes |
|----------|---------|-----------------|-------|
| **Windows XP** | ✅ Full | `.exe` (32-bit) | Java 8 based |
| **Windows 7+** | ✅ Full | `.exe` (64-bit) | Java 8 based |
| **Windows 10/11** | ✅ Full | `.exe` (64-bit) | Java 8 based |
| **macOS** | ✅ Full | Shell wrapper | Java 8 based |
| **Linux** | ✅ Full | JAR / Script | Java 8 based |

## Quick Start

### Prerequisites

- **Server**: Node.js 18+ and npm
- **Client**: Java 8+ (or use standalone executables with bundled JRE)

### 1. Start the Server

```bash
cd server
npm install
npm run dev
```

The server will start on `http://localhost:3000` by default.

### 2. Run the Client

#### Option A: Using Pre-built Executables (Recommended)

**macOS:**
```bash
./build/executables/node-drive-client-macos /path/to/watch http://localhost:3000
```

**Windows:**
```cmd
node-drive-client-win10.exe C:\path\to\watch http://localhost:3000
```

#### Option B: Using JAR File

```bash
cd java-client
./gradlew build
java -jar build/libs/java-client-1.0.0.jar /path/to/watch http://localhost:3000
```

## Project Structure

```
node-drive/
├── server/                      # Node.js/TypeScript server
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── routes/             # API routes
│   │   └── services/           # Business logic
│   └── package.json
│
├── java-client/                 # Java 8 client (recommended)
│   ├── src/main/java/
│   │   └── com/nodedrive/client/
│   │       ├── Main.java              # Entry point
│   │       ├── DirectoryWatcher.java  # File system monitor
│   │       ├── ServerApiClient.java   # HTTP client
│   │       └── FileInfo.java          # File utilities
│   ├── build.gradle            # Gradle build config
│   └── README.md               # Client-specific docs
│
├── js-client(depricated)/       # Legacy Node.js client
│
└── docs/
    ├── SERVER_API.md           # API specification
    ├── JAVA_PROJECT_SUMMARY.md # Java client overview
    └── BUILD_SUMMARY.md        # Build instructions
```

## Building from Source

### Server

```bash
cd server
npm install
npm run build      # Compile TypeScript
npm start          # Run production server
```

### Java Client

```bash
cd java-client
./gradlew build    # Creates fat JAR with all dependencies
```

#### Build Platform-Specific Executables

**macOS Executable:**
```bash
./gradlew buildMacExe
```

**Windows Executables** (requires Launch4j):
```bash
./gradlew buildWindowsExes
```

**All Platforms:**
```bash
./gradlew exportAll
```

For detailed build instructions including standalone packages with bundled JRE, see:
- [Java Client Build Guide](java-client/BUILD_GUIDE.md)
- [Standalone Executables Guide](java-client/STANDALONE_BUILD_GUIDE.md)

## API Documentation

The server exposes a RESTful API for file operations. See [SERVER_API.md](SERVER_API.md) for complete API documentation.

### Key Endpoints

- `GET /api/ping` - Health check
- `POST /api/upload/check` - Check file status before upload
- `POST /api/upload` - Upload file (supports resumable uploads)
- `POST /api/delete` - Delete file from server

## Configuration

### Server Configuration

Edit `server/src/config.ts` or use environment variables:

```env
PORT=3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=1073741824  # 1GB
```

### Client Configuration

Pass arguments when running:

```bash
java -jar java-client-1.0.0.jar <watch-directory> <server-url>
```

Example:
```bash
java -jar java-client-1.0.0.jar /Users/me/Documents http://192.168.1.100:3000
```

## Development

### Server Development

```bash
cd server
npm run dev        # Start with hot reload
npm run watch      # Watch TypeScript compilation
npm test           # Run tests
```

### Client Development

```bash
cd java-client
./gradlew run      # Run application
./gradlew test     # Run tests
./gradlew check    # Code quality checks
```

## Windows XP Support

Node Drive provides **full Windows XP support** through the Java client. This is achieved using:

- **Java 8**: Last Java version supporting Windows XP
- **Launch4j**: Creates native .exe wrappers for JAR files
- **Bundled JRE**: Optional standalone executables with Java runtime included

For more details, see [JAVA_WINXP_GUIDE.md](JAVA_WINXP_GUIDE.md).

### Why Java for Windows XP?

| Aspect | Node.js | Java 8 | Winner |
|--------|---------|--------|--------|
| Windows XP Support | ❌ Node 6 (2016, EOL) | ✅ Java 8 (2014, support until 2030) | **Java** |
| Modern Features | ❌ ES5 only | ✅ Lambdas, Streams | **Java** |
| .exe Creation | ❌ pkg not supported | ✅ Launch4j works | **Java** |
| Long-term Support | ❌ EOL 2019 | ✅ LTS until 2030 | **Java** |

## Distribution

### Creating Release Packages

**Build standalone packages** (with bundled JRE, no Java installation required):

```bash
cd java-client

# Download JRE as per instructions
./gradlew downloadJreInfo

# Create all standalone packages
./gradlew packageStandalone
```

Output in `build/distributions/`:
- `node-drive-client-macos.tar.gz`
- `node-drive-client-win10.zip`
- `node-drive-client-win7.zip`
- `node-drive-client-winxp.zip`

### File Sizes

| Package Type | Size | Requirements |
|--------------|------|--------------|
| JAR only | ~3 MB | Java 8+ installed |
| .exe wrapper | ~1 MB | Java 8+ installed |
| Standalone (with JRE) | ~100-120 MB | None |

## Troubleshooting

### Client Can't Connect to Server

1. Check server is running: `curl http://localhost:3000/api/ping`
2. Verify firewall settings
3. Ensure correct server URL is provided

### Permission Errors

**macOS/Linux:**
```bash
chmod +x node-drive-client-macos
```

**Windows:** Run as Administrator if monitoring system directories

### Java Not Found

**Option 1:** Install Java 8+
- Download from [Adoptium](https://adoptium.net/)

**Option 2:** Use standalone executable with bundled JRE
- Download from releases page

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Documentation

- [Server API Specification](SERVER_API.md)
- [Java Project Summary](JAVA_PROJECT_SUMMARY.md)
- [Windows Build Compatibility](WINDOWS_BUILD_COMPATIBILITY.md)
- [Java Client Build Guide](java-client/BUILD_GUIDE.md)
- [Docker Setup](java-client/DOCKER_README.md)

## Technology Stack

### Server
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Language**: TypeScript 5
- **File Upload**: Multer
- **CORS**: cors middleware

### Client
- **Language**: Java 8
- **Build Tool**: Gradle 8.5
- **HTTP Client**: OkHttp 4.9.3
- **JSON**: Gson 2.10.1
- **Logging**: SLF4J
- **Packaging**: Launch4j

## License

ISC

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review the API specification in `SERVER_API.md`

---

**Status**: Production Ready - Full support for Windows XP through Windows 11, macOS, and Linux
