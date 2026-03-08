import { Command } from "commander";
import chalk from "chalk";
import { initEnvm, isInitialized, getEnvmDir } from "../storage/config.js";
import { discoverEnvFiles, readEnvFile } from "../utils/fs.js";
import { inferSchema } from "../core/schema-inferrer.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const initCommand = new Command("init")
  .description("Initialize envm in the current project")
  .option("--schema", "Auto-generate a schema from current .env* files")
  .action(async (opts) => {
    const cwd = process.cwd();

    if (await isInitialized(cwd)) {
      console.log(chalk.yellow("envm is already initialized in this project."));
      return;
    }

    await initEnvm(cwd);
    console.log(chalk.green("Initialized .envm/ directory."));

    const envFiles = await discoverEnvFiles(cwd);
    if (envFiles.length > 0) {
      console.log(`\nFound ${envFiles.length} env file(s):`);
      for (const f of envFiles) {
        console.log(`  ${f}`);
      }
    } else {
      console.log("\nNo .env files found in the current directory.");
    }

    if (opts.schema && envFiles.length > 0) {
      const maps = await Promise.all(
        envFiles.map((f) => readEnvFile(path.resolve(cwd, f)))
      );
      const schema = inferSchema(maps);
      const schemaPath = path.join(getEnvmDir(cwd), "schema.json");
      await fs.writeFile(
        schemaPath,
        JSON.stringify(schema, null, 2) + "\n",
        "utf-8"
      );
      console.log(
        chalk.green(`\nGenerated schema with ${Object.keys(schema.rules).length} rules → .envm/schema.json`)
      );
    }
  });
