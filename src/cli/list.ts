import { Command } from "commander";
import * as path from "node:path";
import { discoverEnvFiles, readEnvFile } from "../utils/fs.js";

export const listCommand = new Command("list")
  .alias("ls")
  .description("List all .env* files in the current directory")
  .action(async () => {
    const cwd = process.cwd();
    const files = await discoverEnvFiles(cwd);

    if (files.length === 0) {
      console.log("No .env files found.");
      return;
    }

    for (const file of files) {
      const env = await readEnvFile(path.resolve(cwd, file));
      const count = env.size;
      const padding = 24 - file.length;
      console.log(
        `  ${file}${" ".repeat(Math.max(padding, 2))}${count} var${count !== 1 ? "s" : ""}`
      );
    }
  });
