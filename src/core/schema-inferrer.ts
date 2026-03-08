import type { EnvMap } from "./parser.js";
import type { Schema, SchemaRule } from "./validator.js";

/**
 * Infer a schema from one or more env maps.
 * Takes the union of all keys and infers types from value patterns.
 */
export function inferSchema(maps: EnvMap[]): Schema {
  const allKeys = new Set<string>();
  for (const m of maps) {
    for (const key of m.keys()) allKeys.add(key);
  }

  const rules: Record<string, SchemaRule> = {};

  for (const key of [...allKeys].sort()) {
    const values: string[] = [];
    for (const m of maps) {
      const v = m.get(key);
      if (v !== undefined) values.push(v);
    }

    rules[key] = {
      required: true,
      type: inferType(values),
    };

    // Add extra constraints based on inferred type
    const rule = rules[key];
    if (rule.type === "number") {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      if (nums.length > 0) {
        const isPort = key.toLowerCase().includes("port");
        if (isPort) {
          rule.min = 1;
          rule.max = 65535;
        }
      }
    }
  }

  return { rules };
}

function inferType(
  values: string[]
): "string" | "number" | "boolean" | "url" | "email" {
  if (values.length === 0) return "string";

  // Check if all values are URLs
  if (values.every((v) => isUrl(v))) return "url";

  // Check if all values are emails
  if (values.every((v) => isEmail(v))) return "email";

  // Check if all values are numbers
  if (values.every((v) => !isNaN(Number(v)) && v.trim() !== "")) return "number";

  // Check if all values are booleans
  if (
    values.every((v) =>
      ["true", "false", "1", "0", "yes", "no"].includes(v.toLowerCase())
    )
  )
    return "boolean";

  return "string";
}

function isUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
