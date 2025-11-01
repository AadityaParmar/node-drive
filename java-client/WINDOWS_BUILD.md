# Windows Build Guide

## Quick Start (Recommended)

### Using PowerShell Script (Easiest)

1. **Edit Configuration**
   
   Open `gradle.properties` and set your paths:
   ```properties
   watchPath=C:/Users/YourName/Documents/node-drive/target2
   serverUrl=http://localhost:3000
   ```

2. **Run Build Script**
   ```powershell
   # Build everything (JAR + all Windows executables)
   .\docker-build.ps1

   # Or build JAR only (faster)
   .\docker-build.ps1 --jar-only
   ```

**That's it!** The script automatically:
- Reads your configuration from `gradle.properties`
- Updates all Launch4j XML files with the correct paths
- Builds JAR and Windows executables using Docker
- No manual XML editing required!

## What Happens During Build

### Step 0: Configuration Update
The script reads `watchPath` and `serverUrl` from `gradle.properties` and automatically updates:
- `launch4j-win10.xml`
- `launch4j-win7.xml`
- `launch4j-winxp.xml`

### Step 1: Docker Build
Builds the Docker image with all necessary tools (Java 8, Gradle, Launch4j)

### Step 2: Artifact Creation
Creates all executables and outputs them to:
- `build/libs/java-client-1.0.0.jar`
- `build/executables/node-drive-client-winxp.exe`
- `build/executables/node-drive-client-win7.exe`
- `build/executables/node-drive-client-win10.exe`
- `build/executables/node-drive-client-macos`

## Troubleshooting

### Error: "gradle.properties not found"
Make sure you're running the script from the `java-client` directory:
```powershell
cd java-client
.\docker-build.ps1
```

### Error: "watchPath not found in gradle.properties"
Check that `gradle.properties` contains the line:
```properties
watchPath=C:/path/to/watch
```

### Docker Issues
Make sure Docker Desktop is installed and running:
- Download from: https://www.docker.com/products/docker-desktop
- Start Docker Desktop before running the build script

## Manual Build (Advanced)

If you need to build without Docker:

```powershell
# Build JAR
.\gradlew.bat build

# Build Windows executables (requires Launch4j)
.\gradlew.bat buildWin10Exe
.\gradlew.bat buildWin7Exe
.\gradlew.bat buildWinXpExe
```

## Configuration Notes

### Windows Path Format
In `gradle.properties`, use forward slashes even on Windows:
```properties
# Good
watchPath=C:/Users/YourName/Documents/node-drive/target2

# Also works
watchPath=C:\\Users\\YourName\\Documents\\node-drive\\target2
```

### Network Paths
You can use network paths too:
```properties
watchPath=//server/share/folder
```

## Output Files

After building, you'll have:

```
build/
├── libs/
│   └── java-client-1.0.0.jar         # Standalone JAR
└── executables/
    ├── node-drive-client-winxp.exe   # Windows XP (32-bit)
    ├── node-drive-client-win7.exe    # Windows 7+ (64-bit)
    ├── node-drive-client-win10.exe   # Windows 10+ (64-bit)
    └── node-drive-client-macos       # macOS (both Intel & M1/M2)
```

## Testing

Test the built executable:
```powershell
# Using the JAR directly
java -jar build/libs/java-client-1.0.0.jar

# Using Windows executable
.\build\executables\node-drive-client-win10.exe

# With custom arguments
.\build\executables\node-drive-client-win10.exe "C:\custom\path" http://custom-server:3000
```

## See Also

- `BUILD_GUIDE.md` - Complete build guide for all platforms
- `STANDALONE_BUILD_GUIDE.md` - Creating standalone packages with bundled JRE
- `docker-build.ps1` - PowerShell build script (this is what you're using)
- `docker-build.sh` - Bash build script (for Mac/Linux users)
