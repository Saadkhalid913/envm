# envm

A fast CLI for managing `.env` files. Compare environments with set operations, merge with conflict strategies, snapshot state, validate against schemas, and more.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Saadkhalid913/envm/main/install.sh | bash
```

Or with npm:

```bash
npm install -g envm
```

<details>
<summary>Manual install</summary>

```bash
git clone https://github.com/Saadkhalid913/envm.git ~/.envm
cd ~/.envm && npm install && npm run build
sudo ln -sf ~/.envm/dist/cli/index.js /usr/local/bin/envm
```

</details>

## Quick Start

```bash
envm init                                          # set up envm in your project
envm ls                                            # list all .env files
envm diff .env.staging .env.production             # compare two files
envm diff .env.*                                   # compare all env files at once
envm merge .env.staging .env.production -o .env    # merge with last-wins
envm clone .env .env.local --set "DEBUG=true"      # clone with overrides
envm snapshot save "before-migration"              # save a named snapshot
envm validate .env.production                      # validate against schema
```

## Commands

### `envm diff` / `envm compare`

Compare two or more env files side-by-side. Supports glob patterns and color-codes values so you can instantly see which environments share the same value for each key.

```bash
envm diff .env.dev .env.production
envm diff .env.*                          # glob — compare all env files
envm diff .env.prod.*                     # glob — compare all prod variants
envm diff .env .env.local .env.staging    # 3-way compare
```

Values that match across files are shown in the same color per row, making it easy to spot which environments diverge.

**Filters** — show only the keys you care about with `--only`:

| Filter | Shows |
|--------|-------|
| `union` | All keys across all files (default) |
| `intersection` | Keys present in every file |
| `diff` | Keys that differ or are missing |
| `xor` | Keys in exactly one file |
| `a`, `b`, ... | Keys exclusive to that file |

```bash
envm diff .env.staging .env.production --only diff
envm diff .env.a .env.b --format json     # machine-readable output
```

### `envm merge`

Merge two or more env files. Last file has highest precedence.

```bash
envm merge .env.defaults .env.local -o .env
envm merge .env.a .env.b --stdout
envm merge .env.a .env.b --dry-run -o .env.merged
```

**Strategies** via `--strategy`:

| Strategy | Behavior |
|----------|----------|
| `union` | All keys, last file wins on conflict (default) |
| `intersection` | Only keys common to all files |
| `a` | Only keys from the first file |

### `envm clone` / `envm cp`

Duplicate an env file with optional inline overrides.

```bash
envm clone .env.production .env.local
envm clone .env.production .env.local --set "DEBUG=true" --set "PORT=3001"
envm clone .env.production .env.local --unset "API_SECRET,STRIPE_KEY"
```

### `envm get` / `envm set` / `envm unset`

Quick key-level read/write operations.

```bash
envm get DATABASE_URL
envm get DATABASE_URL --file .env.production
envm set PORT=8080 --file .env.staging
envm unset DEBUG
```

### `envm validate`

Validate env files against a JSON schema. Exit code `1` on errors — useful as a CI gate.

```bash
envm validate .env.production
envm validate .env.production --schema custom-schema.json
envm validate .env.production --strict       # unknown keys are errors
envm validate .env.production --format json  # machine-readable output
```

### `envm schema generate`

Infer a validation schema from existing env files. Detects types (string, number, boolean, url, email) and constraints automatically.

```bash
envm schema generate .env.production
envm schema generate .env.production .env.staging    # union of rules
```

### `envm template`

Generate a `.env.example` from a real env file — strips sensitive values.

```bash
envm template .env.production -o .env.example
envm template .env.production --placeholder          # smart placeholders
envm template .env.production --keep-defaults         # keep non-sensitive values
```

### `envm snapshot` / `envm snap`

Named snapshots of env file state. Save before risky changes, restore if things go wrong.

```bash
envm snapshot save "before-migration"
envm snapshot save "prod-backup" .env.production
envm snapshot list
envm snapshot show "before-migration"
envm snapshot restore "before-migration"
envm snapshot restore "before-migration" --dry-run
envm snapshot delete "before-migration"
```

### `envm normalize`

Output a clean, normalized version of an env file to stdout. Sorts keys, strips comments and whitespace, applies consistent quoting. Never modifies the original.

```bash
envm normalize .env.messy
envm normalize .env.messy > .env.clean
```

### `envm sort`

Sort an env file alphabetically (in-place).

```bash
envm sort .env.production
envm sort .env.production -o .env.sorted
```

### `envm list` / `envm ls`

List all `.env*` files in the current directory with variable counts.

```bash
envm ls
```

### `envm init`

Initialize envm in the current project. Creates a `.envm/` directory for config, schemas, and snapshots.

```bash
envm init
envm init --schema    # also infer a schema from existing env files
```

### `envm update`

Update envm to the latest version (for shell-script installs).

```bash
envm update
```

## Project Structure

After running `envm init`, your project will have:

```
my-project/
├── .env
├── .env.local
├── .env.production
└── .envm/
    ├── config.json
    ├── schema.json
    └── snapshots/
        └── before-migration.json
```

## Requirements

- Node.js >= 18

## License

MIT
