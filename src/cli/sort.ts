import { Command } from "commander";
import chalk from "chalk";
import { readEnvFile, writeEnvFile, resolveEnvPath } from "../utils/fs.js";

export const sortCommand = new Command("sort")
  .description("Sort an env file alphabetically (normalize)")
  .argument("<file>", "Env file to sort")
  .option("-o, --output <file>", "Output file (default: overwrite in place)")
  .action(async (file: string, opts) => {
    const filePath = resolveEnvPath(file);
    let env;
    try {
      env = await readEnvFile(filePath);
    } catch {
      console.error(chalk.red(`Could not read file: ${file}`));
      process.exit(1);
    }

    const outputPath = opts.output
      ? resolveEnvPath(opts.output)
      : filePath;

    await writeEnvFile(outputPath, env);

    const target = opts.output ?? file;
    console.log(chalk.green(`Sorted ${env.size} keys → ${target}`));
  });
