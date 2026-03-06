import dotenv from "dotenv";
import { existsSync } from "fs";
import path from "path";

const ENVIRONMENTS = ["development", "staging", "production"] as const;
type Environment = (typeof ENVIRONMENTS)[number];

/** Validated application configuration from environment variables. */
export type EnvConfig = {
  port: number;
  serviceName: string;
  environment: Environment;
  dbHost: string;
  dbUser: string;
  dbPass: string;
  /** Shorthand for environment === "development" */
  isDevelopment: boolean;
  /** Shorthand for environment === "staging" */
  isStaging: boolean;
  /** Shorthand for environment === "production" */
  isProduction: boolean;
};

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const baseEnv = path.resolve(cwd, ".env");
  const localEnv = path.resolve(cwd, ".env.local");

  if (existsSync(baseEnv)) {
    dotenv.config({ path: baseEnv });
  }
  if (existsSync(localEnv)) {
    dotenv.config({ path: localEnv }); // Local overrides (gitignored)
  }

  const nodeEnv = process.env.NODE_ENV || "development";
  const envFile = path.resolve(cwd, `.env.${nodeEnv}`);
  if (existsSync(envFile) && envFile !== baseEnv && envFile !== localEnv) {
    dotenv.config({ path: envFile });
  }
}

function parsePort(value: string | undefined): number | null {
  const num = Number(value);
  if (Number.isNaN(num) || num < 1 || num > 65535) {
    return null;
  }
  return Math.floor(num);
}

function parseEnvironment(value: string | undefined): Environment | null {
  if (value && ENVIRONMENTS.includes(value as Environment)) {
    return value as Environment;
  }
  return null;
}

/**
 * Loads and validates configuration from environment variables.
 * Load order: .env → .env.local → .env.${NODE_ENV}
 * @returns Validated config object
 * @throws {Error} When required variables are missing or invalid
 */
export function loadConfig(): EnvConfig {
  loadEnvFiles();

  const nodeEnv = process.env.NODE_ENV || "development";
  const port = parsePort(process.env.PORT) ?? (nodeEnv === "development" ? 3000 : null);
  const serviceName = process.env.SERVICE_NAME?.trim();
  const environment = parseEnvironment(nodeEnv) ?? (nodeEnv === "development" ? "development" : null);
  const dbHost = process.env.DB_HOST?.trim();
  const dbUser = process.env.DB_USER?.trim();
  const dbPass = process.env.DB_PASS;

  const missing: string[] = [];
  if (port === null) missing.push("PORT (must be 1-65535)");
  if (!serviceName) missing.push("SERVICE_NAME");
  if (!environment) missing.push(`NODE_ENV (must be one of: ${ENVIRONMENTS.join(", ")})`);
  if (!dbHost) missing.push("DB_HOST");
  if (!dbUser) missing.push("DB_USER");
  if (!dbPass) missing.push("DB_PASS");

  if (missing.length > 0) {
    throw new Error(
      `Missing or invalid required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    port: port as number,
    serviceName: serviceName as string,
    environment: environment as Environment,
    dbHost: dbHost as string,
    dbUser: dbUser as string,
    dbPass: dbPass as string,
    isDevelopment: environment === "development",
    isStaging: environment === "staging",
    isProduction: environment === "production",
  };
}