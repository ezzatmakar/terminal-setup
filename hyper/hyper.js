"use strict";
// Hyper config: Dracula text colors on Tokyo Night background (matches the Starship prompt) + hyper-devdeck
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

    // ── Theme: Dracula text on Tokyo Night background ───────────────────────
    // Text/ANSI colors are the official Dracula palette (draculatheme.com); the
    // darker Tokyo Night background is kept. Only lightBlack is lifted for contrast.
    foregroundColor: "#f8f8f2",
    backgroundColor: "#1a1b26",
    selectionColor: "rgba(189, 147, 249, 0.30)",   // Dracula purple
    borderColor: "#343746",                       // Dracula "BG light": window, splits, sidebar edges
    cursorColor: "#ff79c6",                        // Dracula pink
    cursorAccentColor: "#1a1b26",
    cursorShape: "BEAM",
    cursorBlink: true,
    colors: {
      black: "#15161e",
      red: "#ff5555",
      green: "#50fa7b",
      yellow: "#f1fa8c",
      blue: "#bd93f9",         // Dracula maps ANSI blue to purple
      magenta: "#ff79c6",
      cyan: "#8be9fd",
      white: "#f8f8f2",
      lightBlack: "#8995bb",   // autosuggestions/comments: Dracula comment #6272a4 lifted (3.6:1 -> 5.8:1)
      lightRed: "#ff6e6e",
      lightGreen: "#69ff94",
      lightYellow: "#ffffa5",
      lightBlue: "#d6acff",
      lightMagenta: "#ff92df",
      lightCyan: "#a4ffff",
      lightWhite: "#ffffff",
    },
    padding: "14px 18px",
    css: "",
    termCSS: "",

    // ── Sidebar (hyper-devdeck) ─────────────────────────────────────────────
    devdeck: {
      sidebarWidth: 240,     // px when expanded
      collapsedWidth: 78,    // px in icon-only mode (toggle from the sidebar footer)
      sidebarColor: "#21222c",   // Dracula sidebar shades (from the Dracula VS Code theme)
      surfaceColor: "#282a36",   // badges, CPU meter track
      activeColor: "#343746",    // active tab
      dimColor: "#a9b1cd",     // inactive tabs, footer text
      mutedColor: "#8995bb",   // section label, subtitles, ⌘N badges
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
