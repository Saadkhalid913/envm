# Distribution
> Install methods, man page, and npm publishing | Last updated: 2026-03-08 | Status: active
> Related: `architecture`

## Context
envm is distributed as an npm package (`npm install -g envm` / `npx envm`). An install script is also provided for direct installation on macOS/Linux without requiring npm. A man page is generated as troff and installed alongside the binary.

## Key Facts
- npm bin entry: `"envm": "dist/cli/index.js"`
- Install script: `install.sh` — clones, builds, symlinks to `/usr/local/bin`
- Man page: `man/envm.1` — troff format, covers all commands and flags
- Requires Node.js >= 18

## Decisions
- [2026-03-08] Install script clones + builds rather than downloading prebuilt: ensures compatibility, avoids hosting binaries
- [2026-03-08] Man page in troff format: standard Unix convention, works with `man` command

## Open Questions
- [?] npm publish setup not yet configured (M6 milestone)
- [?] Shell completions (bash/zsh/fish) not yet implemented
