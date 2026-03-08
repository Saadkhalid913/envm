import type { EnvMap } from "./parser.js";

export type DiffStatus = "same" | "differs" | "only_in";

export interface DiffEntry {
  key: string;
  status: DiffStatus;
  values: Record<string, string | undefined>;
  presentIn: string[];
}

export interface DiffResult {
  files: string[];
  entries: DiffEntry[];
  summary: {
    totalUniqueKeys: number;
    sharedSame: number;
    sharedDiffer: number;
    exclusive: Record<string, number>;
  };
}

export type SetFilter =
  | "union"
  | "intersection"
  | "diff"
  | "xor"
  | string; // file label like "a", "b", "a,b"

/**
 * Compare two or more env maps and produce a diff result.
 */
export function diffEnvMaps(
  fileMaps: Map<string, EnvMap>,
  filter: SetFilter = "union"
): DiffResult {
  const files = [...fileMaps.keys()];
  const allKeys = new Set<string>();

  for (const env of fileMaps.values()) {
    for (const key of env.keys()) {
      allKeys.add(key);
    }
  }

  const entries: DiffEntry[] = [];
  let sharedSame = 0;
  let sharedDiffer = 0;
  const exclusive: Record<string, number> = {};
  for (const f of files) exclusive[f] = 0;

  for (const key of [...allKeys].sort()) {
    const values: Record<string, string | undefined> = {};
    const presentIn: string[] = [];

    for (const file of files) {
      const env = fileMaps.get(file)!;
      if (env.has(key)) {
        values[file] = env.get(key)!;
        presentIn.push(file);
      } else {
        values[file] = undefined;
      }
    }

    let status: DiffStatus;
    if (presentIn.length === files.length) {
      const vals = presentIn.map((f) => values[f]);
      if (vals.every((v) => v === vals[0])) {
        status = "same";
        sharedSame++;
      } else {
        status = "differs";
        sharedDiffer++;
      }
    } else {
      status = "only_in";
      for (const f of presentIn) {
        exclusive[f]++;
      }
    }

    entries.push({ key, status, values, presentIn });
  }

  // Apply filter
  const filtered = applyFilter(entries, files, filter);

  return {
    files,
    entries: filtered,
    summary: {
      totalUniqueKeys: allKeys.size,
      sharedSame,
      sharedDiffer,
      exclusive,
    },
  };
}

function applyFilter(
  entries: DiffEntry[],
  files: string[],
  filter: SetFilter
): DiffEntry[] {
  switch (filter) {
    case "union":
      return entries;

    case "intersection":
      return entries.filter((e) => e.presentIn.length === files.length);

    case "diff":
      return entries.filter((e) => e.status !== "same");

    case "xor":
      return entries.filter(
        (e) =>
          e.status === "only_in" &&
          e.presentIn.length === 1
      );

    default: {
      // File label filter: "a", "b", "a,b" etc.
      const labels = filter.split(",").map((l) => l.trim().toLowerCase());
      const labelToFile = new Map<string, string>();
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      files.forEach((f, i) => {
        if (i < alphabet.length) labelToFile.set(alphabet[i], f);
      });

      // "only in" the specified files
      const targetFiles = new Set(
        labels.map((l) => labelToFile.get(l)).filter(Boolean) as string[]
      );

      if (targetFiles.size === 0) return entries;

      return entries.filter((e) => {
        const presentSet = new Set(e.presentIn);
        // Key must be present in ALL target files and ABSENT from all others
        for (const t of targetFiles) {
          if (!presentSet.has(t)) return false;
        }
        for (const f of files) {
          if (!targetFiles.has(f) && presentSet.has(f)) return false;
        }
        return true;
      });
    }
  }
}
