/** Response for GET /health (container orchestration). */
export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp?: string;
}

/** Response for liveness probe. */
export interface LivenessResponse {
  status: "alive";
}

/** Response for readiness probe. */
export interface ReadinessResponse {
  status: "ready";
}
