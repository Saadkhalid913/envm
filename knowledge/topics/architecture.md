# Architecture
> Core/CLI separation with pure-function core and I/O at the edges | Last updated: 2026-03-08 | Status: active
> Related: `env-parsing`, `cli-commands`

## Context
envm follows a strict separation: `src/core/` contains pure functions (parser, writer, differ, merger, validator, schema-inferrer) with zero I/O. All file system and user interaction happens in `src/cli/` and `src/storage/`. This makes core logic trivially testable.

## Key Facts
- TypeScript, ESM (`"type": "module"`), targets ES2022
- Commander.js for CLI parsing, chalk for colors, cli-table3 for tables
- `.envm/` directory stores project config, schema, and snapshots
- Tests use vitest, located in `tests/core/` (unit) and `tests/cli/` (integration)
- Build output goes to `dist/`, entry point is `dist/cli/index.js`

## Decisions
- [2026-03-08] Pure core with no side effects: enables unit testing without mocks or fixtures
- [2026-03-08] ESM-only (no CJS): aligns with modern Node.js, chalk v5 requires ESM
- [2026-03-08] No dotenv lib: custom parser needed for normalized parsing, multiline, no interpolation

## Gotchas
- All imports between source files must use `.js` extension (Node16 module resolution)
- chalk v5 is ESM-only — cannot use `require()`

## Open Questions
- [?] TUI layer (M5) will use Ink (React for CLI) — not yet implemented
