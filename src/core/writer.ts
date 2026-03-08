import type { EnvMap } from "./parser.js";

/**
 * Serialize an EnvMap to a normalized .env file string.
 *
 * - Keys are sorted alphabetically
 * - Values that contain newlines, quotes, or special chars are double-quoted
 * - No trailing whitespace, consistent formatting
 */
export function writeEnv(env: EnvMap): string {
  const keys = [...env.keys()].sort();
  const lines: string[] = [];

  for (const key of keys) {
    const value = env.get(key)!;
    lines.push(`${key}=${quoteValue(value)}`);
  }

  return lines.join("\n") + "\n";
}

export function quoteValue(value: string): string {
  // Empty value — no quoting needed
  if (value === "") return "";

  // Needs double quoting if it contains: newlines, double quotes, single quotes,
  // leading/trailing whitespace, or `#`
  const needsQuoting =
    value.includes("\n") ||
    value.includes('"') ||
    value.includes("'") ||
    value.includes("#") ||
    value.includes(" ") ||
    value !== value.trim();

  if (needsQuoting) {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return `"${escaped}"`;
  }

  return value;
}
