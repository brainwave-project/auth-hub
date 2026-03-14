import type { KeycloakConfig } from "./env.js";

/** Keycloak OpenID Connect endpoints for a realm. */
export function getKeycloakEndpoints(kc: KeycloakConfig) {
  const base = `${kc.baseUrl}/realms/${kc.realm}/protocol/openid-connect`;
  return {
    token: `${base}/token`,
    introspect: `${base}/token/introspect`,
    auth: `${base}/auth`,
    logout: `${base}/logout`,
    userinfo: `${base}/userinfo`,
    jwks: `${base}/certs`,
  };
}
