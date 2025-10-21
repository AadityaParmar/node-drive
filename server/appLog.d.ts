export declare enum LogType {
    DEBUG = "D",
    ERROR = "E",
    INFO = "I"
}
export declare class AppLog {
    private static instance;
    private logDir;
    private colors;
    private constructor();
    static getInstance(): AppLog;
    private ensureLogDirectory;
    private getTimestamp;
    private getLogFileName;
    private formatLogMessage;
    private writeToFile;
    private logToConsole;
    static debug(className: string, message: string): void;
    static error(className: string, message: string): void;
    static info(className: string, message: string): void;
}
//# sourceMappingURL=appLog.d.ts.map