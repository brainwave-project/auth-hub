import { Router, Request, Response } from "express";
import type { EnvConfig } from "../config/env.js";
import { createAuthRouter } from "./auth.js";
import { createTokensRouter } from "./tokens.js";

/**
 * Creates the main API router with health and auth routes.
 * Pass config so auth routes can use Keycloak when configured.
 */
export function createRouter(config: EnvConfig): Router {
  const router = Router();

  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Health check
   *     tags:
   *       - Health
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  router.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "auth-hub" });
  });

  router.use("/auth", createAuthRouter(config));
  router.use("/tokens", createTokensRouter(config));

  return router;
}
