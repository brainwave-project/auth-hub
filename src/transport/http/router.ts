// Moved from src/routes/index.ts → src/transport/http/router.ts
import { Router, Request, Response } from 'express';
import type { EnvConfig } from '../../config/env.js';
import { createAuthRouter }   from './handlers/auth.handler.js';
import { createTokensRouter } from './handlers/tokens.handler.js';

export function createRouter(config: EnvConfig): Router {
  const router = Router();

  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Health check
   *     tags: [Health]
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'auth-hub' });
  });

  router.use('/auth',   createAuthRouter(config));
  router.use('/tokens', createTokensRouter(config));

  return router;
}
