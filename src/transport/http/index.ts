import type { Express } from 'express';
import type { EnvConfig } from '../../config/env.js';
import { createRouter } from './router.js';

/**
 * Mounts the HTTP API onto the Express app.
 * Entry point for all /api/* routes.
 */
export function mountHttpApi(app: Express, config: EnvConfig): void {
  app.use('/api', createRouter(config));
}

export { createRouter } from './router.js';
