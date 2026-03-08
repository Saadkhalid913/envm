# envm — Product Requirements Document

## Overview

**envm** (env manager) is a CLI tool for managing `.env` files within a project. It provides set-theoretic comparison, flexible merge strategies, named snapshots, validation, and template generation — with an optional interactive TUI for visual diff/merge operations.

**Language:** TypeScript (Node.js)
**Distribution:** `npm install -g envm` / `npx envm`
**Scope:** Project-scoped — operates on `.env*` files in the current working directory

---

## Core Concepts

### Project Model

envm is project-scoped. Running any `envm` command operates on the cwd. A `.envm/` directory stores project-level config, snapshots, and schema.

```
my-project/
├── .env
├── .env.local
├── .env.production
├── .env.staging
└── .envm/
    ├── config.json          # project settings
    ├── schema.json          # validation rules (optional)
    └── snapshots/
        ├── pre-migration.json
        └── clean-slate.json
```

### Env File Parsing

envm uses **normalized parsing** — files are parsed into a canonical key-value representation. On write-back, output is clean and normalized (sorted keys, consistent quoting, no trailing whitespace). Original formatting, comments, and ordering are **not** preserved.

**Parsing rules:**
- Lines: `KEY=VALUE`, `export KEY=VALUE`, `KEY="VALUE"`, `KEY='VALUE'`
- Multiline values with double quotes
- Inline comments after unquoted values (` # comment`)
- Blank lines and `#`-prefixed comment lines are ignored on parse
- Variable interpolation (`${VAR}`) is **not** resolved — values are treated as literal strings

---

## Commands

### `envm init`

Initialize envm in the current project.

```bash
envm init
```

- Creates `.envm/` directory with default `config.json`
- Detects existing `.env*` files and reports them
- Optionally generates an initial schema from existing files

**Flags:**
- `--schema` — auto-generate a schema from current `.env*` files

---

### `envm list` / `envm ls`

List all `.env*` files in the current directory.

```bash
envm ls
```

**Output:**
```
  .env              12 vars
  .env.local         8 vars
  .env.production   15 vars
  .env.staging      14 vars
```

---

### `envm compare` / `envm diff`

Compare two or more env files using set operations. This is the flagship feature.

```bash
envm diff .env.staging .env.production
envm diff .env .env.local .env.production
```

**Default output** (colored terminal table):

```
┌──────────────────┬───────────┬────────────┬─────────────────┐
│ Key              │ .env.stag │ .env.prod  │ Status          │
├──────────────────┼───────────┼────────────┼─────────────────┤
│ DATABASE_URL     │ pg://lo…  │ pg://pr…   │ ⚠ differs       │
│ API_KEY          │ sk-test   │ sk-live    │ ⚠ differs       │
│ DEBUG            │ true      │ —          │ only in staging │
│ CDN_URL          │ —         │ https://…  │ only in prod    │
│ APP_NAME         │ myapp     │ myapp      │ ✓ same          │
└──────────────────┴───────────┴────────────┴─────────────────┘

Summary:
  3 shared keys (2 differ, 1 same)
  1 only in .env.staging
  1 only in .env.production
```

**Set operation filters:**

```bash
envm diff .env.a .env.b --only union        # all keys across both (default)
envm diff .env.a .env.b --only intersection  # keys present in both
envm diff .env.a .env.b --only diff          # keys that differ (missing or different value)
envm diff .env.a .env.b --only xor           # keys in one but not the other (symmetric difference)
envm diff .env.a .env.b --only a             # keys only in A
envm diff .env.a .env.b --only b             # keys only in B
```

For 3+ files, positional set filters use file labels:

```bash
envm diff .env.a .env.b .env.c --only a      # keys only in file A
envm diff .env.a .env.b .env.c --only a,b     # keys in A and B but not C
```

**Output formats:**

```bash
envm diff .env.a .env.b --format table    # default: colored table
envm diff .env.a .env.b --format json     # machine-readable JSON
envm diff .env.a .env.b --tui             # opens side-by-side TUI viewer
```

**JSON output schema:**

