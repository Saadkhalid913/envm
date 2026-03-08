import { Command } from "commander";
import chalk from "chalk";
import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateCommand = new Command("update")
  .description("Update envm to the latest version")
  .action(() => {
    // Walk up from dist/cli/ to find the install root
    const installDir = path.resolve(__dirname, "..", "..");
    const updateScript = path.join(installDir, "update.sh");

    if (!fs.existsSync(updateScript)) {
      console.error(chalk.red("update.sh not found in install directory."));
      console.error(
        chalk.dim(
          `Expected at: ${updateScript}\nIf you installed via npm, update with: npm update -g envm`
        )
      );
      process.exit(1);
    }

    try {
      execSync(`bash "${updateScript}"`, {
        stdio: "inherit",
        env: { ...process.env, ENVM_INSTALL_DIR: installDir },
      });
    } catch (err) {
      process.exit((err as { status?: number }).status ?? 1);
    }
  });
