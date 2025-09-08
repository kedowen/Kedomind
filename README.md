# KedoMind ✨

A desktop AI workspace built with Vue 3 + Vite + Electron.

<p align="center"><a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a></p>

## Features 🚀

- 🤖 Multi-model chat: conversation management, context carryover, role presets
- 📚 Knowledge & records: archive, filter, move, multi-session management
- 📝 Markdown/Code/Math: Markdown rendering, syntax highlight, KaTeX
- 📊 Visualization: ECharts and ECharts-GL (3D scenes)
- 📤 Export & sharing: export charts, export Excel
- 🔧 MCP integration: connect and call external tools via Model Context Protocol
- 🌐 I18n & theme: built-in locales and theme switching (light/dark, brand colors)
- 💾 Local-first & performance: Pinia persistence, IndexedDB (Dexie), lazy loading & code splitting
- 🖥️ Desktop UX: system tray, frameless window, window controls, safe external links
- 🔒 Security & stability: single-instance, error handling, process isolation

## Install & Run (pnpm) 📦

```bash
pnpm install
pnpm dev                 # start Vite (default 5174)
pnpm run electron:dev    # start Vite + Electron (dev)
pnpm run electron        # start Electron only
pnpm build               # build web (dist/)
pnpm preview             # preview build
```

## Packaging (pnpm) 📦

```bash
pnpm run electron:build  # build web + NSIS installer
pnpm run electron:pack   # build web + unpacked dir
pnpm run electron:dist   # output to dist-electron/
```
