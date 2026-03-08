import type { EnvMap } from "./parser.js";

export interface SchemaRule {
  required?: boolean;
  type?: "string" | "number" | "boolean" | "url" | "email" | "enum";
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  values?: string[];
}

export interface Schema {
  rules: Record<string, SchemaRule>;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  key: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

/**
 * Validate an env map against a schema.
 */
export function validateEnv(
  env: EnvMap,
  schema: Schema,
  strict: boolean = false
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check required keys and type validation
  for (const [key, rule] of Object.entries(schema.rules)) {
    const value = env.get(key);

    if (value === undefined) {
      if (rule.required) {
        issues.push({
          key,
          severity: "error",
          message: "missing (required)",
        });
      }
      continue;
    }

    // Type validation
    if (rule.type) {
      const typeError = validateType(key, value, rule);
      if (typeError) issues.push(typeError);
    }

    // Pattern validation
    if (rule.pattern) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value)) {
        issues.push({
          key,
          severity: "error",
          message: `does not match pattern: ${rule.pattern}`,
        });
      }
    }

    // String length validation
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      issues.push({
        key,
        severity: "error",
        message: `length ${value.length} is less than minimum ${rule.minLength}`,
      });
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      issues.push({
        key,
        severity: "error",
        message: `length ${value.length} exceeds maximum ${rule.maxLength}`,
      });
    }
  }

  // Check for extra keys not in schema
  for (const key of env.keys()) {
    if (!(key in schema.rules)) {
      issues.push({
        key,
        severity: strict ? "error" : "warning",
        message: "not in schema",
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

function validateType(
  key: string,
  value: string,
  rule: SchemaRule
): ValidationIssue | null {
  switch (rule.type) {
    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          key,
          severity: "error",
          message: `expected number, got "${value}"`,
        };
      }
      if (rule.min !== undefined && num < rule.min) {
        return {
          key,
          severity: "error",
          message: `value ${num} is less than minimum ${rule.min}`,
        };
      }
      if (rule.max !== undefined && num > rule.max) {
        return {
          key,
          severity: "error",
          message: `value ${num} exceeds maximum ${rule.max}`,
        };
      }
      return null;
    }

    case "boolean":
      if (!["true", "false", "1", "0", "yes", "no"].includes(value.toLowerCase())) {
        return {
          key,
          severity: "error",
          message: `expected boolean, got "${value}"`,
        };
      }
      return null;

    case "url":
      try {
        new URL(value);
        return null;
      } catch {
        return {
          key,
          severity: "error",
          message: `expected URL, got "${value}"`,
        };
      }

    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return {
          key,
          severity: "error",
          message: `expected email, got "${value}"`,
        };
      }
      return null;

    case "enum":
      if (rule.values && !rule.values.includes(value)) {
        return {
          key,
          severity: "error",
          message: `expected one of [${rule.values.join(", ")}], got "${value}"`,
        };
      }
      return null;

    case "string":
    default:
      return null;
  }
}
