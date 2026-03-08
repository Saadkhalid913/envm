import Table from "cli-table3";
import chalk from "chalk";

export interface TableColumn {
  header: string;
  key: string;
}

export function createTable(headers: string[]): Table.Table {
  return new Table({
    head: headers.map((h) => chalk.bold(h)),
    style: {
      head: [],
      border: [],
    },
  });
}

export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "\u2026";
}
