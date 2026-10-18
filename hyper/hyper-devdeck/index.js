'use strict';
// hyper-devdeck: Warp-style vertical tab sidebar + developer chrome for Hyper 3.x.
//
// The sidebar replaces Hyper's <Tabs>. All layout CSS is scoped to `body.dd-on`,
// which the sidebar adds when it mounts, so if it ever fails to render Hyper
// falls back to its normal top tabs instead of a broken layout.
//
// Options (in ~/.hyper.js → config.devdeck): sidebarWidth, collapsedWidth,
// sidebarColor, surfaceColor, activeColor, dimColor, mutedColor, showStats.
//
// Editing this file: Hyper's main process caches it (it builds the CSS), so run
// Plugins › Update All Now, then Cmd+Shift+R. Cmd+Shift+R alone only reloads the sidebar code.

const DEFAULTS = {
  sidebarWidth: 240,
  collapsedWidth: 78, // macOS traffic lights need ~76px
  sidebarColor: '#21222c',
  surfaceColor: '#282a36',
  activeColor: '#343746',
  dimColor: '#a9b1cd',
  mutedColor: '#8995bb',
  showStats: true,
};

// Nerd Font glyphs (checked present in FiraCode Nerd Font)
const G = {
  terminal: '', folder: '', branch: '', node: '',
  php: '', laravel: '', git: '', docker: '',
  server: '', python: '', editor: '', db: '',
  brew: '', ai: '\u{f06a9}', ruby: '', rust: '', go: '',
  java: '', cloud: '', monitor: '', close: '',
  add: '', splitRight: '', splitDown: '', collapse: '',
  expand: '', cpu: '', clock: '', claude: '✻',
};

// Icon colour per kind (CSS variables defined below)
const KIND_COLOR = {
  dir: 'var(--dd-accent)', shell: 'var(--dd-accent)', server: 'var(--dd-yellow)',
  claude: 'var(--dd-claude)', ai: 'var(--dd-magenta)', node: 'var(--dd-green)',
  php: 'var(--dd-magenta)', laravel: 'var(--dd-red)', git: 'var(--dd-orange)',
  docker: 'var(--dd-accent)', python: 'var(--dd-yellow)', editor: 'var(--dd-green)',
  db: 'var(--dd-cyan)', brew: 'var(--dd-yellow)', ruby: 'var(--dd-red)',
  rust: 'var(--dd-orange)', go: 'var(--dd-cyan)', java: 'var(--dd-red)',
  cloud: 'var(--dd-orange)', monitor: 'var(--dd-teal)', cmd: 'var(--dd-cyan)',
};

const KIND_GLYPH = {
  dir: G.folder, shell: G.terminal, server: G.server, claude: G.claude, ai: G.ai,
  node: G.node, php: G.php, laravel: G.laravel, git: G.git, docker: G.docker,
  python: G.python, editor: G.editor, db: G.db, brew: G.brew, ruby: G.ruby,
  rust: G.rust, go: G.go, java: G.java, cloud: G.cloud, monitor: G.monitor,
  cmd: G.terminal,
};

const RULES = [
  [/^claude$/, 'claude'],
  [/^(codex|aider|cursor-agent|agent|gemini|opencode|qwen|hermes|ollama|cmd|cmdc)$/, 'ai'],
  [/^(node|npm|npx|pnpm|pnpx|yarn|bun|bunx|deno|nest|next|vite|tsc|tsx|ts-node|nodemon|turbo|nx|corepack)$/, 'node'],
  [/^(php|composer|herd|laravel|valet|sail|pest|phpunit|wp)$/, 'php'],
  [/^(git|gh|lazygit|tig)$/, 'git'],
  [/^(docker|docker-compose|podman|kubectl|k9s|helm)$/, 'docker'],
  [/^(ssh|scp|sftp|mosh|rsync|telnet)$/, 'server'],
  [/^(python3?|pip3?|uv|uvx|poetry|pytest|jupyter|ipython)$/, 'python'],
  [/^(n?vim|vi|nano|emacs|hx|micro)$/, 'editor'],
  [/^(mysql|psql|redis-cli|mongosh|sqlite3|pgcli|mycli)$/, 'db'],
  [/^brew$/, 'brew'],
  [/^(ruby|gem|bundle|rails|rake|pod)$/, 'ruby'],
  [/^(cargo|rustc|rustup)$/, 'rust'],
  [/^go$/, 'go'],
  [/^(java|gradle|gradlew|mvn|flutter|dart)$/, 'java'],
  [/^(wrangler|vercel|netlify|firebase|aws|gcloud|fly|railway)$/, 'cloud'],
  [/^(top|htop|btop|ps|lsof)$/, 'monitor'],
];

