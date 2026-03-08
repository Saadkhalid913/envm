import { Command } from "commander";
import chalk from "chalk";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { readEnvFile, resolveEnvPath, fileExists } from "../utils/fs.js";
import { validateEnv, type Schema, type ValidationResult } from "../core/validator.js";
import { getEnvmDir } from "../storage/config.js";

export const validateCommand = new Command("validate")
  .description("Validate env files against a schema")
  .argument("<files...>", "Env files to validate")
  .option("--schema <path>", "Path to schema file")
  .option("--strict", "Treat unknown keys as errors")
  .option("--format <type>", "Output format: text or json", "text")
  .action(async (files: string[], opts) => {
    // Resolve schema path
    const schemaPath = opts.schema
      ? resolveEnvPath(opts.schema)
      : path.join(getEnvmDir(), "schema.json");

    if (!(await fileExists(schemaPath))) {
      console.error(
        chalk.red(
          `Schema not found: ${opts.schema ?? ".envm/schema.json"}\nRun 'envm schema generate <file>' to create one.`
        )
      );
      process.exit(1);
    }

    const schemaContent = await fs.readFile(schemaPath, "utf-8");
    const schema: Schema = JSON.parse(schemaContent);

    let hasErrors = false;

    for (const file of files) {
      const filePath = resolveEnvPath(file);
      let env;
      try {
        env = await readEnvFile(filePath);
      } catch {
        console.error(chalk.red(`Could not read file: ${file}`));
        hasErrors = true;
        continue;
      }

      const result = validateEnv(env, schema, opts.strict);

      if (opts.format === "json") {
        console.log(JSON.stringify({ file, ...result }, null, 2));
      } else {
        printValidation(file, result, schemaPath);
      }

      if (!result.valid) hasErrors = true;
    }

    if (hasErrors) process.exit(1);
  });

function printValidation(
  file: string,
  result: ValidationResult,
  schemaPath: string
): void {
  console.log(
    `Validating ${file} against ${path.basename(schemaPath)}...\n`
  );

  for (const issue of result.issues) {
    const icon =
      issue.severity === "error"
        ? chalk.red("\u2717")
        : chalk.yellow("\u26A0");
    console.log(`  ${icon} ${issue.key}: ${issue.message}`);
  }

  // Show valid keys that aren't in the issues
  // (We just show the summary for brevity)

  console.log(
    `\nResult: ${result.errorCount} error${result.errorCount !== 1 ? "s" : ""}, ${result.warningCount} warning${result.warningCount !== 1 ? "s" : ""}`
  );

  if (result.valid) {
    console.log(chalk.green("Validation passed."));
  }
  console.log();
}
