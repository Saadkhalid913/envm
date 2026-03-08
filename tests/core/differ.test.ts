import { describe, it, expect } from "vitest";
import { diffEnvMaps } from "../../src/core/differ.js";
import type { EnvMap } from "../../src/core/parser.js";

function makeMap(entries: [string, string][]): EnvMap {
  return new Map(entries);
}

describe("diffEnvMaps", () => {
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

  it("returns union by default (all keys)", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps, "union");
    expect(result.entries).toHaveLength(4);
  });

  it("classifies same, differs, and only_in correctly", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps);
    const byKey = Object.fromEntries(result.entries.map((e) => [e.key, e]));

    expect(byKey["APP_NAME"].status).toBe("same");
    expect(byKey["DATABASE_URL"].status).toBe("differs");
    expect(byKey["DEBUG"].status).toBe("only_in");
    expect(byKey["DEBUG"].presentIn).toEqual(["a"]);
    expect(byKey["CDN_URL"].status).toBe("only_in");
    expect(byKey["CDN_URL"].presentIn).toEqual(["b"]);
  });

  it("filters to intersection", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps, "intersection");
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((e) => e.key).sort()).toEqual(["APP_NAME", "DATABASE_URL"]);
  });

  it("filters to diff (keys that differ)", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps, "diff");
    // DATABASE_URL differs, DEBUG only_in, CDN_URL only_in
    expect(result.entries).toHaveLength(3);
  });

  it("filters to xor (symmetric difference)", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps, "xor");
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((e) => e.key).sort()).toEqual(["CDN_URL", "DEBUG"]);
  });

  it("filters by file label", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps, "a");
    // Only keys in A but not B
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].key).toBe("DEBUG");
  });

  it("computes correct summary", () => {
    const fileMaps = new Map([["a", envA], ["b", envB]]);
    const result = diffEnvMaps(fileMaps);
    expect(result.summary.totalUniqueKeys).toBe(4);
    expect(result.summary.sharedSame).toBe(1);
    expect(result.summary.sharedDiffer).toBe(1);
    expect(result.summary.exclusive["a"]).toBe(1);
    expect(result.summary.exclusive["b"]).toBe(1);
  });
});
