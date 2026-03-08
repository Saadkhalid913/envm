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
 * Strategy: fit the table to exactly the terminal width.
 * - Status column: compact (just enough for longest status label)
 * - Key column: proportional but capped
 * - Value columns: split all remaining space equally
 */
export function computeColumnWidths(
  fileCount: number,
  longestKey: number = 20,
  longestStatus: number = 15
): {
  keyWidth: number;
  valueWidth: number;
  statusWidth: number;
} {
  const termWidth = getTerminalWidth();
  const totalColumns = fileCount + 2; // Key + N files + Status
  // cli-table3: 1 border char per column boundary + 1 padding char each side
  const borderOverhead = (totalColumns + 1) + (totalColumns * 2);

  const available = termWidth - borderOverhead;

  // Status: just enough for the content + small padding
  const statusWidth = Math.min(longestStatus + 4, Math.floor(available * 0.25));

  // Key: enough for the longest key, but capped at 25% of available
  const keyWidth = Math.min(
    Math.max(longestKey + 2, 12),
    Math.floor(available * 0.25)
  );

  // Values: split ALL remaining space equally across file columns
  const remaining = available - keyWidth - statusWidth;
  const valueWidth = Math.max(8, Math.floor(remaining / fileCount));

  return { keyWidth, valueWidth, statusWidth };
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
