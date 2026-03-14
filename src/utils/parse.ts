/**
 * Parse a string to a port number (1-65535). Returns null if invalid.
 */
export function parsePort(value: string | undefined): number | null {
  const num = Number(value);
  if (Number.isNaN(num) || num < 1 || num > 65535) {
    return null;
  }
  return Math.floor(num);
}

/**
 * Parse a string to a non-negative integer. Returns null if invalid.
 */
export function parseInteger(value: string | undefined): number | null {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return null;
  }
  return num;
}

/**
 * Parse a string to a boolean. "1", "true", "yes" (case-insensitive) => true; "0", "false", "no" => false; else null.
 */
export function parseBoolean(value: string | undefined): boolean | null {
  if (value === undefined || value === null) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return null;
}
