import { Command } from "commander";
import chalk from "chalk";
import {
  saveSnapshot,
  listSnapshots,
  getSnapshot,
  restoreSnapshot,
  deleteSnapshot,
} from "../storage/snapshots.js";
import { isInitialized } from "../storage/config.js";

export const snapshotCommand = new Command("snapshot")
  .alias("snap")
  .description("Named snapshots of env file state");

snapshotCommand
  .command("save")
  .description("Save a snapshot of current env files")
  .argument("<name>", "Snapshot name")
  .argument("[files...]", "Specific files to snapshot (default: all .env*)")
  .action(async (name: string, files: string[]) => {
    if (!(await isInitialized())) {
      console.error(chalk.red("envm not initialized. Run 'envm init' first."));
      process.exit(1);
    }

    const specificFiles = files.length > 0 ? files : undefined;
    const snapshot = await saveSnapshot(name, specificFiles);
    const fileCount = Object.keys(snapshot.files).length;
    console.log(
      chalk.green(`Saved snapshot "${name}" (${fileCount} file${fileCount !== 1 ? "s" : ""})`)
    );
  });

snapshotCommand
  .command("list")
  .description("List all snapshots")
  .action(async () => {
    const snapshots = await listSnapshots();
    if (snapshots.length === 0) {
      console.log("No snapshots found.");
      return;
    }

    for (const snap of snapshots) {
      const fileCount = Object.keys(snap.files).length;
      const date = new Date(snap.created_at).toLocaleString();
      console.log(
        `  ${chalk.bold(snap.name)}  ${fileCount} file${fileCount !== 1 ? "s" : ""}  ${chalk.dim(date)}`
      );
    }
  });

snapshotCommand
  .command("show")
  .description("Display contents of a snapshot")
  .argument("<name>", "Snapshot name")
  .action(async (name: string) => {
    const snapshot = await getSnapshot(name);
    if (!snapshot) {
      console.error(chalk.red(`Snapshot "${name}" not found.`));
      process.exit(1);
    }

    console.log(chalk.bold(`Snapshot: ${snapshot.name}`));
    console.log(chalk.dim(`Created: ${new Date(snapshot.created_at).toLocaleString()}`));
    console.log();

    for (const [file, entries] of Object.entries(snapshot.files)) {
      console.log(chalk.cyan(`  ${file}:`));
      for (const [key, value] of Object.entries(entries)) {
        console.log(`    ${key}=${value}`);
      }
      console.log();
    }
  });

snapshotCommand
  .command("restore")
  .description("Restore files from a snapshot")
  .argument("<name>", "Snapshot name")
  .option("--file <name>", "Restore only a specific file")
  .option("--dry-run", "Show what would change without writing")
  .action(async (name: string, opts) => {
    const snapshot = await getSnapshot(name);
    if (!snapshot) {
      console.error(chalk.red(`Snapshot "${name}" not found.`));
      process.exit(1);
    }

    if (opts.dryRun) {
      console.log(chalk.cyan("Dry run — would restore:"));
      for (const file of Object.keys(snapshot.files)) {
        if (opts.file && file !== opts.file) continue;
        const keyCount = Object.keys(snapshot.files[file]).length;
        console.log(`  ${file} (${keyCount} keys)`);
      }
      return;
    }

    const restored = await restoreSnapshot(name, opts.file);
    console.log(
      chalk.green(`Restored ${restored.length} file${restored.length !== 1 ? "s" : ""} from "${name}"`)
    );
    for (const f of restored) {
      console.log(`  ${f}`);
    }
  });

snapshotCommand
  .command("delete")
  .description("Delete a snapshot")
  .argument("<name>", "Snapshot name")
  .action(async (name: string) => {
    try {
      await deleteSnapshot(name);
      console.log(chalk.green(`Deleted snapshot "${name}".`));
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });
