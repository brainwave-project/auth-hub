import { Express } from "express";
import { livenessHandler } from "./liveness.js";
import { readinessHandler } from "./readiness.js";

export function registerHealthEndpoints(app: Express) {
  app.get("/health/live", livenessHandler);
  app.get("/health/ready", readinessHandler);
}