const PREFIX_WORD = /^(sudo|env|time|exec|nohup|command|noglob)$/;

function classify(word, line) {
  if (/\bartisan\b/.test(line)) return 'laravel';
  for (const [re, kind] of RULES) if (re.test(word)) return kind;
  return 'cmd';
}

function basename(p) {
  const trimmed = p.replace(/\/+$/, '');
  if (!trimmed) return '/';
  return trimmed.slice(trimmed.lastIndexOf('/') + 1) || trimmed;
}

function parentDir(p) {
  const trimmed = p.replace(/\/+$/, '');
  const i = trimmed.lastIndexOf('/');
  if (i < 0) return trimmed === '~' ? 'home' : '';
  if (i === 0) return '/';
  return trimmed.slice(0, i);
}

// Turn a terminal title into { kind, idle, path?, host?, cmd? }.
// Oh My Zsh sets "user@host:~/path" at the prompt and the command line while running.
function parseTitle(raw, localHost) {
  const title = String(raw || '').trim();
  const prompt = title.match(/^([^@\s:]+)@([^:\s]+):\s?(.*)$/);
  if (prompt) {
    const host = prompt[2];
    const remote = Boolean(localHost) && host.split('.')[0].toLowerCase() !== localHost;
    return { kind: remote ? 'server' : 'dir', idle: true, path: prompt[3] || '~', host, remote };
  }
  if (/^[~/]/.test(title)) return { kind: 'dir', idle: true, path: title };
  if (!title || title === 'Shell' || /^-?(zsh|bash|fish|sh|login)$/.test(title)) {
    return { kind: 'shell', idle: true, path: null };
  }
  // Claude Code titles start with a spinner/sparkle glyph
  if (/^[✠-✿·⠀-⣿*]/.test(title) || /claude code/i.test(title)) {
    return { kind: 'claude', idle: false, cmd: title.replace(/^[^\w~/.]+\s*/, '') || 'Claude Code' };
  }
  const words = title.split(/\s+/);
  let i = 0;
  while (i < words.length - 1 && (PREFIX_WORD.test(words[i]) || /^\w+=/.test(words[i]))) i++;
  const word = (words[i] || '').replace(/^.*\//, '');
  return { kind: classify(word, title), idle: false, cmd: title };
}

function expandHome(p) {
  if (!p) return null;
  const home = process.env.HOME || '';
  if (p === '~') return home;
  if (p.startsWith('~/')) return home + p.slice(1);
  return p.startsWith('/') ? p : null;
}

function readCollapsed() {
  try { return window.localStorage.getItem('devdeck.collapsed') === '1'; } catch (e) { return false; }
}

function writeCollapsed(value) {
  try { window.localStorage.setItem('devdeck.collapsed', value ? '1' : '0'); } catch (e) { /* ignore */ }
}

function options() {
  try {
    const cfg = window.config && window.config.getConfig ? window.config.getConfig() : {};
    return Object.assign({}, DEFAULTS, cfg.devdeck || {});
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

function runCommand(name) {
  try { window.rpc.emit('command', name); } catch (e) { console.error('[devdeck]', e); }
}

// ── Git status for the active tab's folder ──────────────────────────────────
function gitStatus(dir, cb) {
  let execFile;
  try { ({ execFile } = require('child_process')); } catch (e) { cb(null); return; }
  execFile(
    'git',
    ['-C', dir, 'status', '--porcelain=v1', '--branch', '--untracked-files=normal'],
    { timeout: 2000, maxBuffer: 1 << 20 },
    (err, stdout) => {
      if (err) { cb(null); return; }
      const lines = String(stdout).split('\n').filter(Boolean);
      const head = (lines[0] || '').replace(/^## /, '');
      let branch = head.split('...')[0].replace(/^No commits yet on /, '').replace(/ \[.*\]$/, '');
      if (branch.startsWith('HEAD (no branch)')) branch = 'detached';
      const ahead = (head.match(/ahead (\d+)/) || [])[1];
      const behind = (head.match(/behind (\d+)/) || [])[1];
      cb({ branch, changes: Math.max(0, lines.length - 1), ahead: ahead ? +ahead : 0, behind: behind ? +behind : 0 });
    }
  );
}

function systemLoad() {
  try {
    const os = require('os');
    const cores = os.cpus().length || 1;
    const load = os.loadavg()[0];
    return { load, pct: Math.min(100, Math.round((load / cores) * 100)) };
  } catch (e) {
    return null;
  }
}

// Hyper's Electron 20 ships time-zone data from before Egypt brought DST back
// (2023), so Date's local time is an hour off. Ask macOS for the UTC offset.
const osOffset = { minutes: null, at: 0 };
function refreshOsOffset(onChange) {
  if (Date.now() - osOffset.at < 10 * 60 * 1000) return;
  osOffset.at = Date.now();
  try {
    require('child_process').execFile('date', ['+%z'], { timeout: 1000 }, (err, out) => {
      const m = !err && String(out).trim().match(/^([+-])(\d\d)(\d\d)$/);
      const minutes = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null;
      if (minutes !== osOffset.minutes) { osOffset.minutes = minutes; if (onChange) onChange(); }
    });
  } catch (e) { /* keep the last known offset */ }
}

function clockText(ms) {
  const fmt = { hour: '2-digit', minute: '2-digit' };
  if (osOffset.minutes == null) return new Date(ms).toLocaleTimeString([], fmt);
  return new Date(ms + osOffset.minutes * 60000).toLocaleTimeString([], Object.assign({ timeZone: 'UTC' }, fmt));
}

function localHostName() {
  try { return require('os').hostname().split('.')[0].toLowerCase(); } catch (e) { return ''; }
}

// ── CSS ──────────────────────────────────────────────────────────────────────
// Hyper runs config.css through stylis('#hyper', css), which prefixes every
// selector with "#hyper ". So `:root` and `body.x …` would never match; use `&`
// (= #hyper) and `body.x & …` (= body.x #hyper …) instead.
// "#rrggbb" + alpha -> "rgba(r,g,b,a)", so highlight tints follow the theme colors.
function tint(hex, alpha) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function buildCSS(cfg) {
  const o = Object.assign({}, DEFAULTS, cfg.devdeck || {});
  const c = cfg.colors || {};
  // Fallbacks are Dracula, matching ~/.hyper.js.
  const accent = c.blue || '#bd93f9';
  const red = c.red || '#ff5555';
  return `
& {
  --dd-w: ${o.sidebarWidth}px;
  --dd-bg: ${o.sidebarColor};
  --dd-surface: ${o.surfaceColor};
  --dd-active: ${o.activeColor};
  --dd-hover: rgba(255,255,255,0.045);
  --dd-border: ${cfg.borderColor || '#343746'};
  --dd-fg: ${cfg.foregroundColor || '#f8f8f2'};
  --dd-dim: ${o.dimColor};
  --dd-muted: ${o.mutedColor};
  --dd-accent: ${accent};
  --dd-magenta: ${c.magenta || '#ff79c6'};
  --dd-green: ${c.green || '#50fa7b'};
  --dd-yellow: ${c.yellow || '#f1fa8c'};
  --dd-red: ${red};
  --dd-cyan: ${c.cyan || '#8be9fd'};
  --dd-orange: #ffb86c;
  --dd-teal: ${c.cyan || '#8be9fd'};
  --dd-claude: #d97757;
  --dd-mono: ${cfg.fontFamily || 'monospace'};
  --dd-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
}
body.dd-collapsed & { --dd-w: ${o.collapsedWidth}px; }

/* Layout: header becomes a left sidebar, terminals shift right */
body.dd-on & .header_header.header_header {
  top: 0; left: 0; bottom: 0; right: auto;
  width: var(--dd-w);
  border-radius: 0;
  background: var(--dd-bg);
  border-right: 1px solid var(--dd-border);
  box-shadow: 1px 0 24px rgba(0,0,0,0.25);
}
body.dd-on & .terms_terms.terms_terms { margin-top: 0 !important; left: var(--dd-w); animation: none; }

/* Sidebar shell */
.dd-nav {
  height: 100%; display: flex; flex-direction: column;
  font-family: var(--dd-sans); font-size: 12px; color: var(--dd-fg);
  -webkit-user-select: none; -webkit-app-region: no-drag; cursor: default;
}
.dd-drag {
  flex: 0 0 46px; -webkit-app-region: drag;
  display: flex; align-items: center; justify-content: flex-end; padding: 0 14px;
}
.dd-full .dd-drag { flex-basis: 14px; }
.dd-clock { font-family: var(--dd-mono); font-size: 11px; color: var(--dd-muted); letter-spacing: .02em; }

.dd-head {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px 6px 18px;
  font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--dd-muted);
}
.dd-count {
  padding: 1px 7px; border-radius: 10px; background: var(--dd-surface); color: var(--dd-dim);
  letter-spacing: 0; font-family: var(--dd-mono); font-weight: 500;
}
.dd-btn {
  width: 24px; height: 24px; border: 0; border-radius: 6px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--dd-dim); cursor: pointer;
  font-family: var(--dd-mono); font-size: 14px; outline: none;
  transition: background .12s ease, color .12s ease;
}
.dd-btn:hover { background: var(--dd-hover); color: var(--dd-fg); }
.dd-head .dd-btn { margin-left: auto; }

/* Tab list */
.dd-list { list-style: none; margin: 0; padding: 2px 0 8px; flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.dd-list::-webkit-scrollbar { width: 6px; }
.dd-list::-webkit-scrollbar-thumb { background: var(--dd-surface); border-radius: 6px; }
.dd-tab {
  position: relative; display: flex; align-items: center; gap: 10px;
  margin: 2px 8px; padding: 7px 8px 7px 10px; border-radius: 8px;
  color: var(--dd-dim); cursor: pointer;
  transition: background .12s ease, color .12s ease, box-shadow .12s ease;
}
.dd-tab:hover { background: var(--dd-hover); color: var(--dd-fg); }
.dd-tab.is-active {
  background: var(--dd-active); color: var(--dd-fg);
  box-shadow: inset 0 0 0 1px ${tint(accent, 0.16)}, 0 6px 18px rgba(0,0,0,0.25);
}
.dd-tab.is-active::before {
  content: ''; position: absolute; left: -8px; top: 9px; bottom: 9px; width: 3px;
  border-radius: 0 3px 3px 0; background: linear-gradient(180deg, var(--dd-accent), var(--dd-magenta));
}
.dd-ico {
  flex: 0 0 22px; height: 22px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--dd-mono); font-size: 14px; background: rgba(255,255,255,0.035);
}
.dd-tab.is-active .dd-ico { background: ${tint(accent, 0.12)}; }
.dd-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.dd-title { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dd-sub {
  font-family: var(--dd-mono); font-size: 10.5px; color: var(--dd-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dd-tab.is-active .dd-sub { color: var(--dd-dim); } /* muted is too faint on the active bg */
.dd-tab.is-running .dd-title { font-family: var(--dd-mono); font-weight: 500; font-size: 11.5px; }
.dd-kbd {
  flex: 0 0 auto; font-family: var(--dd-mono); font-size: 10px; color: var(--dd-muted);
  padding: 1px 5px; border: 1px solid var(--dd-border); border-radius: 5px;
}
.dd-close { display: none; width: 20px; height: 20px; font-size: 12px; }
.dd-tab:hover .dd-close { display: inline-flex; }
.dd-tab:hover .dd-kbd { display: none; }
.dd-close:hover { color: var(--dd-red); background: ${tint(red, 0.12)}; }
.dd-dot { position: absolute; left: 27px; top: 6px; width: 7px; height: 7px; border-radius: 50%; border: 2px solid var(--dd-bg); }
.dd-dot.activity { background: var(--dd-teal); }
.dd-dot.running { background: var(--dd-green); animation: dd-pulse 1.6s ease-in-out infinite; }
@keyframes dd-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.8); } }

/* Footer: context for the active tab */
.dd-foot {
  flex: 0 0 auto; border-top: 1px solid var(--dd-border);
  padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 7px;
  font-family: var(--dd-mono); font-size: 11px; color: var(--dd-dim);
}
.dd-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dd-row .i { flex: 0 0 14px; text-align: center; color: var(--dd-muted); }
.dd-row .v { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dd-branch { color: var(--dd-magenta); }
.dd-dirty { color: var(--dd-yellow); }
.dd-clean { color: var(--dd-green); }
.dd-sync { color: var(--dd-cyan); }
.dd-meter { flex: 1 1 auto; height: 4px; border-radius: 4px; background: var(--dd-surface); overflow: hidden; }
.dd-meter > i { display: block; height: 100%; border-radius: 4px; transition: width .6s ease; }
.dd-actions { display: flex; gap: 2px; margin: 2px -6px 0; }
.dd-actions .dd-btn:last-child { margin-left: auto; }

/* Collapsed (icons only) */
body.dd-collapsed & .dd-text, body.dd-collapsed & .dd-kbd, body.dd-collapsed & .dd-close,
body.dd-collapsed & .dd-label, body.dd-collapsed & .dd-clock, body.dd-collapsed & .dd-foot .v,
body.dd-collapsed & .dd-meter, body.dd-collapsed & .dd-row-git { display: none !important; }
body.dd-collapsed & .dd-head { justify-content: center; padding: 6px 0; }
body.dd-collapsed & .dd-head .dd-btn { margin-left: 0; }
body.dd-collapsed & .dd-tab { justify-content: center; padding: 8px 0; }
body.dd-collapsed & .dd-ico { flex-basis: 30px; height: 30px; font-size: 16px; }
body.dd-collapsed & .dd-dot { left: 18px; }
body.dd-collapsed & .dd-foot { align-items: center; padding: 10px 0 12px; }
body.dd-collapsed & .dd-actions { flex-direction: column; margin: 0; }
body.dd-collapsed & .dd-actions .dd-btn:last-child { margin-left: 0; }

/* Terminal polish */
/* Dim inactive split panes (the inner .term_wrapper never gets .term_active, so skip it) */
body.dd-on & .term_fit:not(.term_active):not(.term_wrapper) { opacity: 0.6; transition: opacity .15s ease; }
body.dd-on & .splitpane_divider { background-color: var(--dd-border) !important; }
`;
}

function buildTermCSS(cfg) {
  const accent = (cfg.colors || {}).blue || '#bd93f9';
  return `
.xterm-viewport::-webkit-scrollbar { width: 8px; }
.xterm-viewport::-webkit-scrollbar-track { background: transparent; }
.xterm-viewport::-webkit-scrollbar-thumb { background: ${tint(accent, 0.18)}; border-radius: 8px; }
.xterm-viewport::-webkit-scrollbar-thumb:hover { background: ${tint(accent, 0.35)}; }
`;
}

exports.decorateConfig = (config) => {
  try {
    return Object.assign({}, config, {
      css: (config.css || '') + buildCSS(config),
      termCSS: (config.termCSS || '') + buildTermCSS(config),
    });
  } catch (e) {
    console.error('[devdeck] decorateConfig failed', e);
    return config;
  }
};

// ── Sidebar ─────────────────────────────────────────────────────────────────
exports.decorateTabs = (Tabs, { React }) => {
  const h = React.createElement;
  const localHost = localHostName();

  class Sidebar extends React.Component {
    constructor(props) {
      super(props);
      this.state = { collapsed: readCollapsed(), git: null, gitDir: null, now: Date.now(), sys: systemLoad() };
      this.lastPath = {}; // tab uid → last folder seen at the prompt
      this.gitSeq = 0;
      this.activeDir = null;
      this.tick = this.tick.bind(this);
      this.onOffset = () => { if (this.mounted) this.setState({ now: Date.now() }); };
    }

    componentDidMount() {
      this.mounted = true;
      document.body.classList.add('dd-on');
      document.body.classList.toggle('dd-collapsed', this.state.collapsed);
      this.timer = setInterval(this.tick, 10000);
      refreshOsOffset(this.onOffset);
      this.refit();
      this.refreshGit();
    }

    componentWillUnmount() {
      this.mounted = false;
      clearInterval(this.timer);
      document.body.classList.remove('dd-on', 'dd-collapsed');
      this.refit();
    }

    componentDidUpdate(prevProps) {
      const wasIdle = this.activeInfo(prevProps).idle;
      const info = this.activeInfo(this.props);
      // refresh git when the active folder changes or a command just finished
      if (this.activeDir !== this.state.gitDir || (!wasIdle && info.idle)) this.refreshGit();
    }

    tick() {
      refreshOsOffset(this.onOffset);
      this.setState({ now: Date.now(), sys: systemLoad() });
      if (document.hasFocus()) this.refreshGit(); // skip background git polling while Hyper is unfocused
    }

    refit() {
      const fire = () => window.dispatchEvent(new Event('resize'));
      setTimeout(fire, 0);
      setTimeout(fire, 250);
    }

    activeInfo(props) {
      const tab = (props.tabs || []).find((t) => t.isActive) || (props.tabs || [])[0];
      return tab ? parseTitle(tab.title, localHost) : { idle: true };
    }

    refreshGit() {
      const dir = this.activeDir;
      const seq = ++this.gitSeq;
      if (!dir) { if (this.state.git) this.setState({ git: null, gitDir: null }); return; }
      gitStatus(dir, (git) => {
        if (seq === this.gitSeq) this.setState({ git, gitDir: dir });
      });
    }

    toggleCollapsed() {
      const collapsed = !this.state.collapsed;
      writeCollapsed(collapsed);
      document.body.classList.toggle('dd-collapsed', collapsed);
      this.setState({ collapsed });
      this.refit();
    }

    action(name) {
      return (e) => { e.stopPropagation(); runCommand(name); };
    }

    renderTab(tab, index) {
      const { onChange, onClose } = this.props;
      const info = parseTitle(tab.title, localHost);
      if (info.idle && info.path) this.lastPath[tab.uid] = info.path;
      const lastPath = this.lastPath[tab.uid];

      let title;
      let sub;
      if (info.kind === 'server') {
        title = info.host;
        sub = info.path;
      } else if (info.idle && info.path) {
        title = basename(info.path);
        sub = parentDir(info.path) || ' ';
      } else if (info.idle) {
        title = 'zsh';
        sub = 'shell';
      } else {
        title = info.cmd;
        sub = lastPath ? `in ${basename(lastPath)}` : 'running';
      }

      const classes = ['dd-tab'];
      if (tab.isActive) classes.push('is-active');
      if (!info.idle) classes.push('is-running');

      return h('li', {
        key: tab.uid,
        className: classes.join(' '),
        title: tab.title || 'Shell',
        onClick: () => onChange && onChange(tab.uid),
        onMouseUp: (e) => { if (e.button === 1 && onClose) onClose(tab.uid); },
        onDoubleClick: (e) => e.stopPropagation(),
      },
        h('span', { className: 'dd-ico', style: { color: KIND_COLOR[info.kind] || 'var(--dd-accent)' } }, KIND_GLYPH[info.kind] || G.terminal),
        !info.idle ? h('span', { className: 'dd-dot running' }) : tab.hasActivity ? h('span', { className: 'dd-dot activity' }) : null,
        h('span', { className: 'dd-text' },
          h('span', { className: 'dd-title' }, title),
          h('span', { className: 'dd-sub' }, sub)),
        index < 9 ? h('span', { className: 'dd-kbd' }, `⌘${index + 1}`) : null,
        h('button', {
          className: 'dd-btn dd-close',
          title: 'Close tab (⌘W)',
          onClick: (e) => { e.stopPropagation(); if (onClose) onClose(tab.uid); },
        }, G.close)
      );
    }

    renderFooter(info) {
      const { git, sys } = this.state;
      const dirLabel = this.activeDir ? this.activeDir.replace(process.env.HOME || '\u0000', '~') : (info.kind === 'server' ? `${info.host}` : '—');
      const rows = [
        h('div', { className: 'dd-row', key: 'dir', title: this.activeDir || '' },
          h('span', { className: 'i' }, info.kind === 'server' ? G.server : G.folder),
          h('span', { className: 'v' }, dirLabel)),
      ];
      if (git) {
        rows.push(h('div', { className: 'dd-row dd-row-git', key: 'git' },
          h('span', { className: 'i dd-branch' }, G.branch),
          h('span', { className: 'v' },
            h('span', { className: 'dd-branch' }, git.branch),
            git.changes ? h('span', { className: 'dd-dirty' }, `  ● ${git.changes}`) : h('span', { className: 'dd-clean' }, '  ✓'),
            git.ahead ? h('span', { className: 'dd-sync' }, `  ⇡${git.ahead}`) : null,
            git.behind ? h('span', { className: 'dd-sync' }, `  ⇣${git.behind}`) : null)));
      }
      if (options().showStats && sys) {
        const color = sys.pct > 80 ? 'var(--dd-red)' : sys.pct > 50 ? 'var(--dd-yellow)' : 'var(--dd-green)';
        rows.push(h('div', { className: 'dd-row', key: 'cpu', title: `Load average (1 min): ${sys.load.toFixed(2)}` },
          h('span', { className: 'i' }, G.cpu),
          h('span', { className: 'dd-meter' }, h('i', { style: { width: `${Math.max(3, sys.pct)}%`, background: color } })),
          h('span', { className: 'v' }, `${sys.load.toFixed(1)}`)));
      }
      rows.push(h('div', { className: 'dd-actions', key: 'actions' },
        h('button', { className: 'dd-btn', title: 'Split right (⌘D)', onClick: this.action('pane:splitRight') }, G.splitRight),
        h('button', { className: 'dd-btn', title: 'Split down (⇧⌘D)', onClick: this.action('pane:splitDown') }, G.splitDown),
        h('button', {
          className: 'dd-btn',
          title: this.state.collapsed ? 'Expand sidebar' : 'Collapse sidebar',
          onClick: (e) => { e.stopPropagation(); this.toggleCollapsed(); },
        }, this.state.collapsed ? G.expand : G.collapse)));
      return h('footer', { className: 'dd-foot', onDoubleClick: (e) => e.stopPropagation() }, rows);
    }

    render() {
      const tabs = this.props.tabs || [];
      const info = this.activeInfo(this.props);
      const activeTab = tabs.find((t) => t.isActive) || tabs[0];
      const activePath = info.idle && info.kind === 'dir' ? info.path : activeTab ? this.lastPath[activeTab.uid] : null;
      this.activeDir = info.kind === 'server' ? null : expandHome(activePath);
      const clock = clockText(this.state.now);

      return h('nav', { className: `dd-nav${this.props.fullScreen ? ' dd-full' : ''}` },
        h('div', { className: 'dd-drag' }, h('span', { className: 'dd-clock' }, clock)),
        h('div', { className: 'dd-head', onDoubleClick: (e) => e.stopPropagation() },
          h('span', { className: 'dd-label' }, 'Sessions'),
          h('span', { className: 'dd-count' }, String(tabs.length)),
          h('button', { className: 'dd-btn', title: 'New tab (⌘T)', onClick: this.action('tab:new') }, G.add)),
        h('ul', { className: 'dd-list' }, tabs.map((tab, i) => this.renderTab(tab, i))),
        this.renderFooter(info));
    }
  }

  // If the sidebar throws, show Hyper's original tabs and drop the sidebar layout.
  class SafeSidebar extends React.Component {
    constructor(props) {
      super(props);
      this.state = { failed: false };
    }

    static getDerivedStateFromError() {
      return { failed: true };
    }

    componentDidCatch(error) {
      console.error('[devdeck] sidebar crashed, falling back to default tabs', error);
      document.body.classList.remove('dd-on', 'dd-collapsed');
      window.dispatchEvent(new Event('resize'));
    }

    render() {
      return this.state.failed ? h(Tabs, this.props) : h(Sidebar, this.props);
    }
  }

  return SafeSidebar;
};

// Exposed for tests
exports._internal = { parseTitle, basename, parentDir, buildCSS, clockText, osOffset };
