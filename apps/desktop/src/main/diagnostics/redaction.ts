const SENSITIVE_KEY =
  /(password|token|cookie|authorization|phone|message|notification|qr|secret|clipboard|title|body|sender|preview)/i;

const URL_RE = /https?:\/\/[^\s]+/gi;

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(URL_RE, "[redacted-url]");
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redactValue(nested);
    }
    return out;
  }
  return value;
}

export function sanitizeLogFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(fields) as Record<string, unknown>;
}
