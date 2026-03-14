/** Request body for POST /tokens/introspect. */
export interface IntrospectRequest {
  token?: string;
  access_token?: string;
}

/** Request body for POST /tokens/validate. */
export interface ValidateTokenRequest {
  token?: string;
  roles?: string[];
}

/** Response for POST /tokens/validate (success). */
export interface ValidateTokenResponse {
  valid: true;
  claims?: Record<string, unknown>;
  roles: string[];
  exp: number;
  sub: string;
}

/** Response for POST /tokens/validate (error). */
export interface ValidateTokenErrorResponse {
  valid: false;
  error: string;
  expired_at?: number;
  not_before?: number;
  required?: string[];
  token_roles?: string[];
  details?: string;
}
