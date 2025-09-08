# KedoMind ✨

一款基于 Vue 3 + Vite + Electron 的桌面端 AI 知识工作台。

<p align="center"><a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a></p>

## 功能特点 🚀

- 🤖 多模型智能聊天：对话管理、上下文承接、角色配置
- 📚 知识与记录：聊天记录归档、筛选、移动与多会话管理
- 📝 Markdown/代码/公式：Markdown 渲染、代码高亮、KaTeX 数学公式
- 📊 可视化能力：ECharts 与 ECharts-GL（三维场景）
- 📤 数据导出与分享：导出图表、导出 Excel
- 🔧 MCP 工具集成：通过 Model Context Protocol 连接外部工具并调用
- 🌐 国际化与主题：内置多语言（i18n）与主题切换（明暗/品牌色）
- 💾 本地存储与性能：Pinia 持久化、IndexedDB（Dexie）、懒加载与分包
- 🖥️ 桌面级体验：系统托盘、无边框窗口、窗口控制、外链安全打开
- 🔒 安全与稳定：单实例运行、异常捕获、主渲染进程隔离

## 安装与运行（pnpm）📦

```bash
# 安装依赖
pnpm install

# 启动前端（Vite，默认 5174）
pnpm dev

# 前后端联调（同时启动 Vite 与 Electron 开发）
pnpm run electron:dev

# 仅启动 Electron（根据环境加载开发地址或打包产物）
pnpm run electron

# 构建前端静态资源（输出 dist/）
pnpm build

# 预览构建产物
pnpm preview
```

## 打包（pnpm）📦

```bash
# 构建前端并生成安装包（NSIS 安装器）
pnpm run electron:build

# 生成未签名目录包（便于检查）
pnpm run electron:pack

# 输出安装包到 dist-electron/
pnpm run electron:dist
```
