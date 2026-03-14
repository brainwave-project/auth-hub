import type { Express } from "express";
import type { EnvConfig } from "../../config/env.js";
import { createRouter } from "../../routes/index.js";

/**
 * Mounts the HTTP API (health, auth, tokens) onto the Express app.
 * Used by app.ts to expose REST endpoints for clients and gateways.
 */
export function mountHttpApi(app: Express, config: EnvConfig): void {
  app.use("/api", createRouter(config));
}

export { createRouter } from "../../routes/index.js";
