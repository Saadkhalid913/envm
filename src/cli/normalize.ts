import { Command } from "commander";
import chalk from "chalk";
import { readEnvFile, resolveEnvPath } from "../utils/fs.js";
import { writeEnv } from "../core/writer.js";

export const normalizeCommand = new Command("normalize")
  .description("Output a normalized version of an env file (sorted, no comments/whitespace)")
  .argument("<file>", "Env file to normalize")
  .action(async (file: string) => {
    const filePath = resolveEnvPath(file);
    let env;
    try {
      env = await readEnvFile(filePath);
    } catch {
      console.error(chalk.red(`Could not read file: ${file}`));
      process.exit(1);
    }

    process.stdout.write(writeEnv(env));
  });
