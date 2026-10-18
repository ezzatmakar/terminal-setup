#!/usr/bin/env python3
"""Claude Code status line: Dracula colors + Nerd Font icons.

  Line 1  model · effort · context bar · cost           5h limit bar · reset time · countdown
  Line 2  folder · git branch · session +/- lines        7d limit · prompt-cache countdown

Reads the JSON Claude Code pipes on stdin. The right-hand blocks are aligned to
$COLUMNS minus RIGHT_MARGIN; when a line is too narrow they lose detail, then
move to a line of their own. Every segment is optional: missing fields (API-key
users have no rate_limits, older versions have no prompt_cache) are skipped.

Needs a Nerd Font (FiraCode Nerd Font) in the terminal.
Enable in ~/.claude/settings.json:
  "statusLine": {"type": "command", "command": "python3 -I -S ~/.claude/statusline.py", "padding": 0}
"""
import json
import os
import re
import subprocess
import sys
import time
import unicodedata

# Claude Code indents the status line, so it is narrower than the terminal.
# Raise this if the right-hand blocks wrap; lower it to push them further right.
RIGHT_MARGIN = 4
BAR_CELLS = 10

# Dracula (same palette as ~/.hyper.js and starship.toml).
# Keys are roles: blue = Dracula purple, magenta = pink, teal = cyan.
C = {
    'fg': '#f8f8f2', 'muted': '#8995bb', 'track': '#44475a',
    'blue': '#bd93f9', 'cyan': '#8be9fd', 'teal': '#8be9fd', 'green': '#50fa7b',
    'yellow': '#f1fa8c', 'orange': '#ffb86c', 'red': '#ff5555', 'magenta': '#ff79c6',
}

ICON = {
    'model': '\U000F06A9',     # 󰚩 robot
    'effort': '',        #  bolt
    'context': '\U000F09D1',   # 󰧑 brain
    'cost': '\U000F01C1',      # 󰇁 dollar
    'five_hour': '\U000F051F', # 󰔟 hourglass
    'reset': '',         #  rotate
    'seven_day': '\U000F00ED', # 󰃭 calendar
    'cache_warm': '\U000F0238',  # 󰈸 fire
    'cache_cold': '\U000F0717',  # 󰜗 snowflake
    'folder': '',        #  open folder
    'branch': '',        #  git branch
    'worktree': '\U000F0645',  # 󰙅 file tree
}

EFFORT_COLOR = {'low': 'green', 'medium': 'blue', 'high': 'yellow', 'xhigh': 'orange', 'max': 'red'}

RESET = '\033[0m'
ANSI_RE = re.compile(r'\033\[[0-9;]*m')


def paint(text, color, bold=False):
    r, g, b = (int(C[color][i:i + 2], 16) for i in (1, 3, 5))
    return f"\033[{'1;' if bold else ''}38;2;{r};{g};{b}m{text}{RESET}"


def width(text):
    """Terminal cells: wide/fullwidth chars take 2, combining marks 0, the rest
    (including Nerd Font private-use glyphs) 1."""
    cells = 0
    for ch in ANSI_RE.sub('', text):
        if unicodedata.combining(ch):
            continue
        cells += 2 if unicodedata.east_asian_width(ch) in ('W', 'F') else 1
    return cells


def dig(data, *keys):
    for key in keys:
        if not isinstance(data, dict):
            return None
        data = data.get(key)
    return data


def num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def level_color(pct, warn=70, high=90):
    return 'red' if pct >= high else 'yellow' if pct >= warn else 'green'


def bar(pct, color):
    """Thin progress bar with half-cell precision: ━━╸───────"""
    halves = round(max(0.0, min(100.0, pct)) / 100 * BAR_CELLS * 2)
    full, half = divmod(halves, 2)
    filled = '━' * full + ('╸' if half else '')
    return paint(filled, color) + paint('─' * (BAR_CELLS - full - half), 'track')


