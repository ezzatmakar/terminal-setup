# terminal-setup

My macOS terminal setup: [Hyper](https://hyper.is) with a Warp-style session sidebar,
a [Starship](https://starship.rs) prompt, a Claude Code status line, and zsh with Oh My Zsh.
Everything uses the same **Dracula** colors and **FiraCode Nerd Font** icons.

## What's inside

| Folder | Installs to | What it is |
|---|---|---|
| `hyper/hyper.js` | `~/.hyper.js` | Hyper config: colors, font, sidebar options |
| `hyper/hyper-devdeck/` | `~/.hyper_plugins/local/hyper-devdeck` | Sidebar plugin: one row per tab with an icon for the running command, ⌘1–9 badges, activity dots, git branch, CPU load, split and collapse buttons |
| `starship/starship.toml` | `~/.config/starship.toml` | Two-line prompt: folder, git status, language versions, command duration |
| `claude/statusline.py` | `~/.claude/statusline.py` | Claude Code status line (see below) |
| `zsh/zshrc`, `zsh/zprofile` | `~/.zshrc`, `~/.zprofile` | Oh My Zsh, fast nvm loading, fzf, zoxide, direnv |

### Claude Code status line

```
󰚩 Opus 5.5   xhigh  󰧑 ━╸──────── 15% 149k/1M  󰇁 $6.13        󰔟 5h ━───────── 10%   3:00 PM · 3h27m
 ~/project   main +12 -3                                                    󰃭 7d 18%  󰈸 cache 53m
```

- **Left:** model, effort level, context used (bar, %, tokens), session cost; folder, git branch, lines changed this session.
- **Right:** 5-hour usage limit with reset time and countdown; 7-day limit and how long the prompt cache stays warm.
- Bars turn yellow and then red as they fill. On narrow windows, details drop first and then the right side moves to its own line.
- Parts that Claude Code doesn't report (for example usage limits when you use an API key) are hidden.
- If the right side wraps, raise `RIGHT_MARGIN` at the top of `statusline.py`.

## Install on a new Mac

1. Install [Homebrew](https://brew.sh).
2. Clone and run the installer:

   ```sh
   git clone https://github.com/ezzatmakar/terminal-setup.git ~/terminal-setup
   cd ~/terminal-setup
   ./install.sh
   ```

   It installs Hyper, FiraCode Nerd Font, Starship, fzf, zoxide, direnv, nvm and Oh My Zsh with
   its autosuggestion and syntax-highlighting plugins, then links the config files into place.
   Existing files are kept as `<name>.backup-<date>`.
   If Hyper was open while installing, quit and reopen it once. Until then it won't notice
   edits to the linked `~/.hyper.js`.

3. Open a new terminal, then install Node: `nvm install --lts && nvm alias default node`.
4. Put API keys in `~/.zsh_secrets` (created for you with `chmod 600`). It is loaded by `.zshrc` and never committed.

Options:

```sh
./install.sh hyper claude   # only some parts: hyper, starship, claude, zsh
./install.sh --copy         # copy files instead of symlinking them
./install.sh --skip-deps    # only place config files, install nothing
```

## Updating

Files are symlinked to this repo, so `git pull` updates them. After that:

- **Hyper / sidebar:** Plugins › Update All Now, then View › Reload (⌘⇧R). Your open tabs stay open.
  Avoid View › Full Reload, which closes them.
- **Starship, status line:** apply on the next prompt.
- **zsh:** open a new tab, or run `reload`.

Because the files are symlinks, edits you make on any Mac show up in `git status` here. That
includes lines that app installers (Herd, Docker, etc.) append to `~/.zshrc`, so review
before committing.

## Notes for editing the Hyper plugin

- Hyper wraps plugin CSS with `stylis('#hyper', css)`, which puts `#hyper ` in front of every
  selector. A top-level `:root { … }` or `body.x …` rule therefore never matches. Use `& { … }`
  (becomes `#hyper`) and `body.x & …` (becomes `body.x #hyper …`) instead.
- Hyper's main process caches the plugin's CSS. After editing `index.js`, use
  Plugins › Update All Now and then ⌘⇧R. ⌘⇧R alone only reloads the sidebar code.
- The installer puts a small loader in `~/.hyper_plugins/local/hyper-devdeck/` instead of a
  symlink. Hyper clears its plugin cache by folder path, and Node caches a symlinked plugin
  under the repo path, so Update All Now would keep running the old code.
- Hyper 3.4 ships Electron 20, whose time-zone data predates some recent DST changes
  (for example Egypt's in 2023). The sidebar clock takes the UTC offset from macOS (`date +%z`)
  to stay correct.

## Requirements

macOS with Homebrew (Apple Silicon or Intel), python3 for the status line, git.
