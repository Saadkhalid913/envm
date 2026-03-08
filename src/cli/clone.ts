import { Command } from "commander";
import chalk from "chalk";
import { readEnvFile, writeEnvFile, resolveEnvPath } from "../utils/fs.js";

export const cloneCommand = new Command("clone")
  .alias("cp")
  .description("Duplicate an env file, optionally modifying keys")
  .argument("<source>", "Source env file")
  .argument("<dest>", "Destination env file")
  .option("--set <pairs...>", "Override or add KEY=VALUE pairs")
  .option("--unset <keys...>", "Remove keys (comma-separated)")
  .action(async (source: string, dest: string, opts) => {
    const sourcePath = resolveEnvPath(source);
    let env;
    try {
      env = await readEnvFile(sourcePath);
    } catch {
      console.error(chalk.red(`Could not read file: ${source}`));
      process.exit(1);
    }

    // Apply --set
    if (opts.set) {
      for (const pair of opts.set) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) {
          console.error(chalk.red(`Invalid --set format: ${pair}. Use KEY=VALUE`));
          process.exit(1);
        }
        env.set(pair.slice(0, eqIdx), pair.slice(eqIdx + 1));
      }
    }

    // Apply --unset
    if (opts.unset) {
      for (const keySpec of opts.unset) {
        for (const key of keySpec.split(",")) {
          env.delete(key.trim());
        }
      }
    }

    await writeEnvFile(resolveEnvPath(dest), env);
    console.log(chalk.green(`Cloned ${source} → ${dest} (${env.size} keys)`));
  });
