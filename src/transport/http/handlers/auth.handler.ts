// Moved from src/routes/auth.ts → src/transport/http/handlers/auth.handler.ts
import { Router, Request, Response } from 'express';
import type { EnvConfig } from '../../../config/env.js';
import { getKeycloakEndpoints } from '../../../config/keycloak.config.js';
import {
  emitLoginSuccess,
  emitLoginFailure,
  emitLogout,
  emitTokenRefreshed,
} from '../../../events/emitter.js';

export function createAuthRouter(config: EnvConfig): Router {
  const router = Router();
  const kc = config.keycloak;
  const endpoints = kc ? getKeycloakEndpoints(kc) : null;
  const redirectBase = kc?.redirectBaseUrl ?? '';

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login with username/password (direct grant) or redirect to Keycloak OIDC flow
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username: { type: string, example: "ahmad@brainwave.io" }
   *               password: { type: string, format: password }
   *               redirect: { type: boolean, description: "true = redirect to Keycloak login page instead of direct grant" }
   *               state:    { type: string, description: "CSRF state token for OIDC flow" }
   *     responses:
   *       200:
   *         description: Tokens issued (direct grant flow)
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/TokenResponse' }
   *       302:
   *         description: Redirect to Keycloak login page (OIDC flow)
   *       400:
   *         description: Missing credentials
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *       502:
   *         description: Keycloak unreachable
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  router.post('/login', (req: Request, res: Response) => {
    const { username, password, redirect } = req.body || {};

    if (redirect && endpoints) {
      const redirectUri = redirectBase
        ? `${redirectBase.replace(/\/$/, '')}/api/auth/callback`
        : `${req.protocol}://${req.get('host')}/api/auth/callback`;
      const authUrl = new URL(endpoints.auth);
      authUrl.searchParams.set('client_id', kc!.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid');
      if (req.body?.state) authUrl.searchParams.set('state', req.body.state);
      return res.redirect(302, authUrl.toString());
    }

    if (!endpoints || !username || !password) {
      if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });
      return res.status(400).json({ error: 'username and password required for direct login' });
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'password');
    params.set('client_id', kc!.clientId);
    params.set('username', username);
    params.set('password', password);
    if (kc!.clientSecret) params.set('client_secret', kc!.clientSecret);

    fetch(endpoints.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          emitLoginFailure({ email: username, correlationId: req.headers['x-correlation-id'] as string });
          // Keycloak returns this when the user has UPDATE_PASSWORD required action (temp password).
          // Return a structured code so the frontend can redirect to /set-password instead of
          // showing a generic "invalid credentials" error.
          if (
            data.error === 'invalid_grant' &&
            typeof data.error_description === 'string' &&
            data.error_description.toLowerCase().includes('not fully set up')
          ) {
            return res.status(400).json({ error: 'PASSWORD_CHANGE_REQUIRED', username });
          }
          return res.status(r.status).json(data);
        }
        // Extract sub from the returned access token to use as actorId
        const sub: string = (() => {
          try {
            const parts = (data.access_token as string).split('.');
            return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()).sub ?? username;
          } catch { return username; }
        })();
        emitLoginSuccess(sub, { email: username, correlationId: req.headers['x-correlation-id'] as string });
        res.status(200).json(data);
      })
      .catch((err) => {
        res.status(502).json({ error: 'Keycloak unavailable', details: String(err.message) });
      });
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Revoke session and redirect to Keycloak logout
   *     tags: [Auth]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id_token_hint:            { type: string, description: "ID token from Keycloak" }
   *               post_logout_redirect_uri: { type: string, format: uri }
   *     responses:
   *       200:
   *         description: Logout URL returned (client must redirect)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:    { type: string }
   *                 logout_url: { type: string, format: uri }
   *       302:
   *         description: Redirect to Keycloak logout (when id_token_hint provided)
   */
  router.post('/logout', (req: Request, res: Response) => {
    const { id_token_hint, post_logout_redirect_uri } = req.body || {};
    if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });

    const logoutUrl = new URL(endpoints.logout);
    if (id_token_hint) logoutUrl.searchParams.set('id_token_hint', id_token_hint);
    if (post_logout_redirect_uri) {
      logoutUrl.searchParams.set('post_logout_redirect_uri', post_logout_redirect_uri);
    }

    const actorId = req.headers['x-user-id'] as string | undefined ?? 'anonymous';
    emitLogout(actorId, { correlationId: req.headers['x-correlation-id'] as string });

    if (id_token_hint) return res.redirect(302, logoutUrl.toString());
    res.status(200).json({ message: 'Logout acknowledged', logout_url: logoutUrl.toString() });
  });

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Exchange refresh token for a new access token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refresh_token]
   *             properties:
   *               refresh_token: { type: string }
   *     responses:
   *       200:
   *         description: New token pair issued
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/TokenResponse' }
   *       400:
   *         description: refresh_token missing
   *       502:
   *         description: Keycloak unreachable
   */
  router.post('/refresh', (req: Request, res: Response) => {
    const { refresh_token } = req.body || {};
    if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('client_id', kc!.clientId);
    params.set('refresh_token', refresh_token);
    if (kc!.clientSecret) params.set('client_secret', kc!.clientSecret);

    fetch(endpoints.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(r.status).json(data);
        const sub: string = (() => {
          try {
            const parts = (data.access_token as string).split('.');
            return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()).sub ?? 'unknown';
          } catch { return 'unknown'; }
        })();
        emitTokenRefreshed(sub, { correlationId: req.headers['x-correlation-id'] as string });
        res.status(200).json(data);
      })
      .catch((err) => {
        res.status(502).json({ error: 'Keycloak unavailable', details: String(err.message) });
      });
  });

  /**
   * @swagger
   * /api/auth/callback:
   *   get:
   *     summary: OIDC redirect URI — exchanges code for tokens
   *     tags: [Auth]
   */
  router.get('/callback', (req: Request, res: Response) => {
    const { code, state } = req.query;
    const redirectUri = redirectBase
      ? `${redirectBase.replace(/\/$/, '')}/api/auth/callback`
      : `${req.protocol}://${req.get('host')}/api/auth/callback`;

    if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'code required' });

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('client_id', kc!.clientId);
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
    if (kc!.clientSecret) params.set('client_secret', kc!.clientSecret);

    fetch(endpoints.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const clientErrorUri = req.query['error_redirect'] as string;
          if (clientErrorUri) {
            return res.redirect(302, `${clientErrorUri}?error=${encodeURIComponent(JSON.stringify(data))}`);
          }
          return res.status(r.status).json(data);
        }
        const successRedirect = (req.query['success_redirect'] as string) || '/';
        const fragment = new URLSearchParams({
          access_token:  data.access_token ?? '',
          refresh_token: data.refresh_token ?? '',
          state:         state ? String(state) : '',
        }).toString();
        return res.redirect(302, `${successRedirect}#${fragment}`);
      })
      .catch((err) => {
        res.status(502).json({ error: 'Keycloak unavailable', details: String(err.message) });
      });
  });

  /**
   * @swagger
   * /api/auth/password-reset:
   *   post:
   *     summary: Initiates password reset via Keycloak account flow
   *     tags: [Auth]
   */
  router.post('/password-reset', (req: Request, res: Response) => {
    if (!kc) return res.status(501).json({ error: 'Keycloak not configured' });
    const accountResetUrl = `${kc.baseUrl}/realms/${kc.realm}/account/credentials/password-reset`;
    res.status(200).json({
      message: 'Redirect user to Keycloak account to reset password',
      reset_url: accountResetUrl,
    });
  });

  /**
   * @swagger
   * /api/auth/password-update:
   *   post:
   *     summary: Password update via Keycloak reset token
   *     tags: [Auth]
   */
  router.post('/password-update', (req: Request, res: Response) => {
    const { token, new_password } = req.body || {};
    if (!kc) return res.status(501).json({ error: 'Keycloak not configured' });
    if (!token || !new_password) return res.status(400).json({ error: 'token and new_password required' });
    res.status(501).json({
      error: 'Password update with token is handled by Keycloak account flow; complete the reset via the link in the email.',
    });
  });

  /**
   * @swagger
   * /api/auth/set-password:
   *   post:
   *     summary: Set permanent password for a user with UPDATE_PASSWORD required action
   *     description: >
   *       Called after login returns PASSWORD_CHANGE_REQUIRED. Uses Keycloak Admin API to
   *       reset the password permanently, then auto-logs in and returns fresh tokens so
   *       the frontend can navigate directly to the app.
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, new_password]
   *             properties:
   *               username:     { type: string }
   *               new_password: { type: string }
   *     responses:
   *       200:
   *         description: Password updated and fresh tokens returned
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/TokenResponse' }
   *       400: { description: username and new_password required }
   *       404: { description: User not found in Keycloak }
   *       501: { description: Keycloak not configured or admin credentials missing }
   *       502: { description: Keycloak Admin API unavailable }
   */
  router.post('/set-password', async (req: Request, res: Response) => {
    const { username, new_password } = req.body || {};

    if (!kc || !endpoints) return res.status(501).json({ error: 'Keycloak not configured' });
    if (!username || !new_password) return res.status(400).json({ error: 'username and new_password required' });
    if (!kc.adminUser || !kc.adminPassword) {
      return res.status(501).json({ error: 'Keycloak admin credentials not configured on server' });
    }

    try {
      // ── 1. Get a short-lived admin token from the master realm ──────────────
      const adminParams = new URLSearchParams();
      adminParams.set('grant_type', 'password');
      adminParams.set('client_id', 'admin-cli');
      adminParams.set('username', kc.adminUser);
      adminParams.set('password', kc.adminPassword);

      const adminTokenRes = await fetch(
        `${kc.baseUrl}/realms/master/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: adminParams.toString(),
        },
      );
      if (!adminTokenRes.ok) {
        return res.status(502).json({ error: 'Failed to obtain Keycloak admin token' });
      }
      const { access_token: adminToken } = (await adminTokenRes.json()) as { access_token: string };

      // ── 2. Look up the user by username (exact match) ────────────────────────
      const usersRes = await fetch(
        `${kc.baseUrl}/admin/realms/${kc.realm}/users?username=${encodeURIComponent(username)}&exact=true`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      if (!usersRes.ok) return res.status(502).json({ error: 'Failed to look up user in Keycloak' });

      const users = (await usersRes.json()) as Array<{ id: string }>;
      if (!users || users.length === 0) return res.status(404).json({ error: `User '${username}' not found` });
      const userId = users[0].id;

      // ── 3. Set a permanent password via Admin API (clears UPDATE_PASSWORD action) ─
      const resetRes = await fetch(
        `${kc.baseUrl}/admin/realms/${kc.realm}/users/${userId}/reset-password`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ type: 'password', value: new_password, temporary: false }),
        },
      );
      if (!resetRes.ok) {
        const detail = await resetRes.json().catch(() => ({}));
        return res.status(502).json({ error: 'Failed to reset password', detail });
      }

      // ── 4. Log in with the new password and return fresh tokens ─────────────
      const loginParams = new URLSearchParams();
      loginParams.set('grant_type', 'password');
      loginParams.set('client_id', kc.clientId);
      loginParams.set('username', username);
      loginParams.set('password', new_password);
      if (kc.clientSecret) loginParams.set('client_secret', kc.clientSecret);

      const loginRes = await fetch(endpoints.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginParams.toString(),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) return res.status(loginRes.status).json(loginData);

      emitLoginSuccess(username, { correlationId: req.headers['x-correlation-id'] as string });
      return res.status(200).json(loginData);
    } catch (err) {
      return res.status(502).json({ error: 'Keycloak unavailable', details: String((err as Error).message) });
    }
  });

  return router;
}
