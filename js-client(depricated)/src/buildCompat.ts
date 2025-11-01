/**
 * Build compatibility helpers for ESM/CommonJS
 * This file helps bridge the gap between ES modules and CommonJS builds
 */

import * as path from 'path';

/**
 * Get current directory that works in both ESM and CommonJS
 * In CommonJS builds, __dirname will be available globally
 * In ESM builds, we fall back to process.cwd()
 */
export function getDirname(): string {
  // In CommonJS (when __dirname is available globally)
  // TypeScript will compile this check away in CommonJS mode
  try {
    // This will work in CommonJS after compilation
    return eval('__dirname');
  } catch {
    // Fallback for ESM or if eval fails
    return process.cwd();
  }
}

/**
 * Get a safe logs directory path
 */
export function getLogsDir(): string {
  // Use current directory for logs in packaged apps
  return path.join(process.cwd(), 'logs');
}
