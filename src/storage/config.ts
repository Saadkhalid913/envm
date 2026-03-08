import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ensureDir, fileExists } from "../utils/fs.js";

const ENVM_DIR = ".envm";
const CONFIG_FILE = "config.json";

export interface EnvmConfig {
  version: string;
  schema?: string;
}

const DEFAULT_CONFIG: EnvmConfig = {
  version: "1.0.0",
};

export function getEnvmDir(cwd?: string): string {
  return path.resolve(cwd ?? process.cwd(), ENVM_DIR);
}

export async function isInitialized(cwd?: string): Promise<boolean> {
  return fileExists(getEnvmDir(cwd));
}

export async function initEnvm(cwd?: string): Promise<void> {
  const dir = getEnvmDir(cwd);
  await ensureDir(dir);
  await ensureDir(path.join(dir, "snapshots"));
  const configPath = path.join(dir, CONFIG_FILE);
  if (!(await fileExists(configPath))) {
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n", "utf-8");
  }
}

export async function readConfig(cwd?: string): Promise<EnvmConfig> {
  const configPath = path.join(getEnvmDir(cwd), CONFIG_FILE);
  if (!(await fileExists(configPath))) return DEFAULT_CONFIG;
  const content = await fs.readFile(configPath, "utf-8");
  return JSON.parse(content);
}
