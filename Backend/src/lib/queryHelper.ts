/**
 * Safely extract a single string from a query parameter that could be string | string[]
 */
export function getQueryString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Safely extract a boolean-like query parameter
 */
export function getQueryBoolean(value: string | string[] | undefined): boolean | undefined {
  const stringValue = getQueryString(value);
  if (stringValue === "true") return true;
  if (stringValue === "false") return false;
  return undefined;
}

/**
 * Safely extract a query parameter as a number
 */
export function getQueryNumber(value: string | string[] | undefined): number | undefined {
  const stringValue = getQueryString(value);
  if (!stringValue) return undefined;
  const num = parseInt(stringValue, 10);
  return isNaN(num) ? undefined : num;
}
