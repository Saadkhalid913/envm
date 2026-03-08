#!/usr/bin/env bash
set -euo pipefail

# envm updater — called by `envm update`
# Can also be run standalone: bash ~/.envm/update.sh

REPO="https://github.com/Saadkhalid913/envm.git"
INSTALL_DIR="${ENVM_INSTALL_DIR:-$HOME/.envm}"
BIN_DIR="${ENVM_BIN_DIR:-/usr/local/bin}"
MAN_DIR="${ENVM_MAN_DIR:-/usr/local/share/man/man1}"

# --- Colors & symbols ---

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

TICK="${GREEN}✔${RESET}"
CROSS="${RED}✘${RESET}"
WARN="${YELLOW}⚠${RESET}"
ARROW="${BLUE}→${RESET}"

ok()      { printf "  ${TICK}  %b\n" "$*"; }
fail()    { printf "  ${CROSS}  %b\n" "$*"; }
warning() { printf "  ${WARN}  %b\n" "$*"; }
step()    { printf "\n  ${ARROW}  ${BOLD}%b${RESET}\n" "$*"; }
dim()     { printf "  ${DIM}%b${RESET}\n" "$*"; }
info()    { printf "  ${BOLD}%b${RESET}\n" "$*"; }

run_with_spinner() {
  local msg="$1"; shift
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local logfile; logfile=$(mktemp)
  "$@" </dev/null >"$logfile" 2>&1 &
  local cmd_pid=$!
  local i=0
  while kill -0 "$cmd_pid" 2>/dev/null; do
    printf "\r  ${BLUE}%s${RESET}  %s" "${frames[$((i % 10))]}" "$msg"
    i=$((i + 1))
    perl -e 'select(undef,undef,undef,0.08)' 2>/dev/null || sleep 1
  done
  local exit_code
  wait "$cmd_pid"
  exit_code=$?
  printf "\r\033[2K"
  rm -f "$logfile"
  return "$exit_code"
}

# --- Banner ---

printf "\n"
printf "  ${BOLD}envm updater${RESET}\n"
printf "\n"

# --- Check current version ---

step "Checking for updates"

if [ ! -d "$INSTALL_DIR" ]; then
  fail "envm is not installed at $INSTALL_DIR"
  dim "Run the install script instead:"
  dim "  curl -fsSL https://raw.githubusercontent.com/Saadkhalid913/envm/main/install.sh | bash"
  exit 1
fi

if [ ! -d "$INSTALL_DIR/.git" ]; then
  fail "$INSTALL_DIR is not a git repository — cannot update"
  exit 1
fi

current_sha=$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
current_version=$(node -e "console.log(require('$INSTALL_DIR/package.json').version)" 2>/dev/null || echo "unknown")
ok "Current version: ${DIM}v${current_version} (${current_sha})${RESET}"

# Fetch latest to check if update is needed
if run_with_spinner "Fetching latest..." git -C "$INSTALL_DIR" fetch origin main; then
  ok "Fetched latest from origin"
else
  fail "Could not reach remote repository"
  exit 1
fi

local_sha=$(git -C "$INSTALL_DIR" rev-parse HEAD 2>/dev/null)
remote_sha=$(git -C "$INSTALL_DIR" rev-parse origin/main 2>/dev/null)

if [ "$local_sha" = "$remote_sha" ]; then
  ok "Already up to date!"
  printf "\n"
  exit 0
fi

remote_short=$(echo "$remote_sha" | head -c 7)
ok "Update available: ${DIM}${current_sha} → ${remote_short}${RESET}"

# --- Clone fresh copy ---

step "Updating"

TEMP_DIR=$(mktemp -d)
OLD_DIR="${INSTALL_DIR}.old"

cleanup() {
  rm -rf "$TEMP_DIR" 2>/dev/null
  # If swap failed and old dir exists, restore it
  if [ -d "$OLD_DIR" ] && [ ! -d "$INSTALL_DIR" ]; then
    mv "$OLD_DIR" "$INSTALL_DIR" 2>/dev/null
  fi
  rm -rf "$OLD_DIR" 2>/dev/null
}
trap cleanup EXIT

if run_with_spinner "Cloning latest version..." git clone --depth 1 "$REPO" "$TEMP_DIR/envm"; then
  ok "Cloned latest"
else
  fail "Failed to clone repository"
  exit 1
fi

# --- Build new version ---

if run_with_spinner "Installing dependencies..." bash -c "cd '$TEMP_DIR/envm' && npm install"; then
  ok "Dependencies installed"
else
  fail "npm install failed"
  exit 1
fi

if run_with_spinner "Building..." bash -c "cd '$TEMP_DIR/envm' && npm run build"; then
  ok "Build complete"
else
  fail "Build failed"
  exit 1
fi

if run_with_spinner "Cleaning up dependencies..." bash -c "cd '$TEMP_DIR/envm' && npm prune --omit=dev"; then
  ok "Dev dependencies removed"
else
  warning "Could not prune dev dependencies (non-critical)"
fi

# --- Swap old and new ---

step "Swapping versions"

# Make new entry point executable
chmod +x "$TEMP_DIR/envm/dist/cli/index.js"

# Atomic swap: old → .old, new → install dir
if [ -d "$OLD_DIR" ]; then
  rm -rf "$OLD_DIR"
fi

mv "$INSTALL_DIR" "$OLD_DIR"
mv "$TEMP_DIR/envm" "$INSTALL_DIR"
ok "Swapped install directory"

# --- Update symlink ---

ENTRY="$INSTALL_DIR/dist/cli/index.js"
link_updated=false

if [ -L "$BIN_DIR/envm" ] || [ -f "$BIN_DIR/envm" ]; then
  if [ -w "$BIN_DIR" ]; then
    ln -sf "$ENTRY" "$BIN_DIR/envm"
    link_updated=true
  elif command -v sudo &>/dev/null; then
    if sudo ln -sf "$ENTRY" "$BIN_DIR/envm" 2>/dev/null; then
      link_updated=true
    fi
  fi
fi

if [ "$link_updated" = true ]; then
  ok "Symlink updated ${DIM}${BIN_DIR}/envm${RESET}"
else
  # Symlink may already point correctly if INSTALL_DIR didn't change
  if command -v envm &>/dev/null; then
    ok "Binary already on PATH"
  else
    warning "Could not update symlink"
    dim "Run: sudo ln -sf $ENTRY $BIN_DIR/envm"
  fi
fi

# --- Update man page ---

if [ -f "$INSTALL_DIR/man/envm.1" ]; then
  if [ -w "$MAN_DIR" ] 2>/dev/null; then
    cp "$INSTALL_DIR/man/envm.1" "$MAN_DIR/envm.1" 2>/dev/null && ok "Man page updated" || true
  elif command -v sudo &>/dev/null; then
    sudo cp "$INSTALL_DIR/man/envm.1" "$MAN_DIR/envm.1" 2>/dev/null && ok "Man page updated" || true
  fi
fi

# --- Delete old version ---

step "Cleaning up"

rm -rf "$OLD_DIR" 2>/dev/null
ok "Old version deleted"

# --- Summary ---

new_version=$(node -e "console.log(require('$INSTALL_DIR/package.json').version)" 2>/dev/null || echo "unknown")
new_sha=$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

printf "\n"
printf "  ${GREEN}${BOLD}Updated successfully!${RESET}\n"
printf "\n"
dim "v${current_version} (${current_sha}) → v${new_version} (${new_sha})"
printf "\n"
