import { Command } from "commander";
import chalk from "chalk";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { readEnvFile, resolveEnvPath } from "../utils/fs.js";
import { inferSchema } from "../core/schema-inferrer.js";
import { getEnvmDir } from "../storage/config.js";
import { ensureDir } from "../utils/fs.js";

export const schemaCommand = new Command("schema")
  .description("Generate or manage the validation schema");

schemaCommand
  .command("generate")
  .description("Infer schema from existing env files")
  .argument("<files...>", "Env files to infer schema from")
  .action(async (files: string[]) => {
    const maps = [];
    for (const file of files) {
      try {
        maps.push(await readEnvFile(resolveEnvPath(file)));
      } catch {
        console.error(chalk.red(`Could not read file: ${file}`));
        process.exit(1);
      }
    }

    const schema = inferSchema(maps);
    const envmDir = getEnvmDir();
    await ensureDir(envmDir);

    const schemaPath = path.join(envmDir, "schema.json");
    await fs.writeFile(
      schemaPath,
      JSON.stringify(schema, null, 2) + "\n",
      "utf-8"
    );

    console.log(
      chalk.green(
        `Generated schema with ${Object.keys(schema.rules).length} rules → .envm/schema.json`
      )
    );
  });
