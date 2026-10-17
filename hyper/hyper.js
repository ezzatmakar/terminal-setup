"use strict";
// Hyper config: Tokyo Night theme (matches the Starship prompt) + hyper-devdeck
// sidebar (~/.hyper_plugins/local/hyper-devdeck). All options: https://hyper.is#cfg
// After editing plugins, press Cmd+Shift+R (View > Reload) to apply; open sessions stay.
module.exports = {
  config: {
    updateChannel: "stable",

    // ── Font ────────────────────────────────────────────────────────────────
    // Nerd Font so prompt + sidebar icons render; Fira Code ligatures enabled.
    fontSize: 13,
    fontFamily: '"FiraCode Nerd Font", "Fira Code", Menlo, monospace',
    uiFontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    fontWeight: "500",      // FiraCode Nerd Font Medium: crisper than Regular on dark bg
    fontWeightBold: "bold",
    lineHeight: 1.25,
    letterSpacing: 0,
    disableLigatures: false,

    // ── Theme: Tokyo Night ──────────────────────────────────────────────────
    // Brightened Tokyo Night: text, gray (autosuggestions/comments) and sidebar labels
    // raised to readable contrast; hues unchanged.
    foregroundColor: "#d0d8fa",
    backgroundColor: "#1a1b26",
    selectionColor: "rgba(122, 162, 247, 0.28)",
    borderColor: "#24283b",
    cursorColor: "#7aa2f7",
    cursorAccentColor: "#1a1b26",
    cursorShape: "BEAM",
    cursorBlink: true,
    colors: {
      black: "#15161e",
      red: "#f7768e",
      green: "#9ece6a",
      yellow: "#e0af68",
      blue: "#7aa2f7",
      magenta: "#bb9af7",
      cyan: "#7dcfff",
      white: "#a9b1d6",
      lightBlack: "#7a83b0",   // was #414868 (1.9:1, autosuggestions barely visible)
      lightRed: "#ff899d",
      lightGreen: "#9fe044",
      lightYellow: "#faba4a",
      lightBlue: "#8db0ff",
      lightMagenta: "#c7a9ff",
      lightCyan: "#a4daff",
      lightWhite: "#d0d8fa",
    },
    padding: "14px 18px",
    css: "",
    termCSS: "",

    // ── Sidebar (hyper-devdeck) ─────────────────────────────────────────────
    devdeck: {
      sidebarWidth: 240,     // px when expanded
      collapsedWidth: 78,    // px in icon-only mode (toggle from the sidebar footer)
      sidebarColor: "#16161e",
      surfaceColor: "#1f2335",
      activeColor: "#292e42",
      dimColor: "#9aa5ce",     // inactive tabs, footer text
      mutedColor: "#7a83b0",   // section label, subtitles, ⌘N badges
      showStats: true,       // CPU load meter in the footer
    },

    // ── Shell & behaviour ───────────────────────────────────────────────────
    shell: "/bin/zsh",
    shellArgs: ["--login"],
    env: {},
    workingDirectory: "",
    preserveCWD: true,       // new tabs/splits open in the current folder
    bell: false,
    copyOnSelect: false,
    quickEdit: false,
    defaultSSHApp: true,
    macOptionSelectionMode: "vertical",
    webGLRenderer: true,
    webLinksActivationKey: "",
    disableAutoUpdates: false,
    screenReaderMode: false,
    showHamburgerMenu: "",
    showWindowControls: "",
  },

  // npm plugins (none needed; the sidebar is a local plugin)
  plugins: [],

  // ~/.hyper_plugins/local/<name>
  localPlugins: ["hyper-devdeck"],

  keymaps: {},
};
