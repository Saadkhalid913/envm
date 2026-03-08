# CLI Commands
> All envm commands, their flags, aliases, and behaviors | Last updated: 2026-03-08 | Status: active
> Related: `architecture`, `env-parsing`

## Context
envm exposes 13 commands covering env file management. Commands are defined in `src/cli/`, one file per command (or logical group). All commands operate on cwd by default.

## Key Facts
- `init` — creates `.envm/` dir, optional `--schema` flag to auto-generate
- `list` / `ls` — lists `.env*` files with var counts
- `get` / `set` / `unset` — single-key operations, `--file` flag (default `.env`)
- `diff` / `compare` — set-theoretic comparison, `--only` filter, `--format table|json`
- `merge` — union/intersection/a strategies, `-o`/`--stdout`, `--dry-run`
- `clone` / `cp` — duplicate with `--set` and `--unset` overrides
- `template` — strip values, `--placeholder` for hints, `--keep-defaults` for safe values
- `validate` — check against `.envm/schema.json`, `--strict`, exit code 1 on errors
- `schema generate` — infer types from existing env files
- `snapshot` / `snap` — save/list/show/restore/delete, `--dry-run` on restore
- `sort` — alphabetical sort, in-place or `-o`
- `normalize` — stdout-only normalized output (sorted, no comments/whitespace)

## Decisions
- [2026-03-08] `normalize` outputs to stdout only: never modifies the source file
- [2026-03-08] Diff values use `quoteValue()`: shows canonical normalized form in table

## Gotchas
- `unset --file '.env.*'` uses simple regex matching, not full glob
- `merge` requires either `--output` or `--stdout` (errors otherwise)
