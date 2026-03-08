# envm

CLI tool for managing `.env` files — compare, merge, snapshot, validate.

## Install

### npm

```bash
npm install -g envm
```

Or run without installing:

```bash
npx envm
```

### Shell script (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/saadkhalid/envm/main/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/saadkhalid/envm.git ~/.envm
cd ~/.envm && npm install && npm run build
sudo ln -sf ~/.envm/dist/cli/index.js /usr/local/bin/envm
```

See [install.sh](./install.sh) for details.

## Quick Start

```bash
# Initialize envm in your project
envm init

# List all env files
envm ls

# Compare staging vs production
envm diff .env.staging .env.production

# See only the differences
envm diff .env.staging .env.production --only diff

# Merge files (production values win)
envm merge .env.staging .env.production -o .env.merged

# Clone with overrides
envm clone .env.production .env.local --set "DEBUG=true" --set "PORT=3001"

# Normalize a messy env file
envm normalize .env.messy

# Save a snapshot before making changes
envm snapshot save "before-migration"
```

## Commands

### `envm init`

Initialize envm in the current project. Creates a `.envm/` directory.

```bash
envm init
envm init --schema    # also generate a schema from existing env files
```

### `envm list` / `envm ls`

List all `.env*` files with their variable counts.

```
  .env              10 vars
  .env.local        11 vars
  .env.production   14 vars
```

### `envm get` / `envm set` / `envm unset`

Quick key-level operations.

```bash
envm get DATABASE_URL
envm get DATABASE_URL --file .env.production
envm set PORT=8080 --file .env.staging
envm unset DEBUG
envm unset DEBUG --file .env.*    # remove from all matching files
```

### `envm diff` / `envm compare`

Compare two or more env files using set operations.

```bash
envm diff .env.staging .env.production
envm diff .env .env.local .env.production    # 3-way compare
```

**Set operation filters** with `--only`:

| Filter | Description |
|--------|-------------|
| `union` | All keys across all files (default) |
| `intersection` | Keys present in every file |
| `diff` | Keys that differ (missing or different value) |
| `xor` | Keys in exactly one file (symmetric difference) |
| `a`, `b` | Keys only in that file |
| `a,b` | Keys in A and B but not others |

**Output formats:**

```bash
envm diff .env.a .env.b --format table    # colored table (default)
envm diff .env.a .env.b --format json     # machine-readable JSON
```

### `envm merge`

Merge two or more env files. Last file has highest precedence.

```bash
envm merge .env.a .env.b -o .env.merged
envm merge .env.a .env.b --stdout
envm merge .env.a .env.b --strategy intersection -o .env.merged
envm merge .env.a .env.b --dry-run -o .env.merged
```

**Strategies:**

| Strategy | Behavior |
|----------|----------|
| `union` | All keys, last file wins on conflict (default) |
| `intersection` | Only keys in all files, last file wins on value |
| `a` | Only keys from the first file |

### `envm clone` / `envm cp`

Duplicate an env file with optional modifications.

```bash
envm clone .env.production .env.local
envm clone .env.production .env.local --set "DEBUG=true" --set "LOG_LEVEL=debug"
envm clone .env.production .env.local --unset "API_SECRET,STRIPE_KEY"
```

### `envm template`

Generate a `.env.example` from a real env file.

```bash
envm template .env.production                          # keys only, to stdout
envm template .env.production -o .env.example          # write to file
envm template .env.production --placeholder            # smart placeholders
envm template .env.production --keep-defaults          # keep non-sensitive values
```

### `envm normalize`

Output a normalized version of an env file. Sorts keys alphabetically, strips all comments and whitespace, applies consistent quoting. Writes to stdout only — never modifies the original file.

```bash
envm normalize .env.messy
envm normalize .env.messy > .env.clean    # redirect to a new file
```

### `envm sort`

Sort an env file alphabetically (in-place normalization).

```bash
envm sort .env.production
envm sort .env.production -o .env.sorted
```

### `envm validate`

Validate env files against a schema.

```bash
envm validate .env.production
envm validate .env.production --schema custom-schema.json
envm validate .env.production --strict       # unknown keys are errors
envm validate .env.production --format json  # for CI pipelines
```

Exit code `1` on validation errors — useful as a CI gate.

### `envm schema generate`

Infer a validation schema from existing env files.

```bash
envm schema generate .env.production
envm schema generate .env.production .env.staging    # union of rules
```

### `envm snapshot` / `envm snap`

Named snapshots of env file state.

```bash
envm snapshot save "before-migration"              # snapshot all .env* files
envm snapshot save "prod-backup" .env.production   # snapshot specific file
envm snapshot list
envm snapshot show "before-migration"
envm snapshot restore "before-migration"
envm snapshot restore "before-migration" --dry-run
envm snapshot restore "before-migration" --file .env.production
envm snapshot delete "before-migration"
```

## Project Structure

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