```json
{
  "files": [".env.staging", ".env.production"],
  "keys": {
    "DATABASE_URL": {
      "status": "differs",
      "values": {
        ".env.staging": "pg://localhost/mydb",
        ".env.production": "pg://prod-host/mydb"
      }
    },
    "DEBUG": {
      "status": "only_in",
      "present_in": [".env.staging"],
      "values": {
        ".env.staging": "true"
      }
    }
  },
  "summary": {
    "total_unique_keys": 5,
    "shared_same": 1,
    "shared_differ": 2,
    "exclusive": { ".env.staging": 1, ".env.production": 1 }
  }
}
```

**TUI view** (`--tui`): Opens a side-by-side panel view similar to vimdiff. Keyboard navigation with `j`/`k` to scroll, `q` to quit. Differences are color-highlighted. Read-only — for interactive merging, use `envm merge --interactive`.

---

### `envm merge`

Merge two or more env files into a single output.

```bash
envm merge .env.a .env.b -o .env.merged
envm merge .env.a .env.b .env.c -o .env.merged
```

**Strategies:**

```bash
envm merge .env.a .env.b --strategy union         # all keys; last file wins on conflict (default)
envm merge .env.a .env.b --strategy intersection   # only keys present in ALL files; last file wins on value
envm merge .env.a .env.b --strategy a              # start with A, overlay nothing (essentially filter to A's keys from union)
envm merge .env.a .env.b --strategy interactive     # prompt per-conflict
```

**Precedence:** In `union` and `intersection` strategies, files are applied left-to-right. The **last** file in the argument list has highest precedence for value conflicts.

```bash
# .env.c values win over .env.b, which wins over .env.a
envm merge .env.a .env.b .env.c --strategy union -o .env.merged
```

**Interactive merge** (`--strategy interactive`): For each conflicting key, presents a TUI picker:

```
DATABASE_URL has conflicting values:
  [A] .env.staging:    postgres://localhost:5432/mydb
  [B] .env.production: postgres://prod-host:5432/mydb
  [C] Enter custom value

  Pick (a/b/c):
```

**Flags:**
- `-o, --output <file>` — output file path (required, or `--stdout`)
- `--stdout` — write to stdout instead of file
- `--strategy <name>` — merge strategy (default: `union`)
- `--dry-run` — show what would be written without writing

---

### `envm clone` / `envm cp`

Duplicate an env file, optionally modifying keys.

```bash
envm clone .env.staging .env.preview
envm clone .env.production .env.local --set "DEBUG=true" --set "LOG_LEVEL=debug"
envm clone .env.production .env.local --unset "API_SECRET,STRIPE_KEY"
```

**Flags:**
- `--set KEY=VALUE` — override or add a key (repeatable)
- `--unset KEY` — remove a key (repeatable, comma-separated)

---

### `envm template`

Generate a `.env.example` or template from a real env file.

```bash
envm template .env.production
envm template .env.production -o .env.example
```

**Default behavior:**
- Strips all values, leaving only keys with empty values: `DATABASE_URL=`
- Sorts keys alphabetically

**Flags:**
- `-o, --output <file>` — output path (default: stdout)
- `--placeholder` — generate placeholder hints based on key names and value patterns:
  ```
  DATABASE_URL=postgresql://user:password@host:5432/dbname
  API_KEY=your-api-key-here
  PORT=3000
  DEBUG=true|false
  ```
- `--keep-defaults` — preserve values that appear non-sensitive (booleans, ports, hostnames like `localhost`)

---

### `envm validate`

Validate env files against a schema.

```bash
envm validate .env.production
envm validate .env.production --schema .envm/schema.json
envm validate .env.*
```

**Schema file** (`.envm/schema.json`):

```json
{
  "rules": {
    "DATABASE_URL": {
      "required": true,
      "type": "url",
      "pattern": "^postgres(ql)?://"
    },
    "PORT": {
      "required": true,
      "type": "number",
      "min": 1,
      "max": 65535
    },
    "DEBUG": {
      "required": false,
      "type": "boolean"
    },
    "API_KEY": {
      "required": true,
      "type": "string",
      "minLength": 10
    },
    "LOG_LEVEL": {
      "required": false,
      "type": "enum",
      "values": ["debug", "info", "warn", "error"]
    }
  }
}
```

