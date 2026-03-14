import type { KeycloakConfig } from "../config/env.js";
import { getKeycloakEndpoints } from "../config/keycloak.config.js";
import type {
  IKeycloakAdapter,
  KeycloakTokenResponse,
  KeycloakIntrospectResponse,
  JwksResponse,
} from "./keycloak.port.js";

export class KeycloakAdapter implements IKeycloakAdapter {
  constructor(private readonly config: KeycloakConfig) {}

  getConfig(): KeycloakConfig {
    return this.config;
  }

  getJwksUrl(): string {
    return getKeycloakEndpoints(this.config).jwks;
  }

  async requestToken(params: {
    grant_type: string;
    username?: string;
    password?: string;
    code?: string;
    redirect_uri?: string;
    refresh_token?: string;
  }): Promise<KeycloakTokenResponse> {
    const endpoints = getKeycloakEndpoints(this.config);
    const body = new URLSearchParams();
    body.set("grant_type", params.grant_type);
    body.set("client_id", this.config.clientId);
    if (this.config.clientSecret) body.set("client_secret", this.config.clientSecret);
    if (params.username) body.set("username", params.username);
    if (params.password) body.set("password", params.password);
    if (params.code) body.set("code", params.code);
    if (params.redirect_uri) body.set("redirect_uri", params.redirect_uri);
    if (params.refresh_token) body.set("refresh_token", params.refresh_token);

    const res = await fetch(endpoints.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as KeycloakTokenResponse;
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  async introspect(token: string): Promise<KeycloakIntrospectResponse> {
    const endpoints = getKeycloakEndpoints(this.config);
    const body = new URLSearchParams();
    body.set("token", token);
    body.set("client_id", this.config.clientId);
    if (this.config.clientSecret) body.set("client_secret", this.config.clientSecret);

    const res = await fetch(endpoints.introspect, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as KeycloakIntrospectResponse;
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  async getJwks(): Promise<JwksResponse> {
    const url = getKeycloakEndpoints(this.config).jwks;
    const res = await fetch(url);
    const data = (await res.json().catch(() => ({}))) as JwksResponse;
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  getAuthUrl(params: { redirect_uri: string; state?: string }): string {
    const endpoints = getKeycloakEndpoints(this.config);
    const url = new URL(endpoints.auth);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", params.redirect_uri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid");
    if (params.state) url.searchParams.set("state", params.state);
    return url.toString();
  }

  getLogoutUrl(params: { id_token_hint?: string; post_logout_redirect_uri?: string }): string {
    const endpoints = getKeycloakEndpoints(this.config);
    const url = new URL(endpoints.logout);
    if (params.id_token_hint) url.searchParams.set("id_token_hint", params.id_token_hint);
    if (params.post_logout_redirect_uri)
      url.searchParams.set("post_logout_redirect_uri", params.post_logout_redirect_uri);
    return url.toString();
  }
}

/** Create adapter from config; returns null if Keycloak not configured. */
export function createKeycloakAdapter(config: KeycloakConfig | undefined): KeycloakAdapter | null {
  return config ? new KeycloakAdapter(config) : null;
}
