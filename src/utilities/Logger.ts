import * as fs from 'fs';
import * as path from 'path';
import { config, LogLevel } from './ConfigReader';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const LEVEL_COLOUR: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const RESET = '\x1b[0m';

/**
 * Lightweight, dependency free logger.
 *
 * Every message is written to the console (respecting LOG_LEVEL) and appended
 * to a per run log file under the artifacts directory, so parallel Cucumber
 * workers all contribute to a single execution log.
 */
export class Logger {
  private static logFile: string | undefined;

  private readonly scope: string;

  /**
   * @param scope Name shown in every line, usually the class or feature name.
   */
  public constructor(scope: string) {
    this.scope = scope;
  }

  /**
   * Factory helper so call sites read as Logger.for(WalmartPage.name).
   */
  public static for(scope: string): Logger {
    return new Logger(scope);
  }

  public debug(message: string, ...details: unknown[]): void {
    this.write('debug', message, details);
  }

  public info(message: string, ...details: unknown[]): void {
    this.write('info', message, details);
  }

  public warn(message: string, ...details: unknown[]): void {
    this.write('warn', message, details);
  }

  public error(message: string, ...details: unknown[]): void {
    this.write('error', message, details);
  }

  /**
   * Logs the start of a logical test step. Kept separate from info() so step
   * boundaries stay easy to spot when scanning a long execution log.
   */
  public step(message: string): void {
    this.write('info', 'STEP -> ' + message, []);
  }

  private write(level: LogLevel, message: string, details: unknown[]): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[config.logLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const label = level.toUpperCase().padEnd(5, ' ');
    const extras = details.length > 0 ? ' ' + details.map(Logger.stringify).join(' ') : '';
    const plainLine =
      '[' + timestamp + '] [' + label + '] [' + this.scope + '] ' + message + extras;
    const colouredLine =
      LEVEL_COLOUR[level] +
      '[' +
      timestamp +
      '] [' +
      label +
      ']' +
      RESET +
      ' [' +
      this.scope +
      '] ' +
      message +
      extras;

    if (level === 'error') {
      console.error(colouredLine);
    } else if (level === 'warn') {
      console.warn(colouredLine);
    } else {
      process.stdout.write(colouredLine + '\n');
    }

    Logger.appendToFile(plainLine);
  }

  private static stringify(value: unknown): string {
    if (value instanceof Error) {
      return value.stack ?? value.message;
    }
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private static appendToFile(line: string): void {
    try {
      if (!Logger.logFile) {
        const logDir = path.resolve(process.cwd(), config.artifactsDir, 'logs');
        fs.mkdirSync(logDir, { recursive: true });
        Logger.logFile = path.join(logDir, 'execution.log');
      }
      fs.appendFileSync(Logger.logFile, line + '\n', { encoding: 'utf-8' });
    } catch {
      // Logging must never break a test run, so file errors are swallowed.
    }
  }
}

/**
 * Default framework wide logger.
 */
export const logger: Logger = Logger.for('Framework');
