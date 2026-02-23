import dotenv from "dotenv";
import path from "path";

const envFile = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envFile });

type EnvConfig = {
  port: number;
  serviceName: string;
  environment: "development" | "staging" | "production";
  dbHost: string;
  dbUser: string;
  dbPass: string;
};

export function loadConfig(): EnvConfig {
  const port = Number(process.env.PORT);
  const serviceName = process.env.SERVICE_NAME;
  const environment = process.env.NODE_ENV as EnvConfig["environment"];
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;

  const missing: string[] = [];
  if (!port) missing.push("PORT");
  if (!serviceName) missing.push("SERVICE_NAME");
  if (!environment) missing.push("NODE_ENV");
  if (!dbHost) missing.push("DB_HOST");
  if (!dbUser) missing.push("DB_USER");
  if (!dbPass) missing.push("DB_PASS");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    port,
    serviceName: serviceName!,
    environment,
    dbHost: dbHost!,
    dbUser: dbUser!,
    dbPass: dbPass!,
  };
}