**Supported types:** `string`, `number`, `boolean`, `url`, `email`, `enum`

**Output:**

```
Validating .env.production against .envm/schema.json...

  ✗ PORT: expected number, got "not-a-number"
  ✗ API_KEY: missing (required)
  ✓ DATABASE_URL: valid
  ✓ DEBUG: valid
  ⚠ EXTRA_VAR: not in schema (warning)

Result: 2 errors, 1 warning
```

**Flags:**
- `--schema <path>` — path to schema file (default: `.envm/schema.json`)
- `--strict` — treat unknown keys (not in schema) as errors
- `--format json` — JSON output for CI pipelines

**Exit codes:** `0` on success, `1` on validation errors (useful for CI gates).

---

### `envm schema`

Generate or manage the validation schema.

```bash
envm schema generate .env.production          # infer schema from existing file
envm schema generate .env.production .env.staging  # infer from multiple files (union of rules)
```

Infers types from value patterns (URLs, numbers, booleans, etc.) and marks all keys as required by default. Writes to `.envm/schema.json`.

---

### `envm snapshot`

Named snapshots of env file state (like `git stash`).

```bash
envm snapshot save "before-migration"         # snapshot all .env* files
envm snapshot save "prod-backup" .env.production  # snapshot specific file
envm snapshot list                            # list all snapshots
envm snapshot show "before-migration"         # display contents
envm snapshot restore "before-migration"      # restore all files from snapshot
envm snapshot delete "before-migration"       # delete a snapshot
```

**Snapshot storage** (`.envm/snapshots/before-migration.json`):

```json
{
  "name": "before-migration",
  "created_at": "2026-03-08T14:30:00Z",
  "files": {
    ".env": {
      "DATABASE_URL": "postgres://localhost/mydb",
      "PORT": "3000"
    },
    ".env.production": {
      "DATABASE_URL": "postgres://prod/mydb",
      "PORT": "8080"
    }
  }
}
```

**Flags for `restore`:**
- `--file <name>` — restore only a specific file from the snapshot
- `--dry-run` — show what would change without writing

---

### `envm get` / `envm set` / `envm unset`

Quick key-level operations on a single file.

```bash
envm get DATABASE_URL                         # from .env (default)
envm get DATABASE_URL --file .env.production
envm set DATABASE_URL=postgres://new-host/db  # in .env (default)
envm set PORT=8080 --file .env.staging
envm unset DEBUG
envm unset DEBUG --file .env.*                # remove from all matching files
```

---

### `envm sort`

Sort an env file alphabetically.

```bash
envm sort .env.production
envm sort .env.production -o .env.production.sorted
```

Since envm uses normalized output, this is essentially a reformat/clean operation.

---

## TUI Details

The TUI is **selective** — it appears within specific commands rather than being a standalone app. TUI-enabled commands:

| Command | TUI trigger | TUI behavior |
|---|---|---|
| `envm diff` | `--tui` flag | Side-by-side scrollable panel view with color-coded diffs |
| `envm merge` | `--strategy interactive` | Per-key conflict resolver with value picker |
| `envm snapshot restore` | `--interactive` flag | Preview changes before restoring, select which files to restore |

