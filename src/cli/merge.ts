import { Command } from "commander";
import chalk from "chalk";
import { readEnvFile, writeEnvFile, resolveEnvPath } from "../utils/fs.js";
import { mergeEnvMaps, type MergeStrategy } from "../core/merger.js";
import { writeEnv } from "../core/writer.js";
import type { EnvMap } from "../core/parser.js";

export const mergeCommand = new Command("merge")
  .description("Merge two or more env files into a single output")
  .argument("<files...>", "Env files to merge (at least 2)")
  .option("-o, --output <file>", "Output file path")
  .option("--stdout", "Write to stdout instead of file")
  .option("--strategy <name>", "Merge strategy: union, intersection, a", "union")
  .option("--dry-run", "Show what would be written without writing")
  .action(async (files: string[], opts) => {
    if (files.length < 2) {
      console.error(chalk.red("At least 2 files are required for merge."));
      process.exit(1);
    }

    if (!opts.output && !opts.stdout && !opts.dryRun) {
      console.error(chalk.red("Specify --output <file> or --stdout."));
      process.exit(1);
    }

    const strategy = opts.strategy as MergeStrategy;
    if (!["union", "intersection", "a"].includes(strategy)) {
      console.error(chalk.red(`Unknown strategy: ${strategy}`));
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

    const merged = mergeEnvMaps(fileMaps, strategy);
    const output = writeEnv(merged);

    if (opts.dryRun) {
      console.log(chalk.cyan("Dry run — would write:"));
      console.log(output);
      return;
    }

    if (opts.stdout) {
      process.stdout.write(output);
      return;
    }

    await writeEnvFile(resolveEnvPath(opts.output), merged);
    console.log(
      chalk.green(`Merged ${files.length} files → ${opts.output} (${merged.size} keys, strategy: ${strategy})`)
    );
  });
