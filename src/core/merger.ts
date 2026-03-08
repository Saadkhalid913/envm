import type { EnvMap } from "./parser.js";

export type MergeStrategy = "union" | "intersection" | "a";

/**
 * Merge multiple env maps into a single map using the given strategy.
 *
 * Precedence: files are applied left-to-right, last file wins on conflict.
 */
export function mergeEnvMaps(
  fileMaps: Map<string, EnvMap>,
  strategy: MergeStrategy = "union"
): EnvMap {
  const files = [...fileMaps.keys()];
  const maps = files.map((f) => fileMaps.get(f)!);

  switch (strategy) {
    case "union":
      return mergeUnion(maps);
    case "intersection":
      return mergeIntersection(maps);
    case "a":
      return mergeOnlyA(maps);
  }
}

/**
 * Union: all keys from all files. Last file wins on conflict.
 */
function mergeUnion(maps: EnvMap[]): EnvMap {
  const result: EnvMap = new Map();
  for (const map of maps) {
    for (const [key, value] of map) {
      result.set(key, value);
    }
  }
  return result;
}

/**
 * Intersection: only keys present in ALL files. Last file wins on value.
 */
function mergeIntersection(maps: EnvMap[]): EnvMap {
  if (maps.length === 0) return new Map();

  // Find keys present in all maps
  const keySets = maps.map((m) => new Set(m.keys()));
  const commonKeys = [...keySets[0]].filter((key) =>
    keySets.every((s) => s.has(key))
  );

  const result: EnvMap = new Map();
  for (const key of commonKeys) {
    // Last map's value wins
    const lastValue = maps[maps.length - 1].get(key)!;
    result.set(key, lastValue);
  }
  return result;
}

/**
 * A strategy: only keys from the first file.
 */
function mergeOnlyA(maps: EnvMap[]): EnvMap {
  if (maps.length === 0) return new Map();
  return new Map(maps[0]);
}
