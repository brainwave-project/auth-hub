import type { KeycloakConfig } from "../config/env.js";

/** Keycloak token endpoint response (subset). */
export interface KeycloakTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  [key: string]: unknown;
}

/** Keycloak introspection response (subset). */
export interface KeycloakIntrospectResponse {
  active?: boolean;
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

/** JWKS response. */
export interface JwksResponse {
  keys?: Array<Record<string, unknown>>;
}

/** Port (interface) for Keycloak operations. Implementations can be swapped for tests or different backends. */
export interface IKeycloakAdapter {
  getConfig(): KeycloakConfig | null;
  getJwksUrl(): string;
  requestToken(params: {
    grant_type: string;
    username?: string;
    password?: string;
    code?: string;
    redirect_uri?: string;
    refresh_token?: string;
  }): Promise<KeycloakTokenResponse>;
  introspect(token: string): Promise<KeycloakIntrospectResponse>;
  getJwks(): Promise<JwksResponse>;
  getAuthUrl(params: { redirect_uri: string; state?: string }): string;
  getLogoutUrl(params: { id_token_hint?: string; post_logout_redirect_uri?: string }): string;
}
