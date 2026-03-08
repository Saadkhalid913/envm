import { Command } from "commander";
import chalk from "chalk";
import { readEnvFile, resolveEnvPath } from "../utils/fs.js";
import { diffEnvMaps, type DiffResult, type SetFilter } from "../core/differ.js";
import { quoteValue } from "../core/writer.js";
import { createTable, truncate, computeColumnWidths } from "../utils/format.js";
import type { EnvMap } from "../core/parser.js";

export const diffCommand = new Command("diff")
  .alias("compare")
  .description("Compare two or more env files using set operations")
  .argument("<files...>", "Env files to compare (at least 2)")
  .option("--only <filter>", "Set operation filter (union, intersection, diff, xor, a, b, ...)", "union")
  .option("--format <type>", "Output format: table or json", "table")
  .action(async (files: string[], opts) => {
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

function printTable(result: DiffResult): void {
  const { keyWidth, valueWidth, statusWidth, headerWidth } =
    computeColumnWidths(result.files.length);

  const headers = [
    "Key",
    ...result.files.map((f) => truncate(f, headerWidth - 2)),
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

    for (const file of result.files) {
      const val = entry.values[file];
      if (val === undefined) {
        row.push(chalk.dim("—"));
      } else {
        row.push(truncate(quoteValue(val), valueWidth - 2));
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
