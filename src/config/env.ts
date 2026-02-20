type EnvConfig = {
  port: number;
  serviceName: string;
  environment: "dev" | "staging" | "prod";
};

export function loadConfig(): EnvConfig {
  const port = Number(process.env.PORT);
  const serviceName = process.env.SERVICE_NAME;
  const environment = process.env.NODE_ENV as EnvConfig["environment"];

  const missing: string[] = [];

  if (!port) missing.push("PORT");
  if (!serviceName) missing.push("SERVICE_NAME");
  if (!environment) missing.push("NODE_ENV");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    port,
    serviceName: serviceName as string,
    environment,
  };
}