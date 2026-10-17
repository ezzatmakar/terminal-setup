#!/usr/bin/env bash
# Install this terminal setup on a Mac.
#
#   ./install.sh                  everything: hyper, starship, claude, zsh
#   ./install.sh hyper claude     only some parts
#   ./install.sh --copy           copy files instead of symlinking them
#   ./install.sh --skip-deps      don't install Homebrew packages / Oh My Zsh
#
# Files are symlinked to this repo by default, so `git pull` updates them.
# Anything already in the way is moved to <name>.backup-<timestamp> first.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
MODE="link"
DEPS=1
PARTS=()

for arg in "$@"; do
  case "$arg" in
    --copy) MODE="copy" ;;
    --skip-deps) DEPS=0 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    hyper|starship|claude|zsh) PARTS+=("$arg") ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 1 ;;
  esac
done
[[ ${#PARTS[@]} -eq 0 ]] && PARTS=(hyper starship claude zsh)

want() { [[ " ${PARTS[*]} " == *" $1 "* ]]; }
say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m  %s\n' "$*"; }

# Put $1 (a file or folder in this repo) at $2, backing up whatever is there.
place() {
  local src="$REPO/$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [[ -L "$dest" && "$(readlink "$dest")" == "$src" ]]; then
    echo "    ok      $dest"
    return
  fi
  if [[ -e "$dest" || -L "$dest" ]]; then
    mv "$dest" "$dest.backup-$STAMP"
    echo "    backup  $dest.backup-$STAMP"
  fi
  if [[ $MODE == link ]]; then
    ln -s "$src" "$dest"
    echo "    link    $dest -> $src"
  else
    cp -R "$src" "$dest"
    echo "    copy    $dest"
  fi
}

[[ "$(uname)" == Darwin ]] || { echo "This setup is for macOS." >&2; exit 1; }

# ── Dependencies ──────────────────────────────────────────────────────────────
if [[ $DEPS == 1 ]]; then
  if ! command -v brew >/dev/null; then
    for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
      [[ -x $b ]] && eval "$($b shellenv)" && break
    done
  fi
  if ! command -v brew >/dev/null; then
    warn "Homebrew not found. Install it from https://brew.sh, then run this again."
    warn "(Or run with --skip-deps to only place the config files.)"
    exit 1
  fi

  say "Homebrew packages"
  # Plain strings, not arrays: macOS bash 3.2 errors on empty arrays under `set -u`.
  formulas="" casks=""
  if want hyper; then
    casks+=" font-fira-code-nerd-font"
    [[ -d /Applications/Hyper.app ]] || casks+=" hyper"   # may be installed outside Homebrew
  fi
  want starship && formulas+=" starship" && casks+=" font-fira-code-nerd-font"
  want zsh && formulas+=" starship fzf zoxide direnv zsh-completions nvm"
  formulas="$(printf '%s\n' $formulas | sort -u | xargs)"
  casks="$(printf '%s\n' $casks | sort -u | xargs)"
  if [[ -n $formulas ]]; then brew install $formulas; fi
  if [[ -n $casks ]]; then brew install --cask $casks; fi

  if want zsh; then
    if [[ ! -d "$HOME/.oh-my-zsh" ]]; then
      say "Oh My Zsh"
      RUNZSH=no KEEP_ZSHRC=yes CHSH=no sh -c \
        "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
    fi
    custom="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins"
    for plugin in zsh-autosuggestions zsh-syntax-highlighting; do
      [[ -d "$custom/$plugin" ]] || git clone --depth 1 "https://github.com/zsh-users/$plugin" "$custom/$plugin"
    done
    mkdir -p "$HOME/.nvm"
  fi
fi

# ── Config files ──────────────────────────────────────────────────────────────
if want hyper; then
  say "Hyper"
  # Same rule Hyper uses: $XDG_CONFIG_HOME/hyper if set, otherwise your home folder
  hyper_dir="${XDG_CONFIG_HOME:+$XDG_CONFIG_HOME/hyper}"
  hyper_dir="${hyper_dir:-$HOME}"
  place hyper/hyper.js "$hyper_dir/.hyper.js"
  place hyper/hyper-devdeck "$hyper_dir/.hyper_plugins/local/hyper-devdeck"
fi

if want starship; then
  say "Starship prompt"
  place starship/starship.toml "${STARSHIP_CONFIG:-$HOME/.config/starship.toml}"
fi

if want claude; then
  say "Claude Code status line"
  place claude/statusline.py "$HOME/.claude/statusline.py"
  settings="$HOME/.claude/settings.json"
  [[ -f "$settings" ]] && cp "$settings" "$settings.backup-$STAMP"
  # Merge only the statusLine key; keep every other setting as it is.
  python3 -I - "$settings" "$REPO/claude/statusline.settings.json" <<'PY'
import json, os, sys
path, snippet = sys.argv[1], sys.argv[2]
data = {}
if os.path.exists(path):
    with open(path) as f:
        data = json.load(f)
with open(snippet) as f:
    data.update(json.load(f))
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
  echo "    merged  statusLine into $settings"
fi

if want zsh; then
  say "zsh"
  place zsh/zshrc "$HOME/.zshrc"
  place zsh/zprofile "$HOME/.zprofile"
  if [[ ! -e "$HOME/.zsh_secrets" ]]; then
    printf '# API keys and tokens, e.g. export OPENAI_API_KEY=...\n# Loaded by ~/.zshrc. Keep it out of git.\n' > "$HOME/.zsh_secrets"
    chmod 600 "$HOME/.zsh_secrets"
    echo "    created $HOME/.zsh_secrets (chmod 600) for your API keys"
  fi
fi

say "Done. Next steps:"
want hyper && echo "    - Open Hyper. If it was already open: Plugins > Update All Now, then Cmd+Shift+R."
want zsh && echo "    - Open a new terminal tab. Install Node with: nvm install --lts && nvm alias default node"
want claude && echo "    - Restart Claude Code to pick up the new status line."
exit 0
