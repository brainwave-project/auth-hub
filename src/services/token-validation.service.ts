import { createRemoteJWKSet, jwtVerify } from "jose";
import type { EnvConfig } from "../config/env.js";
import { getKeycloakEndpoints } from "../config/keycloak.config.js";
import type { Identity } from "../domain/identity.js";
import {
  InsufficientRolesError,
  InvalidTokenError,
  MissingTokenError,
  TokenExpiredError,
  TokenNotYetValidError,
} from "../errors/identity.errors.js";
import { KeycloakNotConfiguredError } from "../errors/keycloak.errors.js";

export interface ValidateTokenInput {
  token: string;
  requiredRoles?: string[];
}

export interface ValidateTokenResult {
  valid: true;
  identity: Identity;
}

/**
 * Validates an access token (signature via Keycloak JWKS, expiry, optional roles).
 * Used by both HTTP and gRPC transports.
 * @throws KeycloakNotConfiguredError, MissingTokenError, TokenExpiredError, TokenNotYetValidError, InvalidTokenError, InsufficientRolesError
 */
export async function validateToken(
  config: EnvConfig,
  input: ValidateTokenInput
): Promise<ValidateTokenResult> {
  const { token, requiredRoles } = input;
  const kc = config.keycloak;

  if (!kc) {
    throw new KeycloakNotConfiguredError();
  }
  if (!token || typeof token !== "string") {
    throw new MissingTokenError();
  }

  const endpoints = getKeycloakEndpoints(kc);

  try {
    const JWKS = createRemoteJWKSet(new URL(endpoints.jwks));
    const { payload } = await jwtVerify(token, JWKS);
    const now = Math.floor(Date.now() / 1000);

    const exp = payload.exp;
    if (exp !== undefined && exp < now) {
      throw new TokenExpiredError(exp);
    }
    const nbf = payload.nbf;
    if (nbf !== undefined && nbf > now) {
      throw new TokenNotYetValidError(nbf);
    }

    const realmRoles = (payload.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
    const resourceAccess = (payload.resource_access as Record<string, { roles?: string[] }> | undefined) ?? {};
    const clientRoles = Object.values(resourceAccess).flatMap((r) => r.roles ?? []);
    const tokenRoles = [...new Set([...realmRoles, ...clientRoles])];

    if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((r) => typeof r === "string" && tokenRoles.includes(r));
      if (!hasRole) {
        throw new InsufficientRolesError(requiredRoles, tokenRoles);
      }
    }

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const identity: Identity = {
      sub,
      roles: tokenRoles,
      exp: typeof exp === "number" ? exp : 0,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
      realm: typeof payload.iss === "string" ? payload.iss : undefined,
      claims: payload as Record<string, unknown>,
    };

    return { valid: true, identity };
  } catch (err) {
    if (
      err instanceof TokenExpiredError ||
      err instanceof TokenNotYetValidError ||
      err instanceof InsufficientRolesError ||
      err instanceof MissingTokenError
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new InvalidTokenError(message, { details: message });
  }
}
