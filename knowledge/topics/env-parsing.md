# Env Parsing
> Parser and writer rules for normalized .env file handling | Last updated: 2026-03-08 | Status: active
> Related: `architecture`, `cli-commands`

## Context
envm uses normalized parsing — files are parsed into a canonical `Map<string, string>` and written back with sorted keys, consistent quoting, no comments or blank lines. Original formatting is intentionally not preserved.

## Key Facts
- Parser supports: `KEY=VALUE`, `export KEY=VALUE`, double-quoted, single-quoted
- Multiline values supported in double quotes only
- Inline comments stripped from unquoted values (` # comment` pattern)
- Variable interpolation (`${VAR}`) is NOT resolved — treated as literal
- Writer sorts keys alphabetically, quotes values containing spaces/newlines/quotes/#
- `quoteValue()` is exported from `core/writer.ts` for use by diff display
- Empty values written as `KEY=` (no quotes)

## Decisions
- [2026-03-08] No interpolation: keeps parser simple, avoids dependency resolution
- [2026-03-08] Export `quoteValue`: diff table shows normalized form for readability

## Gotchas
- Keys must match `/^[a-zA-Z_][a-zA-Z0-9_]*$/` — lines with invalid keys are silently skipped
- Single-quoted values do not support multiline (only double-quoted do)
- `stripInlineComment` uses `\s+#(?!{)` to avoid stripping `${VAR}` interpolation syntax
