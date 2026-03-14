import type { Role } from "./role.js";

/** Validated identity from a token (for service-to-service). */
export interface Identity {
  sub: string;
  roles: Role[];
  exp: number;
  iat?: number;
  realm?: string;
  /** Raw JWT payload for optional extra claims. */
  claims?: Record<string, unknown>;
}
