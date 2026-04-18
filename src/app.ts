import express from 'express';
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

export async function startServer() {
  const config = loadConfig();

  const app = express();

  app.use(express.json());
  app.use(metricsMiddleware);

  app.get('/health', healthHandler);
  app.get('/metrics', (req, res, next) => {
    metricsHandler(req, res).catch(next);
  });
  app.get('/config', configHandler(config));

  registerHealthEndpoints(app);
  mountHttpApi(app, config);
  setupSwagger(app);

  app.listen(config.port, () => {
    logger.info({ port: config.port, service: config.serviceName, env: config.environment }, 'AuthHub HTTP server started');
    logger.info('Endpoints: GET /health, GET /metrics, GET /config, /api/*');
  });

  if (config.grpcPort != null) {
    startGrpcServer({ config, port: config.grpcPort });
    logger.info({ port: config.grpcPort }, 'gRPC server started');
  }
}
