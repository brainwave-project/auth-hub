// Moved from src/routes/tokens.ts → src/transport/http/handlers/tokens.handler.ts
import { Router, Request, Response } from 'express';
import type { EnvConfig } from '../../../config/env.js';
import { getKeycloakEndpoints } from '../../../config/keycloak.config.js';
import { validateToken } from '../../../services/token-validation.service.js';
import type { IdentityError } from '../../../errors/identity.errors.js';
import { KeycloakNotConfiguredError, KeycloakUnavailableError } from '../../../errors/keycloak.errors.js';

export function createTokensRouter(config: EnvConfig): Router {
  const router = Router();
  const kc = config.keycloak;
  const endpoints = kc ? getKeycloakEndpoints(kc) : null;

  /**
   * @swagger
   * /api/tokens/introspect:
   *   post:
   *     summary: Validate token and return claims (RFC 7662 OAuth2 introspection)
   *     description: >
   *       Proxies to Keycloak's introspection endpoint using client credentials.
   *       Returns `active: false` for expired or revoked tokens.
   *     tags: [Tokens]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token: { type: string, description: "Access token to introspect" }
   *     responses:
   *       200:
   *         description: Token claims (active=false if invalid)
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/IntrospectResponse' }
   *       400:
   *         description: token field missing
   *       502:
   *         description: Keycloak unreachable
   */
  router.post('/introspect', (req: Request, res: Response) => {
    const token =
      typeof req.body?.token === 'string' ? req.body.token : req.body?.access_token;

    if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });
    if (!token) return res.status(400).json({ error: 'token required' });

    const params = new URLSearchParams();
    params.set('token', token);
    params.set('client_id', kc!.clientId);
    if (kc!.clientSecret) params.set('client_secret', kc!.clientSecret);

    fetch(endpoints.introspect, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(r.status).json(data);
        res.status(200).json(data);
      })
      .catch((err) => {
        res.status(502).json({ error: 'Keycloak unavailable', details: String(err.message) });
      });
  });

  /**
   * @swagger
   * /api/tokens/jwks:
   *   get:
   *     summary: Returns JWKS (Keycloak public keys for token verification)
   *     tags: [Tokens]
   */
  router.get('/jwks', (_req: Request, res: Response) => {
    if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });

    fetch(endpoints.jwks)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(r.status).json(data);
        res.status(200).json(data);
      })
      .catch((err) => {
        res.status(502).json({ error: 'Keycloak unavailable', details: String(err.message) });
      });
  });

  /**
   * @swagger
   * /api/tokens/validate:
   *   post:
   *     summary: Validate token signature, expiry, and optionally enforce required roles
   *     description: >
   *       Used internally by services (and Kong plugins) to validate a JWT locally
   *       using the cached JWKS. Faster than introspection — no Keycloak round-trip.
   *     tags: [Tokens]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token:
   *                 type: string
   *                 description: JWT access token
   *               roles:
   *                 type: array
   *                 items: { type: string }
   *                 description: "Optional — if provided, token must include ALL of these roles"
   *                 example: ["EDITOR"]
   *     responses:
   *       200:
   *         description: Token is valid
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 valid:  { type: boolean, example: true }
   *                 sub:    { type: string, format: uuid }
   *                 roles:  { type: array, items: { type: string } }
   *                 exp:    { type: integer }
   *                 claims: { type: object }
   *       400:
   *         description: Token invalid, expired, or missing required roles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 valid: { type: boolean, example: false }
   *                 error: { type: string }
   */
  router.post('/validate', async (req: Request, res: Response) => {
    const { token, roles: requiredRoles } = req.body || {};

    try {
      const result = await validateToken(config, {
        token: typeof token === 'string' ? token : '',
        requiredRoles: Array.isArray(requiredRoles) ? requiredRoles : undefined,
      });
      const { identity } = result;
      return res.status(200).json({
        valid:  true,
        claims: identity.claims,
        roles:  identity.roles,
        exp:    identity.exp,
        sub:    identity.sub,
      });
    } catch (err) {
      if (err instanceof KeycloakNotConfiguredError) {
        return res.status(501).json({ error: err.message });
      }
      if (err instanceof KeycloakUnavailableError) {
        return res.status(err.statusCode).json({ error: err.message, ...err.details });
      }
      if (err && typeof (err as IdentityError).code === 'string') {
        const e = err as IdentityError;
        return res.status(e.statusCode).json({ valid: false, error: e.code, ...e.details });
      }
      const message = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ valid: false, error: 'validation_failed', details: message });
    }
  });

  return router;
}
