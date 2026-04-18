// Moved from src/routes/system.ts → src/transport/http/handlers/system.handler.ts
import type { Request, Response } from 'express';
import type { EnvConfig } from '../../../config/env.js';
import type { HealthResponse, ConfigPublicResponse } from '../../../models/index.js';
import { getMetrics, register } from '../../../observability/metrics.js';

/** GET /health — liveness probe */
export function healthHandler(_req: Request, res: Response): void {
  const body: HealthResponse = {
    status:    'ok',
    service:   'auth-hub',
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(body);
}

/** GET /metrics — Prometheus scrape */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', register.contentType);
    res.status(200).send(metrics);
  } catch (err) {
    res.status(500).send(String(err));
  }
}

/** GET /config — public config (secrets masked) */
export function configHandler(config: EnvConfig) {
  return (_req: Request, res: Response): void => {
    const body: ConfigPublicResponse = {
      serviceName:  config.serviceName,
      environment:  config.environment,
      port:         config.port,
      grpcPort:     config.grpcPort,
      keycloak: config.keycloak
        ? {
            baseUrl:                 config.keycloak.baseUrl,
            realm:                   config.keycloak.realm,
            clientId:                config.keycloak.clientId,
            clientSecretConfigured:  Boolean(config.keycloak.clientSecret),
            redirectBaseUrl:         config.keycloak.redirectBaseUrl,
          }
        : undefined,
    };
    res.status(200).json(body);
  };
}
