import { Command } from "commander";
import chalk, { type ChalkInstance } from "chalk";
import { readEnvFile, resolveEnvPath, expandEnvGlobs } from "../utils/fs.js";
import { diffEnvMaps, type DiffResult, type DiffEntry, type SetFilter } from "../core/differ.js";
import { quoteValue } from "../core/writer.js";
import { createTable, truncate, computeColumnWidths } from "../utils/format.js";
import type { EnvMap } from "../core/parser.js";

export const diffCommand = new Command("diff")
  .alias("compare")
  .description("Compare two or more env files using set operations")
  .argument("<files...>", "Env files to compare (supports globs like .env.*)")
  .option("--only <filter>", "Set operation filter (union, intersection, diff, xor, a, b, ...)", "union")
  .option("--format <type>", "Output format: table or json", "table")
  .action(async (rawFiles: string[], opts) => {
    // Expand globs
    let files: string[];
    try {
      files = await expandEnvGlobs(rawFiles);
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }

    if (files.length < 2) {
      console.error(chalk.red("At least 2 files are required for comparison."));
      process.exit(1);
    }

    const fileMaps = new Map<string, EnvMap>();
    for (const file of files) {
      const filePath = resolveEnvPath(file);
      try {
        fileMaps.set(file, await readEnvFile(filePath));
      } catch {
        console.error(chalk.red(`Could not read file: ${file}`));
        process.exit(1);
      }
    }

    const result = diffEnvMaps(fileMaps, opts.only as SetFilter);

    if (opts.format === "json") {
      printJson(result);
    } else {
      printTable(result);
    }
  });

// Muted, distinct colors for value grouping — easy on dark terminals
const VALUE_GROUP_COLORS: ChalkInstance[] = [
  chalk.green,
  chalk.red,
  chalk.yellow,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
];

/**
 * For a row with "differs" status, group file values by equality
 * and assign a color to each group. Returns a map from file -> color function.
 *
 * If all present values are the same, no coloring is applied.
 * Missing values (undefined) get chalk.dim.
 */
function getValueColors(
  entry: DiffEntry,
  files: string[]
): Map<string, ChalkInstance> {
  const colorMap = new Map<string, ChalkInstance>();

  if (entry.status !== "differs") {
    return colorMap;
  }

  // Group files by their value
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const val = entry.values[file];
    if (val === undefined) continue;
    const existing = groups.get(val);
    if (existing) {
      existing.push(file);
    } else {
      groups.set(val, [file]);
    }
  }

  // Only color if there are 2+ distinct values
  if (groups.size < 2) return colorMap;

  let colorIdx = 0;
  for (const [, groupFiles] of groups) {
    const color = VALUE_GROUP_COLORS[colorIdx % VALUE_GROUP_COLORS.length];
    for (const file of groupFiles) {
      colorMap.set(file, color);
    }
    colorIdx++;
  }

  return colorMap;
}

function printTable(result: DiffResult): void {
  // Compute longest key and status string for sizing
  let longestKey = 3; // "Key"
  let longestStatus = 6; // "Status"

  for (const entry of result.entries) {
    longestKey = Math.max(longestKey, entry.key.length);
    if (entry.status === "only_in") {
      const statusStr = `only in ${entry.presentIn.join(", ")}`;
      longestStatus = Math.max(longestStatus, statusStr.length);
    }
  }

  const { keyWidth, valueWidth, statusWidth } =
    computeColumnWidths(result.files.length, longestKey, longestStatus);

  const headers = [
    "Key",
    ...result.files.map((f) => truncate(f, valueWidth - 2)),
    "Status",
  ];
  const colWidths = [
    keyWidth,
    ...result.files.map(() => valueWidth),
    statusWidth,
  ];
  const table = createTable(headers, colWidths);

  for (const entry of result.entries) {
    const row: string[] = [truncate(entry.key, keyWidth - 2)];
    const valueColors = getValueColors(entry, result.files);

    for (const file of result.files) {
      const val = entry.values[file];
      if (val === undefined) {
        row.push(chalk.dim("—"));
      } else {
        const display = truncate(quoteValue(val), valueWidth - 2);
        const colorFn = valueColors.get(file);
        row.push(colorFn ? colorFn(display) : display);
      }
    }

    switch (entry.status) {
      case "same":
        row.push(chalk.green("\u2713 same"));
        break;
      case "differs":
        row.push(chalk.yellow("\u26A0 differs"));
        break;
      case "only_in":
        row.push(chalk.cyan(`only in ${entry.presentIn.join(", ")}`));
        break;
    }

    table.push(row);
  }

  console.log(table.toString());

  // Summary
  console.log("\nSummary:");
  const { summary } = result;
  const shared = summary.sharedSame + summary.sharedDiffer;
  if (shared > 0) {
    console.log(
      `  ${shared} shared key${shared !== 1 ? "s" : ""} (${summary.sharedDiffer} differ, ${summary.sharedSame} same)`
    );
  }
  for (const [file, count] of Object.entries(summary.exclusive)) {
    if (count > 0) {
      console.log(`  ${count} only in ${file}`);
    }
  }
}

function printJson(result: DiffResult): void {
  const output: Record<string, unknown> = {
    files: result.files,
    keys: {} as Record<string, unknown>,
    summary: {
      total_unique_keys: result.summary.totalUniqueKeys,
      shared_same: result.summary.sharedSame,
      shared_differ: result.summary.sharedDiffer,
      exclusive: result.summary.exclusive,
    },
  };

  const keys = output.keys as Record<string, unknown>;
  for (const entry of result.entries) {
    const values: Record<string, string> = {};
    for (const [file, val] of Object.entries(entry.values)) {
      if (val !== undefined) values[file] = val;
    }

    if (entry.status === "only_in") {
      keys[entry.key] = {
        status: "only_in",
        present_in: entry.presentIn,
        values,
      };
    } else {
      keys[entry.key] = {
        status: entry.status,
        values,
      };
    }
  }

  console.log(JSON.stringify(output, null, 2));
}
