import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Supported browser engines.
 */
export type BrowserName = 'chromium' | 'firefox' | 'webkit';

/**
 * Artifact capture policy for screenshots / videos / traces.
 */
export type ArtifactMode = 'on' | 'off' | 'retain-on-failure';

/**
 * Supported log levels, ordered from most to least verbose.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Strongly typed view over the framework configuration.
 */
export interface FrameworkConfig {
  env: string;
  baseUrl: string;
  olxBaseUrl: string;
  browser: BrowserName;
  headless: boolean;
  slowMo: number;
  channel: string | undefined;
  viewport: { width: number; height: number };
  locale: string;
  timezoneId: string;
  ignoreHttpsErrors: boolean;
  defaultTimeout: number;
  navigationTimeout: number;
  expectTimeout: number;
  stepTimeout: number;
  parallelWorkers: number;
  retryCount: number;
  screenshot: ArtifactMode;
  video: ArtifactMode;
  trace: ArtifactMode;
  artifactsDir: string;
  reportsDir: string;
  logLevel: LogLevel;
}

const VALID_BROWSERS: readonly BrowserName[] = ['chromium', 'firefox', 'webkit'];
const VALID_ARTIFACT_MODES: readonly ArtifactMode[] = ['on', 'off', 'retain-on-failure'];
const VALID_LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * Reads and validates configuration from .env files and process environment
 * variables. Real environment variables always win over .env entries, which
 * makes CI overrides (for example BROWSER=firefox npm test) work without edits.
 *
 * Implemented as a lazily initialised singleton so every worker process parses
 * the environment exactly once.
 */
export class ConfigReader {
  private static instance: ConfigReader | undefined;

  private readonly values: FrameworkConfig;

  private constructor() {
    ConfigReader.loadEnvFiles();
    this.values = this.buildConfig();
  }

  /**
   * Returns the shared ConfigReader instance.
   */
  public static getInstance(): ConfigReader {
    if (!ConfigReader.instance) {
      ConfigReader.instance = new ConfigReader();
    }
    return ConfigReader.instance;
  }

  /**
   * Loads .env first, then an optional environment specific .env file
   * (for example .env.qa) which may override individual keys.
   */
  private static loadEnvFiles(): void {
    const rootDir = path.resolve(__dirname, '..', '..');
    const baseEnvFile = path.join(rootDir, '.env');

    if (fs.existsSync(baseEnvFile)) {
      dotenv.config({ path: baseEnvFile });
    } else {
      dotenv.config();
    }

    const envName = process.env.ENV;
    if (envName) {
      const scopedEnvFile = path.join(rootDir, '.env.' + envName);
      if (fs.existsSync(scopedEnvFile)) {
        dotenv.config({ path: scopedEnvFile, override: true });
      }
    }
  }

  private buildConfig(): FrameworkConfig {
    return {
      env: this.readString('ENV', 'qa'),
      baseUrl: this.stripTrailingSlash(this.readString('BASE_URL', 'https://www.walmart.com')),
      olxBaseUrl: this.stripTrailingSlash(
        this.readString('OLX_BASE_URL', 'https://www.olx.com.pk'),
      ),
      browser: this.readEnum<BrowserName>('BROWSER', VALID_BROWSERS, 'chromium'),
      headless: this.readBoolean('HEADLESS', true),
      slowMo: this.readNumber('SLOW_MO', 0),
      channel: this.readOptionalString('CHANNEL'),
      viewport: {
        width: this.readNumber('VIEWPORT_WIDTH', 1920),
        height: this.readNumber('VIEWPORT_HEIGHT', 1080),
      },
      locale: this.readString('LOCALE', 'en-US'),
      timezoneId: this.readString('TIMEZONE', 'America/Los_Angeles'),
      ignoreHttpsErrors: this.readBoolean('IGNORE_HTTPS_ERRORS', true),
      defaultTimeout: this.readNumber('DEFAULT_TIMEOUT', 30000),
      navigationTimeout: this.readNumber('NAVIGATION_TIMEOUT', 60000),
      expectTimeout: this.readNumber('EXPECT_TIMEOUT', 15000),
      stepTimeout: this.readNumber('STEP_TIMEOUT', 60000),
      parallelWorkers: this.readNumber('PARALLEL_WORKERS', 2),
      retryCount: this.readNumber('RETRY_COUNT', 0),
      screenshot: this.readEnum<ArtifactMode>(
        'SCREENSHOT',
        VALID_ARTIFACT_MODES,
        'retain-on-failure',
      ),
      video: this.readEnum<ArtifactMode>('VIDEO', VALID_ARTIFACT_MODES, 'retain-on-failure'),
      trace: this.readEnum<ArtifactMode>('TRACE', VALID_ARTIFACT_MODES, 'retain-on-failure'),
      artifactsDir: this.readString('ARTIFACTS_DIR', 'test-results'),
      reportsDir: this.readString('REPORTS_DIR', 'reports'),
      logLevel: this.readEnum<LogLevel>('LOG_LEVEL', VALID_LOG_LEVELS, 'info'),
    };
  }

  /**
   * Returns the whole configuration object.
   */
  public all(): FrameworkConfig {
    return this.values;
  }

  /**
   * Returns a single configuration value in a type safe way.
   */
  public get<K extends keyof FrameworkConfig>(key: K): FrameworkConfig[K] {
    return this.values[key];
  }

  /**
   * Builds an absolute URL from the configured base URL and a relative path.
   */
  public url(relativePath = '/'): string {
    if (/^https?:\/\//i.test(relativePath)) {
      return relativePath;
    }
    const suffix = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    return this.values.baseUrl + suffix;
  }

  /**
   * Resolves a path inside the artifacts directory, creating it when missing.
   */
  public artifactPath(...segments: string[]): string {
    const target = path.resolve(process.cwd(), this.values.artifactsDir, ...segments);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    return target;
  }

  /**
   * Resolves a path inside the reports directory, creating it when missing.
   */
  public reportPath(...segments: string[]): string {
    const target = path.resolve(process.cwd(), this.values.reportsDir, ...segments);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    return target;
  }

  private readOptionalString(key: string): string | undefined {
    const raw = process.env[key];
    if (raw === undefined) {
      return undefined;
    }
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private readString(key: string, fallback: string): string {
    return this.readOptionalString(key) ?? fallback;
  }

  private readNumber(key: string, fallback: number): number {
    const raw = this.readOptionalString(key);
    if (raw === undefined) {
      return fallback;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid numeric value for environment variable ' + key + ': ' + raw);
    }
    return parsed;
  }

  private readBoolean(key: string, fallback: boolean): boolean {
    const raw = this.readOptionalString(key);
    if (raw === undefined) {
      return fallback;
    }
    const normalised = raw.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalised)) {
      return false;
    }
    throw new Error('Invalid boolean value for environment variable ' + key + ': ' + raw);
  }

  private readEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const raw = this.readOptionalString(key);
    if (raw === undefined) {
      return fallback;
    }
    const normalised = raw.toLowerCase() as T;
    if (!allowed.includes(normalised)) {
      throw new Error(
        'Invalid value for environment variable ' +
          key +
          ': ' +
          raw +
          '. Allowed values: ' +
          allowed.join(', '),
      );
    }
    return normalised;
  }

  private stripTrailingSlash(value: string): string {
    return value.endsWith('/') ? value.slice(0, -1) : value;
  }
}

/**
 * Shared configuration reader instance used across the framework.
 */
export const configReader: ConfigReader = ConfigReader.getInstance();

/**
 * Shared, fully resolved configuration values.
 */
export const config: FrameworkConfig = configReader.all();