**TUI framework:** [Ink](https://github.com/vadimdemedes/ink) (React for CLI) — fits well with the TypeScript ecosystem and allows building composable terminal UI components.

**Keybindings (diff TUI):**

| Key | Action |
|---|---|
| `j` / `k` | Scroll down / up |
| `Tab` | Cycle focus between file panels |
| `f` | Toggle filter (union / intersection / xor / etc.) |
| `/` | Search/filter by key name |
| `q` | Quit |

---

## CLI Design

### Global Flags

```bash
--help, -h          Show help
--version, -v       Show version
--format <type>     Output format: table (default), json
--file <path>       Target file (default: .env)
--quiet, -q         Suppress non-essential output
--no-color          Disable colored output
```

### Aliases

| Full command | Alias |
|---|---|
| `envm compare` | `envm diff` |
| `envm clone` | `envm cp` |
| `envm list` | `envm ls` |
| `envm snapshot` | `envm snap` |

### CLI Framework

[Commander.js](https://github.com/tj/commander.js/) for argument parsing — mature, well-typed, and lightweight. Combined with [chalk](https://github.com/chalk/chalk) for colors and [cli-table3](https://github.com/cli-table/cli-table3) for table formatting.

---

## Architecture

```
envm/
├── src/
│   ├── cli/                    # Command definitions (commander setup)
│   │   ├── index.ts            # Entry point, register commands
│   │   ├── diff.ts
│   │   ├── merge.ts
│   │   ├── snapshot.ts
│   │   ├── validate.ts
│   │   ├── template.ts
│   │   └── ...
│   ├── core/                   # Pure logic, no I/O
│   │   ├── parser.ts           # .env file parser
│   │   ├── writer.ts           # Normalized .env writer
│   │   ├── differ.ts           # Set operations (union, intersection, xor, etc.)
│   │   ├── merger.ts           # Merge strategies
│   │   ├── validator.ts        # Schema validation engine
│   │   └── schema-inferrer.ts  # Infer schema from env files
│   ├── tui/                    # Ink-based TUI components
│   │   ├── DiffView.tsx
│   │   ├── MergePrompt.tsx
│   │   └── SnapshotPreview.tsx
│   ├── storage/                # Snapshot and config persistence
│   │   ├── snapshots.ts
│   │   └── config.ts
│   └── utils/
│       ├── fs.ts               # File discovery (.env* glob)
│       ├── format.ts           # Output formatting (table, json)
│       └── color.ts            # Chalk theme/helpers
├── tests/
│   ├── core/                   # Unit tests for pure logic
│   └── cli/                    # Integration tests for commands
├── package.json
├── tsconfig.json
└── README.md
```

**Key principle:** `core/` is pure functions with no side effects. All I/O happens in `cli/` and `storage/`. This makes the set operations and merge logic trivially testable.

---

## Milestones

### M0 — Foundation (Week 1)
- [ ] Project scaffolding (TypeScript, Commander, build pipeline)
- [ ] `.env` parser + normalized writer
- [ ] `envm ls` command
- [ ] `envm get` / `envm set` / `envm unset`
- [ ] `envm init`

### M1 — Compare (Week 2)
- [ ] `envm diff` with all set operations (union, intersection, xor, only-in-A, only-in-B)
- [ ] Colored table output
- [ ] JSON output format
- [ ] Multi-file comparison (3+ files)

### M2 — Merge + Clone (Week 3)
- [ ] `envm merge` with union, intersection strategies
- [ ] Precedence-based conflict resolution
- [ ] `envm clone` with `--set` / `--unset`
- [ ] `envm sort`
- [ ] `envm template` with `--placeholder` and `--keep-defaults`

### M3 — Snapshots (Week 4)
- [ ] `.envm/` directory management
- [ ] `envm snapshot save/list/show/restore/delete`
- [ ] Dry-run support

### M4 — Validation (Week 5)
- [ ] Schema format and validation engine
- [ ] `envm validate` with exit codes for CI
- [ ] `envm schema generate` (type inference)
- [ ] `--strict` mode

### M5 — TUI (Week 6)
- [ ] Ink setup and component library
- [ ] Side-by-side diff TUI (`envm diff --tui`)
- [ ] Interactive merge TUI (`envm merge --strategy interactive`)
- [ ] Snapshot restore preview

### M6 — Polish (Week 7)
- [ ] Comprehensive `--help` text for every command
- [ ] README with examples and GIFs
- [ ] Edge case handling (empty files, huge files, malformed lines)
- [ ] npm publish setup

---

## Open Questions

1. **Gitignore awareness:** Should `envm template` warn when templating a gitignored file and suggest outputting to a tracked filename? Low effort, potentially useful guardrail.
2. **Watch mode:** Would `envm diff --watch .env.staging .env.production` that live-updates on file change be useful for debugging?
3. **Plugin system:** Future consideration — allow custom merge strategies or output formatters via plugins.
4. **Encryption:** Deferred for now, but could be a future feature — `envm encrypt .env.production` using a project-level key, with `envm decrypt` to restore.
5. **Shell completions:** Ship bash/zsh/fish completions for command and file argument tab-completion.
