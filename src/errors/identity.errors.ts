import { IdentityStatus } from "../domain/identity-status.js";
import type { IdentityStatus as IdentityStatusType } from "../domain/identity-status.js";

export class IdentityError extends Error {
  constructor(
    message: string,
    public readonly code: IdentityStatusType,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "IdentityError";
    Object.setPrototypeOf(this, IdentityError.prototype);
  }
}

export class TokenExpiredError extends IdentityError {
  constructor(expiredAt?: number) {
    super("Token has expired", IdentityStatus.Expired, 400, { expired_at: expiredAt });
    this.name = "TokenExpiredError";
  }
}

export class TokenNotYetValidError extends IdentityError {
  constructor(notBefore?: number) {
    super("Token not yet valid", IdentityStatus.NotYetValid, 400, { not_before: notBefore });
    this.name = "TokenNotYetValidError";
  }
}

export class InvalidTokenError extends IdentityError {
  constructor(message: string = "Invalid token", details?: Record<string, unknown>) {
    super(message, IdentityStatus.InvalidSignature, 400, details);
    this.name = "InvalidTokenError";
  }
}

export class InsufficientRolesError extends IdentityError {
  constructor(
    public readonly required: string[],
    public readonly tokenRoles: string[]
  ) {
    super("Insufficient roles", IdentityStatus.InsufficientRoles, 403, {
      required,
      token_roles: tokenRoles,
    });
    this.name = "InsufficientRolesError";
  }
}

export class MissingTokenError extends IdentityError {
  constructor() {
    super("Token is required", IdentityStatus.MissingToken, 400);
    this.name = "MissingTokenError";
  }
}
