import { describe, it, expect } from "vitest";
import { parseEnv } from "../../src/core/parser.js";

describe("parseEnv", () => {
  it("parses simple KEY=VALUE pairs", () => {
    const result = parseEnv("FOO=bar\nBAZ=qux");
    expect(result.get("FOO")).toBe("bar");
    expect(result.get("BAZ")).toBe("qux");
  });

  it("handles export prefix", () => {
    const result = parseEnv("export FOO=bar");
    expect(result.get("FOO")).toBe("bar");
  });

  it("handles double-quoted values", () => {
    const result = parseEnv('FOO="hello world"');
    expect(result.get("FOO")).toBe("hello world");
  });

  it("handles single-quoted values", () => {
    const result = parseEnv("FOO='hello world'");
    expect(result.get("FOO")).toBe("hello world");
  });

  it("handles multiline double-quoted values", () => {
    const result = parseEnv('FOO="line1\nline2\nline3"');
    expect(result.get("FOO")).toBe("line1\nline2\nline3");
  });

  it("strips inline comments from unquoted values", () => {
    const result = parseEnv("FOO=bar # this is a comment");
    expect(result.get("FOO")).toBe("bar");
  });

  it("does not strip # inside quoted values", () => {
    const result = parseEnv('FOO="bar # not a comment"');
    expect(result.get("FOO")).toBe("bar # not a comment");
  });

  it("skips blank lines and comment lines", () => {
    const result = parseEnv("# comment\n\nFOO=bar\n\n# another");
    expect(result.size).toBe(1);
    expect(result.get("FOO")).toBe("bar");
  });

  it("handles empty values", () => {
    const result = parseEnv("FOO=");
    expect(result.get("FOO")).toBe("");
  });

  it("handles values with = signs", () => {
    const result = parseEnv("FOO=bar=baz=qux");
    expect(result.get("FOO")).toBe("bar=baz=qux");
  });

  it("handles escape sequences in double-quoted values", () => {
    const result = parseEnv('FOO="hello\\nworld"');
    expect(result.get("FOO")).toBe("hello\nworld");
  });

  it("skips invalid key names", () => {
    const result = parseEnv("123INVALID=foo\nVALID_KEY=bar");
    expect(result.size).toBe(1);
    expect(result.get("VALID_KEY")).toBe("bar");
  });

  it("handles keys with underscores and numbers", () => {
    const result = parseEnv("MY_VAR_2=value");
    expect(result.get("MY_VAR_2")).toBe("value");
  });
});
