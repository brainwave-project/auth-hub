/** Result of token validation for service-to-service calls. */
export const IdentityStatus = {
  Valid: "VALID",
  Expired: "EXPIRED",
  NotYetValid: "NOT_YET_VALID",
  InvalidSignature: "INVALID_SIGNATURE",
  InsufficientRoles: "INSUFFICIENT_ROLES",
  MissingToken: "MISSING_TOKEN",
} as const;

export type IdentityStatus = (typeof IdentityStatus)[keyof typeof IdentityStatus];
