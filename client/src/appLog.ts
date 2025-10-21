import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export enum LogType {
  DEBUG = 'D',
  ERROR = 'E',
  INFO = 'I'
}

export class AppLog {
  private static instance: AppLog;
  private logDir: string;

  private colors = {
    [LogType.DEBUG]: '\x1b[36m', // Cyan
    [LogType.ERROR]: '\x1b[31m', // Red
    [LogType.INFO]: '\x1b[32m',  // Green
    reset: '\x1b[0m'
  };

  private constructor() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.logDir = path.join(__dirname, 'logs');
    this.ensureLogDirectory();
  }

  static getInstance(): AppLog {
    if (!AppLog.instance) {
      AppLog.instance = new AppLog();
    }
    return AppLog.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private getLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hour = ('0' + now.getHours()).slice(-2);
    
    return `${year}-${month}-${day}-${hour}.log`;
  }

  private formatLogMessage(logType: LogType, className: string, message: string): string {
    const timestamp = this.getTimestamp();
    return `${timestamp} | ${logType} | [CLIENT] ${className} | ${message}`;
  }

  private writeToFile(logMessage: string): void {
    const fileName = this.getLogFileName();
    const filePath = path.join(this.logDir, fileName);
    
    fs.appendFileSync(filePath, logMessage + '\n');
  }

  private logToConsole(logType: LogType, logMessage: string): void {
    const color = this.colors[logType];
    const resetColor = this.colors.reset;
    console.log(`${color}${logMessage}${resetColor}`);
  }

  static debug(className: string, message: string): void {
    const instance = AppLog.getInstance();
    const logMessage = instance.formatLogMessage(LogType.DEBUG, className, message);
    instance.logToConsole(LogType.DEBUG, logMessage);
    instance.writeToFile(logMessage);
  }

  static error(className: string, message: string): void {
    const instance = AppLog.getInstance();
    const logMessage = instance.formatLogMessage(LogType.ERROR, className, message);
    instance.logToConsole(LogType.ERROR, logMessage);
    instance.writeToFile(logMessage);
  }

  static info(className: string, message: string): void {
    const instance = AppLog.getInstance();
    const logMessage = instance.formatLogMessage(LogType.INFO, className, message);
    instance.logToConsole(LogType.INFO, logMessage);
    instance.writeToFile(logMessage);
  }
}