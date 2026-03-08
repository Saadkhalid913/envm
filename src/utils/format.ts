import Table from "cli-table3";
import chalk from "chalk";

export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Compute column widths for a diff table that fills the terminal.
 *
 * Layout: | Key | file1 | file2 | ... | Status |
 *
 * Key column: 20% of available space (min 10)
 * Status column: fixed based on longest status string (~25)
 * File value columns: split remaining space equally
 */
export function computeColumnWidths(fileCount: number): {
  keyWidth: number;
  valueWidth: number;
  statusWidth: number;
  headerWidth: number;
} {
  const termWidth = getTerminalWidth();
  const totalColumns = fileCount + 2; // Key + N files + Status
  // cli-table3 uses 3 chars per border (│ + space padding on each side)
  const borderOverhead = totalColumns + 1 + totalColumns * 2;

  const available = termWidth - borderOverhead;

  const statusWidth = 25;
  const keyWidth = Math.max(10, Math.floor(available * 0.18));
  const remaining = available - keyWidth - statusWidth;
  const valueWidth = Math.max(8, Math.floor(remaining / fileCount));
  const headerWidth = valueWidth;

  return { keyWidth, valueWidth, statusWidth, headerWidth };
}

export function createTable(
  headers: string[],
  colWidths?: number[]
): Table.Table {
  const opts: Table.TableConstructorOptions = {
    head: headers.map((h) => chalk.bold(h)),
    style: {
      head: [],
      border: [],
    },
  };

  if (colWidths) {
    opts.colWidths = colWidths;
    opts.wordWrap = true;
  }

  return new Table(opts);
}

export function truncate(s: string, maxLen: number): string {
  if (maxLen <= 0) return s;
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "\u2026";
}
