import { describe, it, expect } from "vitest";
import { mergeEnvMaps } from "../../src/core/merger.js";
import type { EnvMap } from "../../src/core/parser.js";

function makeMap(entries: [string, string][]): EnvMap {
  return new Map(entries);
}

describe("mergeEnvMaps", () => {
  const envA = makeMap([
    ["DATABASE_URL", "pg://localhost/db"],
    ["DEBUG", "true"],
    ["APP_NAME", "myapp"],
  ]);

  const envB = makeMap([
    ["DATABASE_URL", "pg://prod/db"],
    ["CDN_URL", "https://cdn.example.com"],
    ["APP_NAME", "myapp"],
  ]);

  it("union: includes all keys, last wins on conflict", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = mergeEnvMaps(fileMaps, "union");

    expect(result.size).toBe(4);
    expect(result.get("DATABASE_URL")).toBe("pg://prod/db"); // B wins
    expect(result.get("DEBUG")).toBe("true");
    expect(result.get("CDN_URL")).toBe("https://cdn.example.com");
    expect(result.get("APP_NAME")).toBe("myapp");
  });

  it("intersection: only common keys, last wins", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = mergeEnvMaps(fileMaps, "intersection");

    expect(result.size).toBe(2);
    expect(result.has("DATABASE_URL")).toBe(true);
    expect(result.has("APP_NAME")).toBe(true);
    expect(result.has("DEBUG")).toBe(false);
    expect(result.has("CDN_URL")).toBe(false);
  });

  it("a: only keys from first file", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = mergeEnvMaps(fileMaps, "a");

    expect(result.size).toBe(3);
    expect([...result.keys()].sort()).toEqual(["APP_NAME", "DATABASE_URL", "DEBUG"]);
    // Values come from A
    expect(result.get("DATABASE_URL")).toBe("pg://localhost/db");
  });

  it("handles 3-file merge with correct precedence", () => {
    const envC = makeMap([
      ["DATABASE_URL", "pg://staging/db"],
      ["NEW_KEY", "new"],
    ]);
    const fileMaps = new Map([["a", envA], ["b", envB], ["c", envC]]);
    const result = mergeEnvMaps(fileMaps, "union");

    expect(result.get("DATABASE_URL")).toBe("pg://staging/db"); // C wins
    expect(result.get("NEW_KEY")).toBe("new");
  });
});
