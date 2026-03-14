export class KeycloakError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "KeycloakError";
    Object.setPrototypeOf(this, KeycloakError.prototype);
  }
}

export class KeycloakNotConfiguredError extends KeycloakError {
  constructor() {
    super("Keycloak is not configured", 501);
    this.name = "KeycloakNotConfiguredError";
  }
}

export class KeycloakUnavailableError extends KeycloakError {
  constructor(cause?: string) {
    super("Keycloak is unavailable", 502, cause ? { details: cause } : undefined);
    this.name = "KeycloakUnavailableError";
  }
}
