#!/usr/bin/env bash
set -euo pipefail

# envm installer for macOS and Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/saadkhalid/envm/main/install.sh | bash

REPO="https://github.com/saadkhalid/envm.git"
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

# --- Output helpers ---

info()    { printf "  ${BOLD}%b${RESET}\n" "$*"; }
ok()      { printf "  ${TICK}  %b\n" "$*"; }
fail()    { printf "  ${CROSS}  %b\n" "$*"; }
warning() { printf "  ${WARN}  %b\n" "$*"; }
step()    { printf "\n  ${ARROW}  ${BOLD}%b${RESET}\n" "$*"; }
dim()     { printf "  ${DIM}%b${RESET}\n" "$*"; }

# --- Spinner ---

# Run a command with a spinner shown while it executes.
# Usage: run_with_spinner "message" command [args...]
# The command's stdout/stderr are suppressed. Returns the command's exit code.
run_with_spinner() {
  local msg="$1"
  shift
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local logfile
  logfile=$(mktemp)

  "$@" >"$logfile" 2>&1 &
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
printf "  ${BOLD}envm installer${RESET}\n"
printf "  ${DIM}CLI tool for managing .env files${RESET}\n"
printf "\n"

# --- Pre-flight checks ---

step "Checking requirements"

preflight_ok=true

check_cmd() {
  if command -v "$1" &>/dev/null; then
    local ver=""
    case "$1" in
      node) ver=" $(node --version 2>/dev/null)" ;;
      npm)  ver=" v$(npm --version 2>/dev/null)" ;;
      git)  ver=" v$(git --version 2>/dev/null | awk '{print $3}')" ;;
    esac
    ok "$1${DIM}${ver}${RESET}"
  else
    fail "$1 not found"
    preflight_ok=false
  fi
}

check_cmd git
check_cmd node
check_cmd npm

# Check node version
node_version=$(node --version 2>/dev/null | sed 's/v//')
node_major=$(echo "$node_version" | cut -d. -f1)
if [ "$node_major" -lt 18 ]; then
  fail "Node.js >= 18 required (found v${node_version})"
  preflight_ok=false
else
  ok "Node.js version ${DIM}(>= 18)${RESET}"
fi

if [ "$preflight_ok" = false ]; then
  printf "\n"
  fail "Missing requirements. Install them and try again."
  exit 1
fi

# --- Clone / update ---

step "Installing envm"

if [ -d "$INSTALL_DIR" ]; then
  if run_with_spinner "Updating existing installation..." git -C "$INSTALL_DIR" pull --ff-only; then
    ok "Updated ${DIM}${INSTALL_DIR}${RESET}"
  else
    fail "Could not update (try removing $INSTALL_DIR and re-running)"
    exit 1
  fi
else
  if run_with_spinner "Cloning repository..." git clone --depth 1 "$REPO" "$INSTALL_DIR"; then
    ok "Cloned to ${DIM}${INSTALL_DIR}${RESET}"
  else
    fail "Failed to clone repository"
    exit 1
  fi
fi

# --- Dependencies ---

if run_with_spinner "Installing dependencies..." bash -c "cd '$INSTALL_DIR' && npm install --omit=dev"; then
  ok "Dependencies installed"
else
  fail "npm install failed"
  printf "\n"
  dim "Try running manually:"
  dim "  cd $INSTALL_DIR && npm install"
  exit 1
fi

# --- Build ---

if run_with_spinner "Building..." bash -c "cd '$INSTALL_DIR' && npm run build"; then
  ok "Build complete"
else
  fail "Build failed"
  printf "\n"
  dim "Try running manually:"
  dim "  cd $INSTALL_DIR && npm run build"
  exit 1
fi

# --- Link binary ---

step "Setting up PATH"

ENTRY="$INSTALL_DIR/dist/cli/index.js"
chmod +x "$ENTRY"

link_ok=false

