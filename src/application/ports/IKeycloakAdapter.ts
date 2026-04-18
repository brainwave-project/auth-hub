// Moved from src/adapters/keycloak.port.ts → src/application/ports/IKeycloakAdapter.ts
import type { KeycloakConfig } from '../../config/env.js';

export interface KeycloakTokenResponse {
  access_token?:  string;
  refresh_token?: string;
  expires_in?:    number;
  token_type?:    string;
  [key: string]:  unknown;
}

export interface KeycloakIntrospectResponse {
  active?: boolean;
  sub?:    string;
  exp?:    number;
  [key: string]: unknown;
}

export interface JwksResponse {
  keys?: Array<Record<string, unknown>>;
}

/**
 * Outbound port — defines what auth-hub needs from Keycloak.
 * The KeycloakAdapter in src/adapters/ implements this.
 * Tests can provide a fake implementation.
 */
export interface IKeycloakAdapter {
  getConfig(): KeycloakConfig | null;
  getJwksUrl(): string;
  requestToken(params: {
    grant_type:    string;
    username?:     string;
    password?:     string;
    code?:         string;
    redirect_uri?: string;
    refresh_token?:string;
  }): Promise<KeycloakTokenResponse>;
  introspect(token: string): Promise<KeycloakIntrospectResponse>;
  getJwks(): Promise<JwksResponse>;
  getAuthUrl(params: { redirect_uri: string; state?: string }): string;
  getLogoutUrl(params: { id_token_hint?: string; post_logout_redirect_uri?: string }): string;
}
