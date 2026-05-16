import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { correlationId, requestLogger, errorHandler } from '@brainwave-project/core';
import { setupSwagger } from './config/swagger.js';
import { loadConfig } from './config/env.js';
import { registerHealthEndpoints } from './health/index.js';
import { mountHttpApi } from './transport/http/index.js';
import { startGrpcServer } from './transport/grpc/index.js';
import { metricsMiddleware } from './observability/metrics.js';
import { logger } from './observability/logger.js';
import {
  healthHandler,
  metricsHandler,
  configHandler,
} from './transport/http/handlers/system.handler.js';
import {
  initAuthEventProducer,
  disconnectAuthEventProducer,
} from './events/emitter.js';

// Fallback for Swagger direct access (bypasses Kong) in any environment.
// Kong always sets X-User-Id via post-function for web traffic — this only
// fires when the header is absent (i.e. direct service access without Kong).
function injectUserId(req: Request, _res: Response, next: NextFunction) {
  if (req.headers['x-user-id']) return next();
  const auth = req.headers['authorization'];
  if (!auth) return next();
  const token = auth.replace(/^[Bb]earer\s+/, '');
  const parts = token.split('.');
  if (parts.length !== 3) return next();
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.sub) req.headers['x-user-id'] = payload.sub;
  } catch { /* ignore */ }
  next();
}

export async function startServer() {
  const config = loadConfig();

  // Kafka producer — fire-and-forget; failures never block auth responses
  const kafkaBrokers = (process.env['KAFKA_BROKERS'] ?? 'kafka:9092').split(',');
  await initAuthEventProducer(kafkaBrokers);

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received — shutting down gracefully');
    await disconnectAuthEventProducer();
    process.exit(0);
  });

  const app = express();

  app.use(express.json());
  app.use(metricsMiddleware);
  app.use(correlationId());
  app.use(requestLogger(logger));
  app.use(injectUserId);

  app.get('/health', healthHandler);
  app.get('/metrics', (req, res, next) => {
    metricsHandler(req, res).catch(next);
  });
  app.get('/config', configHandler(config));

  registerHealthEndpoints(app);
  mountHttpApi(app, config);
  setupSwagger(app);
  app.use(errorHandler(logger));

  app.listen(config.port, () => {
    logger.info({ port: config.port, service: config.serviceName, env: config.environment }, 'AuthHub HTTP server started');
    logger.info('Endpoints: GET /health, GET /metrics, GET /config, /api/*');
  });

  if (config.grpcPort != null) {
    startGrpcServer({ config, port: config.grpcPort });
    logger.info({ port: config.grpcPort }, 'gRPC server started');
  }
}
