import { Command } from "commander";
import chalk from "chalk";
import * as path from "node:path";
import { readEnvFile, writeEnvFile, resolveEnvPath, discoverEnvFiles } from "../utils/fs.js";

export const getCommand = new Command("get")
  .description("Get a value from an env file")
  .argument("<key>", "Environment variable key")
  .option("--file <path>", "Target file", ".env")
  .action(async (key: string, opts) => {
    const filePath = resolveEnvPath(opts.file);
    const env = await readEnvFile(filePath);
    const value = env.get(key);

    if (value === undefined) {
      console.error(chalk.red(`Key "${key}" not found in ${opts.file}`));
      process.exit(1);
    }

    console.log(value);
  });

export const setCommand = new Command("set")
  .description("Set a value in an env file")
  .argument("<assignment>", "KEY=VALUE assignment")
  .option("--file <path>", "Target file", ".env")
  .action(async (assignment: string, opts) => {
    const eqIndex = assignment.indexOf("=");
    if (eqIndex === -1) {
      console.error(chalk.red('Invalid format. Use KEY=VALUE'));
      process.exit(1);
    }

    const key = assignment.slice(0, eqIndex);
    const value = assignment.slice(eqIndex + 1);
    const filePath = resolveEnvPath(opts.file);

    let env;
    try {
      env = await readEnvFile(filePath);
    } catch {
      env = new Map<string, string>();
    }

    const existed = env.has(key);
    env.set(key, value);
    await writeEnvFile(filePath, env);

    console.log(
      chalk.green(`${existed ? "Updated" : "Set"} ${key} in ${opts.file}`)
    );
  });

export const unsetCommand = new Command("unset")
  .description("Remove a key from an env file")
  .argument("<key>", "Environment variable key")
  .option("--file <path>", "Target file(s) — supports glob like .env.*", ".env")
  .action(async (key: string, opts) => {
    const cwd = process.cwd();
    let files: string[];

    if (opts.file.includes("*")) {
      // Glob pattern — find matching files
      const allFiles = await discoverEnvFiles(cwd);
      const pattern = opts.file.replace("*", ".*");
      const regex = new RegExp(`^${pattern}$`);
      files = allFiles.filter((f) => regex.test(f));
    } else {
      files = [opts.file];
    }

    for (const file of files) {
      const filePath = path.resolve(cwd, file);
      try {
        const env = await readEnvFile(filePath);
        if (env.has(key)) {
          env.delete(key);
          await writeEnvFile(filePath, env);
          console.log(chalk.green(`Removed ${key} from ${file}`));
        } else {
          console.log(chalk.yellow(`Key "${key}" not found in ${file}`));
        }
      } catch {
        console.error(chalk.red(`Could not read ${file}`));
      }
    }
  });
