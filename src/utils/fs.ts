import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseEnv, type EnvMap } from "../core/parser.js";

/**
 * Discover all .env* files in the given directory.
 */
export async function discoverEnvFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => f === ".env" || f.startsWith(".env."))
    .sort();
}

/**
 * Read and parse an env file, returning its key-value map.
 */
export async function readEnvFile(filePath: string): Promise<EnvMap> {
  const content = await fs.readFile(filePath, "utf-8");
  return parseEnv(content);
}

/**
 * Write an env map to a file using normalized output.
 */
export async function writeEnvFile(
  filePath: string,
  env: EnvMap
): Promise<void> {
  const { writeEnv } = await import("../core/writer.js");
  await fs.writeFile(filePath, writeEnv(env), "utf-8");
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Resolve a file path relative to cwd.
 */
export function resolveEnvPath(file: string, cwd?: string): string {
  return path.resolve(cwd ?? process.cwd(), file);
}