def duration(seconds):
    seconds = int(seconds)
    if seconds < 60:
        return '<1m'
    hours, minutes = divmod(seconds // 60, 60)
    if hours >= 24:
        return f'{hours // 24}d{hours % 24}h'
    return f'{hours}h{minutes:02d}m' if hours else f'{minutes}m'


def clock(epoch):
    return time.strftime('%-I:%M %p', time.localtime(epoch))


def tokens(count):
    count = int(count)
    if count >= 1_000_000:
        return f'{count / 1_000_000:.1f}'.rstrip('0').rstrip('.') + 'M'
    return f'{round(count / 1000)}k' if count >= 1000 else str(count)


def git(cwd, *args):
    try:
        out = subprocess.run(['git', '-C', cwd, *args], capture_output=True, text=True, timeout=1)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


def short_path(path):
    home = os.path.expanduser('~')
    if path == home or path.startswith(home + '/'):
        path = '~' + path[len(home):]
    parts = path.split('/')
    return '…/' + '/'.join(parts[-2:]) if len(parts) > 3 else path


# ── Segments: each returns a list of variants, most detailed first ────────────

def seg_model(d):
    name = dig(d, 'model', 'display_name') or dig(d, 'model', 'id')
    if not name:
        return []
    return [f"{paint(ICON['model'], 'magenta')} {paint(name, 'fg', bold=True)}"]


def seg_effort(d):
    level = dig(d, 'effort', 'level')
    if not level:
        return []
    color = EFFORT_COLOR.get(level, 'muted')
    return [f"{paint(ICON['effort'], color)} {paint(level, color)}"]


def seg_context(d):
    pct = num(dig(d, 'context_window', 'used_percentage'))
    if pct is None:
        return []
    color = level_color(pct, warn=50, high=80)
    head = f"{paint(ICON['context'], 'cyan')} {bar(pct, color)} {paint(f'{pct:.0f}%', color)}"
    used = num(dig(d, 'context_window', 'total_input_tokens'))
    size = num(dig(d, 'context_window', 'context_window_size'))
    variants = [head]
    if used is not None and size:
        variants.insert(0, f"{head} {paint(f'{tokens(used)}/{tokens(size)}', 'muted')}")
    return variants


def seg_cost(d):
    cost = num(dig(d, 'cost', 'total_cost_usd'))
    if cost is None:
        return []
    return [f"{paint(ICON['cost'], 'yellow')} {paint(f'${cost:.2f}', 'yellow')}"]


def seg_five_hour(d, now):
    pct = num(dig(d, 'rate_limits', 'five_hour', 'used_percentage'))
    if pct is None:
        return []
    color = level_color(pct)
    head = f"{paint(ICON['five_hour'], color)} {paint('5h', 'muted')} {bar(pct, color)} {paint(f'{pct:.0f}%', color)}"
    resets = num(dig(d, 'rate_limits', 'five_hour', 'resets_at'))
    if resets is None or resets <= now:
        return [head]
    at = f"{paint(ICON['reset'], 'blue')} {paint(clock(resets), 'fg')}"
    left = paint(f'· {duration(resets - now)}', 'muted')
    return [f'{head}  {at} {left}', f'{head}  {at}', head]


def seg_folder(d):
    cwd = dig(d, 'workspace', 'current_dir') or d.get('cwd')
    if not cwd:
        return []
    return [f"{paint(ICON['folder'], 'blue')} {paint(short_path(cwd), 'blue')}"]


def seg_worktree(d):
    name = dig(d, 'worktree', 'name')
    return [f"{paint(ICON['worktree'], 'teal')} {paint(name, 'teal')}"] if name else []


def seg_git(d):
    cwd = dig(d, 'workspace', 'current_dir') or d.get('cwd')
    if not cwd or not os.path.isdir(cwd):
        return []
    branch = git(cwd, 'symbolic-ref', '--short', '-q', 'HEAD') or git(cwd, 'rev-parse', '--short', 'HEAD')
    if not branch:
        return []
    text = f"{paint(ICON['branch'], 'magenta')} {paint(branch, 'magenta')}"
    added = int(num(dig(d, 'cost', 'total_lines_added')) or 0)
    removed = int(num(dig(d, 'cost', 'total_lines_removed')) or 0)
    churn = ' '.join(s for s in (
        paint(f'+{added}', 'green') if added else '',
        paint(f'-{removed}', 'red') if removed else '') if s)
    return [f'{text} {churn}', text] if churn else [text]


def seg_seven_day(d):
    pct = num(dig(d, 'rate_limits', 'seven_day', 'used_percentage'))
    if pct is None:
        return []
    color = level_color(pct)
    return [f"{paint(ICON['seven_day'], color)} {paint('7d', 'muted')} {paint(f'{pct:.0f}%', color)}"]


def seg_cache(d, now):
    cache = d.get('prompt_cache')
    if not isinstance(cache, dict):
        return []
    expires = num(cache.get('expires_at'))
    if cache.get('warm') and expires and expires > now:
        return [f"{paint(ICON['cache_warm'], 'orange')} {paint('cache', 'muted')} {paint(duration(expires - now), 'orange')}"]
    return [f"{paint(ICON['cache_cold'], 'cyan')} {paint('cache cold', 'cyan')}"]


# ── Layout ────────────────────────────────────────────────────────────────────

def join(segments):
    return '  '.join(s for s in segments if s)


def variants_of(segments):
    """Lines from the segments, dropping detail one segment at a time
    (rightmost segment first) until every segment is at its shortest form."""
    picks = [0] * len(segments)
    out = [join(seg[0] for seg in segments)]
    for i in reversed(range(len(segments))):
        while picks[i] < len(segments[i]) - 1:
            picks[i] += 1
            out.append(join(seg[p] for seg, p in zip(segments, picks)))
    return out


def layout(left_segs, right_segs, cols):
    left_segs = [s for s in left_segs if s]
    right_segs = [s for s in right_segs if s]
    lefts = variants_of(left_segs) if left_segs else ['']
    if not right_segs:
        return [lefts[0]]
    rights = variants_of(right_segs)
    for right in rights:          # prefer keeping right-side detail, then trim the left
        for left in lefts:
            gap = cols - width(left) - width(right)
            if gap >= 3:
                return [left + ' ' * gap + right]
    left = next((l for l in lefts if width(l) <= cols), lefts[-1])
    right = rights[-1]
    return [left, ' ' * max(0, cols - width(right)) + right]


def render(d, cols):
    now = time.time()
    line1 = layout(
        [seg_model(d), seg_effort(d), seg_context(d), seg_cost(d)],
        [seg_five_hour(d, now)], cols)
    line2 = layout(
        [seg_folder(d), seg_worktree(d), seg_git(d)],
        [seg_seven_day(d), seg_cache(d, now)], cols)
    return '\n'.join(line1 + line2)


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except ValueError:
        data = {}
    try:
        cols = int(os.environ.get('COLUMNS', '0')) or 100
    except ValueError:
        cols = 100
    try:
        print(render(data if isinstance(data, dict) else {}, max(20, cols - RIGHT_MARGIN)))
    except Exception:  # a crashing status line shows nothing; fall back to the model name
        print(dig(data, 'model', 'display_name') or 'Claude')


if __name__ == '__main__':
    main()
