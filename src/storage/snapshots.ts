import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getEnvmDir } from "./config.js";
import { discoverEnvFiles, readEnvFile, fileExists } from "../utils/fs.js";
import { writeEnv } from "../core/writer.js";
import type { EnvMap } from "../core/parser.js";

export interface Snapshot {
  name: string;
  created_at: string;
  files: Record<string, Record<string, string>>;
}

function snapshotsDir(cwd?: string): string {
  return path.join(getEnvmDir(cwd), "snapshots");
}

function snapshotPath(name: string, cwd?: string): string {
  return path.join(snapshotsDir(cwd), `${name}.json`);
}

export async function saveSnapshot(
  name: string,
  specificFiles?: string[],
  cwd?: string
): Promise<Snapshot> {
  const dir = cwd ?? process.cwd();
  const files = specificFiles ?? (await discoverEnvFiles(dir));
  const snapshot: Snapshot = {
    name,
    created_at: new Date().toISOString(),
    files: {},
  };

  for (const file of files) {
    const filePath = path.resolve(dir, file);
    if (await fileExists(filePath)) {
      const env = await readEnvFile(filePath);
      snapshot.files[file] = Object.fromEntries(env);
    }
  }

  await fs.writeFile(
    snapshotPath(name, cwd),
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf-8"
  );

  return snapshot;
}

export async function listSnapshots(cwd?: string): Promise<Snapshot[]> {
  const dir = snapshotsDir(cwd);
  if (!(await fileExists(dir))) return [];

  const entries = await fs.readdir(dir);
  const snapshots: Snapshot[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const content = await fs.readFile(path.join(dir, entry), "utf-8");
    snapshots.push(JSON.parse(content));
  }

  return snapshots.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getSnapshot(
  name: string,
  cwd?: string
): Promise<Snapshot | null> {
  const p = snapshotPath(name, cwd);
  if (!(await fileExists(p))) return null;
  const content = await fs.readFile(p, "utf-8");
  return JSON.parse(content);
}

export async function restoreSnapshot(
  name: string,
  specificFile?: string,
  cwd?: string
): Promise<string[]> {
  const snapshot = await getSnapshot(name, cwd);
  if (!snapshot) throw new Error(`Snapshot "${name}" not found`);

  const dir = cwd ?? process.cwd();
  const restoredFiles: string[] = [];

  for (const [file, entries] of Object.entries(snapshot.files)) {
    if (specificFile && file !== specificFile) continue;

    const env: EnvMap = new Map(Object.entries(entries));
    const filePath = path.resolve(dir, file);
    await fs.writeFile(filePath, writeEnv(env), "utf-8");
    restoredFiles.push(file);
  }

  return restoredFiles;
}

export async function deleteSnapshot(
  name: string,
  cwd?: string
): Promise<void> {
  const p = snapshotPath(name, cwd);
  if (!(await fileExists(p)))
    throw new Error(`Snapshot "${name}" not found`);
  await fs.unlink(p);
}
