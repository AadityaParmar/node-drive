import * as fs from 'fs';
import * as path from 'path';
export var LogType;
(function (LogType) {
    LogType["DEBUG"] = "D";
    LogType["ERROR"] = "E";
    LogType["INFO"] = "I";
})(LogType || (LogType = {}));
export class AppLog {
    static instance;
    logDir;
    colors = {
        [LogType.DEBUG]: '\x1b[36m', // Cyan
        [LogType.ERROR]: '\x1b[31m', // Red
        [LogType.INFO]: '\x1b[32m', // Green
        reset: '\x1b[0m'
    };
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.ensureLogDirectory();
    }
    static getInstance() {
        if (!AppLog.instance) {
            AppLog.instance = new AppLog();
        }
        return AppLog.instance;
    }
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    getTimestamp() {
        return new Date().toISOString();
    }
    getLogFileName() {
        const now = new Date();
        const year = now.getFullYear();
        const month = ('0' + (now.getMonth() + 1)).slice(-2);
        const day = ('0' + now.getDate()).slice(-2);
        const hour = ('0' + now.getHours()).slice(-2);
        return `${year}-${month}-${day}-${hour}.log`;
    }
    formatLogMessage(logType, className, message) {
        const timestamp = this.getTimestamp();
        return `${timestamp} | ${logType} | [SERVER] ${className} | ${message}`;
    }
    writeToFile(logMessage) {
        const fileName = this.getLogFileName();
        const filePath = path.join(this.logDir, fileName);
        fs.appendFileSync(filePath, logMessage + '\n');
    }
    logToConsole(logType, logMessage) {
        const color = this.colors[logType];
        const resetColor = this.colors.reset;
        console.log(`${color}${logMessage}${resetColor}`);
    }
    static debug(className, message) {
        const instance = AppLog.getInstance();
        const logMessage = instance.formatLogMessage(LogType.DEBUG, className, message);
        instance.logToConsole(LogType.DEBUG, logMessage);
        instance.writeToFile(logMessage);
    }
    static error(className, message) {
        const instance = AppLog.getInstance();
        const logMessage = instance.formatLogMessage(LogType.ERROR, className, message);
        instance.logToConsole(LogType.ERROR, logMessage);
        instance.writeToFile(logMessage);
    }
    static info(className, message) {
        const instance = AppLog.getInstance();
        const logMessage = instance.formatLogMessage(LogType.INFO, className, message);
        instance.logToConsole(LogType.INFO, logMessage);
        instance.writeToFile(logMessage);
    }
}
//# sourceMappingURL=appLog.js.map