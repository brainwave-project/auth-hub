// Moved from src/routes/auth.ts → src/transport/http/handlers/auth.handler.ts
import { Router, Request, Response } from 'express';
import type { EnvConfig } from '../../../config/env.js';
import { getKeycloakEndpoints } from '../../../config/keycloak.config.js';

export function createAuthRouter(config: EnvConfig): Router {
  const router = Router();
  const kc = config.keycloak;
  const endpoints = kc ? getKeycloakEndpoints(kc) : null;
  const redirectBase = kc?.redirectBaseUrl ?? '';

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Initiates login with credentials or redirects to Keycloak (OIDC/OAuth2)
   *     tags: [Auth]
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
        if (!r.ok) return res.status(r.status).json(data);
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
   *     summary: Logs out the current session
   *     tags: [Auth]
   */
  router.post('/logout', (req: Request, res: Response) => {
    const { id_token_hint, post_logout_redirect_uri } = req.body || {};
    if (!endpoints) return res.status(501).json({ error: 'Keycloak not configured' });

    const logoutUrl = new URL(endpoints.logout);
    if (id_token_hint) logoutUrl.searchParams.set('id_token_hint', id_token_hint);
    if (post_logout_redirect_uri) {
      logoutUrl.searchParams.set('post_logout_redirect_uri', post_logout_redirect_uri);
    }
    if (id_token_hint) return res.redirect(302, logoutUrl.toString());
    res.status(200).json({ message: 'Logout acknowledged', logout_url: logoutUrl.toString() });
  });

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Uses refresh token to issue new access token
   *     tags: [Auth]
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

  return router;
}
