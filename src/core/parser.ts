export type EnvMap = Map<string, string>;

/**
 * Parse a .env file string into a key-value map.
 *
 * Supports:
 * - KEY=VALUE
 * - export KEY=VALUE
 * - KEY="VALUE" (double-quoted, with multiline)
 * - KEY='VALUE' (single-quoted)
 * - Inline comments after unquoted values (` # comment`)
 * - Blank lines and #-prefixed comments are ignored
 * - Variable interpolation is NOT resolved (literal strings)
 */
export function parseEnv(content: string): EnvMap {
  const result: EnvMap = new Map();
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip blank lines and comments
    if (line === "" || line.startsWith("#")) {
      i++;
      continue;
    }

    // Strip optional `export ` prefix
    const stripped = line.startsWith("export ") ? line.slice(7) : line;

    // Find the first `=`
    const eqIndex = stripped.indexOf("=");
    if (eqIndex === -1) {
      i++;
      continue;
    }

    const key = stripped.slice(0, eqIndex).trim();
    let rawValue = stripped.slice(eqIndex + 1);

    if (!isValidKey(key)) {
      i++;
      continue;
    }

    // Double-quoted value (may span multiple lines)
    if (rawValue.trimStart().startsWith('"')) {
      rawValue = rawValue.trimStart().slice(1); // remove opening "
      let value = "";

      // Check if closing quote is on this same line
      const closeIdx = findUnescapedQuote(rawValue);
      if (closeIdx !== -1) {
        value = rawValue.slice(0, closeIdx);
        result.set(key, unescapeDoubleQuoted(value));
        i++;
        continue;
      }

      // Multiline
      value = rawValue;
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        const closeIdx = findUnescapedQuote(nextLine);
        if (closeIdx !== -1) {
          value += "\n" + nextLine.slice(0, closeIdx);
          break;
        }
        value += "\n" + nextLine;
        i++;
      }
      result.set(key, unescapeDoubleQuoted(value));
      i++;
      continue;
    }

    // Single-quoted value
    if (rawValue.trimStart().startsWith("'")) {
      rawValue = rawValue.trimStart().slice(1);
      const closeIdx = rawValue.indexOf("'");
      if (closeIdx !== -1) {
        result.set(key, rawValue.slice(0, closeIdx));
      } else {
        result.set(key, rawValue);
      }
      i++;
      continue;
    }

    // Unquoted value — strip inline comments
    const value = stripInlineComment(rawValue).trim();
    result.set(key, value);
    i++;
  }

  return result;
}

function isValidKey(key: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

function findUnescapedQuote(s: string): number {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      i++; // skip escaped char
      continue;
    }
    if (s[i] === '"') return i;
  }
  return -1;
}

function unescapeDoubleQuoted(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function stripInlineComment(s: string): string {
  // Look for ` #` or `\t#` pattern (space/tab before #)
  const match = s.match(/\s+#(?!{)/);
  if (match && match.index !== undefined) {
    return s.slice(0, match.index);
  }
  return s;
}
