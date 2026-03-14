/** Request body for POST /auth/login (direct grant). */
export interface LoginRequest {
  username?: string;
  password?: string;
  redirect?: boolean;
  state?: string;
}

/** Request body for POST /auth/logout. */
export interface LogoutRequest {
  id_token_hint?: string;
  post_logout_redirect_uri?: string;
}

/** Request body for POST /auth/refresh. */
export interface RefreshRequest {
  refresh_token?: string;
}

/** Request body for POST /auth/password-reset. */
export interface PasswordResetRequest {
  email?: string;
  username?: string;
}

/** Request body for POST /auth/password-update. */
export interface PasswordUpdateRequest {
  token?: string;
  new_password?: string;
}
