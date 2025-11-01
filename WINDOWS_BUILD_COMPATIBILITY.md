# Windows Build Compatibility Guide

## Overview
This document explains how to build standalone executables for different Windows versions.

## Compatibility Matrix

| Windows Version | Node.js Version | TypeScript Target | pkg Node Version | Status |
|----------------|-----------------|-------------------|------------------|---------|
| Windows XP (32-bit) | 6.17.1 | ES5 | ❌ NOT SUPPORTED | pkg doesn't support Node 6 |
| Windows 7 (64-bit) | 12.22.12 | ES2018 | node12-win-x64 | ✅ TESTED & WORKING |
| Windows 10+ (64-bit) | 18.20.2 | ES2022 | node18-win-x64 | ✅ TESTED & WORKING |

## Important Notes

### Windows XP Limitations
- **WINDOWS XP IS NOT SUPPORTED** by modern build tools
- pkg (the packaging tool) only supports Node.js 12+
- Node.js 6.x (last version for XP) is too old for pkg
- Alternative options:
  - Use older tools like `nexe` (may have Node 6 support)
  - Manually bundle Node.js 6 with your app
  - Consider dropping XP support (released 24 years ago, major security risks)

### Windows 7 Limitations
- **Node.js 12.x** is a good compromise
- Supports most modern JavaScript features
- Better npm package compatibility
- End of Life but still widely used

### Modern Windows (10+)
- Full feature support
- Best performance
- Regular security updates
- Recommended target

## Build Process

### Prerequisites
```bash
npm install -g pkg
```

### Building
```bash
cd client

# Build TypeScript for specific targets
npm run build:win7       # Compile for Windows 7
npm run build:win10      # Compile for Windows 10+

# Package into executables
npm run package:win7     # Create Windows 7 .exe (Node 12)
npm run package:win10    # Create Windows 10+ .exe (Node 18)

# Note: Windows XP build not supported by pkg
```

### Output
Executables will be in the `build/` directory:
- `node-drive-client-win7.exe` - Windows 7+ (64-bit, ~29MB)
- `node-drive-client-win10.exe` - Windows 10+ (64-bit, ~37MB)

## Known Issues

### Windows XP
- axios might have compatibility issues
- May need to use older HTTP libraries (request, node-fetch@2.x)
- File watching might be limited
- Crypto APIs limited

### Windows 7
- Generally stable
- Some newer Node.js APIs may not work
- TLS 1.3 not supported

## Testing Recommendations

1. Test on actual hardware or VMs
2. Check antivirus false positives
3. Verify file permissions
4. Test network connectivity
5. Validate file system operations

## Alternative Approaches

If pkg doesn't work:
1. **nexe** - Alternative packaging tool
2. **node-compiler** - Native compilation
3. **electron-builder** - If GUI is acceptable
4. **Docker + Wine** - For testing without real Windows
