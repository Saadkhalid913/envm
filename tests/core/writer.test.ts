import { describe, it, expect } from "vitest";
import { writeEnv } from "../../src/core/writer.js";
import { parseEnv } from "../../src/core/parser.js";

describe("writeEnv", () => {
  it("sorts keys alphabetically", () => {
    const env = new Map([
      ["ZEBRA", "z"],
      ["APPLE", "a"],
      ["MANGO", "m"],
    ]);
    const output = writeEnv(env);
    expect(output).toBe("APPLE=a\nMANGO=m\nZEBRA=z\n");
  });

  it("quotes values with spaces", () => {
    const env = new Map([["FOO", "hello world"]]);
    const output = writeEnv(env);
    expect(output).toBe('FOO="hello world"\n');
  });

  it("quotes values with newlines", () => {
    const env = new Map([["FOO", "line1\nline2"]]);
    const output = writeEnv(env);
    expect(output).toBe('FOO="line1\\nline2"\n');
  });

  it("handles empty values", () => {
    const env = new Map([["FOO", ""]]);
    const output = writeEnv(env);
    expect(output).toBe("FOO=\n");
  });

  it("round-trips through parse and write", () => {
    const input = "API_KEY=sk-test-123\nDATABASE_URL=postgres://localhost/db\nDEBUG=true\n";
    const parsed = parseEnv(input);
    const output = writeEnv(parsed);
    expect(output).toBe(input);
  });
});
