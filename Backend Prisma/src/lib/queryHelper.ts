type QueryValue = string | string[] | Record<string, unknown> | Array<string | Record<string, unknown>> | undefined;

/**
 * Safely extract a single string from query/param values that may include ParsedQs objects.
 */
export function getQueryString(value: QueryValue): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

/**
 * Safely extract a single string from Express 5 route params (string | string[]).
 */
export function getParamString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Safely extract a boolean-like query parameter
 */
export function getQueryBoolean(value: QueryValue): boolean | undefined {
  const stringValue = getQueryString(value);
  if (stringValue === "true") return true;
  if (stringValue === "false") return false;
  return undefined;
}

/**
 * Safely extract a query parameter as a number
 */
export function getQueryNumber(value: QueryValue): number | undefined {
  const stringValue = getQueryString(value);
  if (!stringValue) return undefined;
  const num = parseInt(stringValue, 10);
  return isNaN(num) ? undefined : num;
}
