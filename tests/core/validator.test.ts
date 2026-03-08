import { describe, it, expect } from "vitest";
import { validateEnv, type Schema } from "../../src/core/validator.js";

describe("validateEnv", () => {
  const schema: Schema = {
    rules: {
      DATABASE_URL: {
        required: true,
        type: "url",
        pattern: "^postgres(ql)?://",
      },
      PORT: {
        required: true,
        type: "number",
        min: 1,
        max: 65535,
      },
      DEBUG: {
        required: false,
        type: "boolean",
      },
      API_KEY: {
        required: true,
        type: "string",
        minLength: 10,
      },
      LOG_LEVEL: {
        required: false,
        type: "enum",
        values: ["debug", "info", "warn", "error"],
      },
    },
  };

  it("validates a correct env", () => {
    const env = new Map([
      ["DATABASE_URL", "postgres://localhost/db"],
      ["PORT", "3000"],
      ["DEBUG", "true"],
      ["API_KEY", "sk-test-123456"],
      ["LOG_LEVEL", "info"],
    ]);

    const result = validateEnv(env, schema);
    expect(result.valid).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it("reports missing required keys", () => {
    const env = new Map([
      ["DATABASE_URL", "postgres://localhost/db"],
      ["PORT", "3000"],
    ]);

    const result = validateEnv(env, schema);
    expect(result.valid).toBe(false);
    const apiKeyIssue = result.issues.find((i) => i.key === "API_KEY");
    expect(apiKeyIssue?.message).toBe("missing (required)");
  });

  it("reports type errors", () => {
    const env = new Map([
      ["DATABASE_URL", "not-a-url"],
      ["PORT", "not-a-number"],
      ["API_KEY", "sk-test-123456"],
    ]);

    const result = validateEnv(env, schema);
    const portIssue = result.issues.find((i) => i.key === "PORT");
    expect(portIssue?.message).toContain("expected number");
  });

  it("warns about extra keys (non-strict)", () => {
    const env = new Map([
      ["DATABASE_URL", "postgres://localhost/db"],
      ["PORT", "3000"],
      ["API_KEY", "sk-test-123456"],
      ["EXTRA_VAR", "something"],
    ]);

    const result = validateEnv(env, schema);
    const extraIssue = result.issues.find((i) => i.key === "EXTRA_VAR");
    expect(extraIssue?.severity).toBe("warning");
  });

  it("errors on extra keys in strict mode", () => {
    const env = new Map([
      ["DATABASE_URL", "postgres://localhost/db"],
      ["PORT", "3000"],
      ["API_KEY", "sk-test-123456"],
      ["EXTRA_VAR", "something"],
    ]);

    const result = validateEnv(env, schema, true);
    const extraIssue = result.issues.find((i) => i.key === "EXTRA_VAR");
    expect(extraIssue?.severity).toBe("error");
  });

  it("validates enum type", () => {
    const env = new Map([
      ["DATABASE_URL", "postgres://localhost/db"],
      ["PORT", "3000"],
      ["API_KEY", "sk-test-123456"],
      ["LOG_LEVEL", "invalid"],
    ]);

    const result = validateEnv(env, schema);
    const logIssue = result.issues.find((i) => i.key === "LOG_LEVEL");
    expect(logIssue?.message).toContain("expected one of");
  });

  it("validates number min/max", () => {
    const env = new Map([
      ["DATABASE_URL", "postgres://localhost/db"],
      ["PORT", "99999"],
      ["API_KEY", "sk-test-123456"],
    ]);

    const result = validateEnv(env, schema);
    const portIssue = result.issues.find((i) => i.key === "PORT");
    expect(portIssue?.message).toContain("exceeds maximum");
  });
});