if [ -w "$BIN_DIR" ]; then
  ln -sf "$ENTRY" "$BIN_DIR/envm"
  link_ok=true
elif command -v sudo &>/dev/null; then
  printf "  ${DIM}Need sudo to symlink into ${BIN_DIR}${RESET}\n"
  if sudo ln -sf "$ENTRY" "$BIN_DIR/envm" 2>/dev/null; then
    link_ok=true
  fi
fi

if [ "$link_ok" = true ]; then
  # Verify it's actually on PATH
  if command -v envm &>/dev/null; then
    ok "envm linked to ${DIM}${BIN_DIR}/envm${RESET}"
    ok "envm is on your PATH"
  else
    ok "envm linked to ${DIM}${BIN_DIR}/envm${RESET}"
    warning "${BIN_DIR} is not in your PATH"
    printf "\n"
    dim "Add it by appending one of these to your shell config:"
    printf "\n"
    dim "  # bash (~/.bashrc or ~/.bash_profile)"
    dim "  export PATH=\"${BIN_DIR}:\$PATH\""
    printf "\n"
    dim "  # zsh (~/.zshrc)"
    dim "  export PATH=\"${BIN_DIR}:\$PATH\""
    printf "\n"
    dim "  # fish (~/.config/fish/config.fish)"
    dim "  fish_add_path ${BIN_DIR}"
    printf "\n"
    dim "Then restart your shell or run: source ~/.zshrc"
  fi
else
  warning "Could not create symlink in ${BIN_DIR}"
  printf "\n"
  dim "Run one of these manually:"
  printf "\n"
  dim "  # Option 1: symlink with sudo"
  dim "  sudo ln -sf $ENTRY ${BIN_DIR}/envm"
  printf "\n"
  dim "  # Option 2: symlink to a user-writable directory"
  dim "  mkdir -p \$HOME/.local/bin"
  dim "  ln -sf $ENTRY \$HOME/.local/bin/envm"
  dim "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  printf "\n"
  dim "  # Option 3: add an alias to your shell config"
  dim "  echo 'alias envm=\"node $ENTRY\"' >> ~/.zshrc"
fi

# --- Man page ---

step "Installing man page"

man_ok=false

if [ -f "$INSTALL_DIR/man/envm.1" ]; then
  if [ -w "$MAN_DIR" ] 2>/dev/null || [ -w "$(dirname "$MAN_DIR")" ] 2>/dev/null; then
    mkdir -p "$MAN_DIR"
    cp "$INSTALL_DIR/man/envm.1" "$MAN_DIR/envm.1"
    man_ok=true
  elif command -v sudo &>/dev/null; then
    if sudo mkdir -p "$MAN_DIR" 2>/dev/null && sudo cp "$INSTALL_DIR/man/envm.1" "$MAN_DIR/envm.1" 2>/dev/null; then
      man_ok=true
    fi
  fi
fi

if [ "$man_ok" = true ]; then
  ok "Man page installed ${DIM}(man envm)${RESET}"
else
  warning "Could not install man page"
  dim "Run manually: sudo cp $INSTALL_DIR/man/envm.1 $MAN_DIR/envm.1"
fi

# --- Summary ---

printf "\n"
printf "  ${GREEN}${BOLD}envm installed successfully!${RESET}\n"
printf "\n"
dim "Install dir:  $INSTALL_DIR"
dim "Binary:       ${BIN_DIR}/envm"
dim "Man page:     ${MAN_DIR}/envm.1"
printf "\n"
info "Get started:"
printf "  ${DIM}$ ${RESET}envm --help\n"
printf "  ${DIM}$ ${RESET}envm init\n"
printf "  ${DIM}$ ${RESET}envm ls\n"
printf "\n"
dim "To uninstall:"
dim "  rm -rf $INSTALL_DIR"
dim "  rm ${BIN_DIR}/envm"
dim "  rm ${MAN_DIR}/envm.1 2>/dev/null"
printf "\n"
