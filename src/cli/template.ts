import { Command } from "commander";
import chalk from "chalk";
import * as fs from "node:fs/promises";
import { readEnvFile, resolveEnvPath } from "../utils/fs.js";

export const templateCommand = new Command("template")
  .description("Generate a .env.example or template from a real env file")
  .argument("<file>", "Source env file")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option("--placeholder", "Generate placeholder hints based on key names")
  .option("--keep-defaults", "Preserve non-sensitive values (booleans, ports, localhost)")
  .action(async (file: string, opts) => {
    const filePath = resolveEnvPath(file);
    let env;
    try {
      env = await readEnvFile(filePath);
    } catch {
      console.error(chalk.red(`Could not read file: ${file}`));
      process.exit(1);
    }

    const keys = [...env.keys()].sort();
    const lines: string[] = [];

    for (const key of keys) {
      const value = env.get(key)!;
      let templateValue = "";

      if (opts.keepDefaults && isNonSensitive(key, value)) {
        templateValue = value;
      } else if (opts.placeholder) {
        templateValue = generatePlaceholder(key, value);
      }

      lines.push(`${key}=${templateValue}`);
    }

    const output = lines.join("\n") + "\n";

    if (opts.output) {
      await fs.writeFile(resolveEnvPath(opts.output), output, "utf-8");
      console.log(chalk.green(`Template written to ${opts.output} (${keys.length} keys)`));
    } else {
      process.stdout.write(output);
    }
  });

function isNonSensitive(key: string, value: string): boolean {
  const lowerKey = key.toLowerCase();

  // Booleans
  if (["true", "false", "1", "0", "yes", "no"].includes(value.toLowerCase())) {
    return true;
  }

  // Ports (numeric, small value)
  if (lowerKey.includes("port") && /^\d+$/.test(value)) {
    return true;
  }

  // localhost values
  if (value === "localhost" || value.includes("localhost")) {
    return true;
  }

  // Common non-sensitive keys
  if (["node_env", "log_level", "debug"].includes(lowerKey)) {
    return true;
  }

  return false;
}

function generatePlaceholder(key: string, value: string): string {
  const lowerKey = key.toLowerCase();

  // URL-like
  if (lowerKey.includes("url") || lowerKey.includes("uri")) {
    if (lowerKey.includes("database") || lowerKey.includes("db")) {
      return "postgresql://user:password@host:5432/dbname";
    }
    if (lowerKey.includes("redis")) {
      return "redis://localhost:6379";
    }
    return "https://example.com";
  }

  // API keys/secrets
  if (
    lowerKey.includes("key") ||
    lowerKey.includes("secret") ||
    lowerKey.includes("token")
  ) {
    return `your-${key.toLowerCase().replace(/_/g, "-")}-here`;
  }

  // Port
  if (lowerKey.includes("port")) return "3000";

  // Boolean
  if (
    lowerKey.includes("debug") ||
    lowerKey.includes("enable") ||
    lowerKey.includes("disable")
  ) {
    return "true|false";
  }

  // Email
  if (lowerKey.includes("email")) return "user@example.com";

  // Host
  if (lowerKey.includes("host")) return "localhost";

  return "";
}
