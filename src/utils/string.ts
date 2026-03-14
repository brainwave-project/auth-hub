/**
 * Returns true if value is a non-empty string after trim.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Trim string or return undefined if not a string.
 */
export function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Remove trailing slash from a URL or path string.
 */
export function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}
