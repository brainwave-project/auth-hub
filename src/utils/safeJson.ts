/**
 * Parse JSON safely. Returns parsed value or undefined on error.
 */
export function safeParseJson<T = unknown>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}
