import { Registry, collectDefaultMetrics, Counter, Histogram } from "prom-client";
import type { Request, Response } from "express";

export const register = new Registry();

collectDefaultMetrics({ register, prefix: "authhub_" });

export const httpRequestsTotal = new Counter({
  name: "authhub_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "authhub_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/**
 * Express middleware that records request count and duration for Prometheus.
 * Call after express.json() so path is available; normalizes path to route pattern if desired.
 */
export function metricsMiddleware(req: Request, res: Response, next: () => void): void {
  const start = performance.now();
  const method = req.method;
  const path = req.route?.path ?? req.path;

  res.on("finish", () => {
    const status = res.statusCode.toString();
    const duration = (performance.now() - start) / 1000;
    httpRequestsTotal.inc({ method, path, status });
    httpRequestDurationSeconds.observe({ method, path, status }, duration);
  });

  next();
}

/**
 * Returns Prometheus text format for GET /metrics.
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}
