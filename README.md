<div align="center">

# 302 CC Switch

### Provider switcher for Claude Code, Claude Desktop, Codex, Gemini CLI, OpenCode, OpenClaw & Hermes Agent — the [302.AI](https://302.ai) edition

English | [中文](README_ZH.md) | [Changelog](CHANGELOG.md)

</div>

302 CC Switch is a fork of [cc-switch](https://github.com/farion1231/cc-switch) (MIT). It keeps every feature of the original app and strips the preset list down to two kinds of providers per tool: the **official** one and **302.AI**. Bring your 302.AI API key, pick a tool, and switch.

## What's different from upstream

- All third-party / sponsor provider presets removed
- **302.AI** ships as a built-in preset for all 7 supported tools
  - Anthropic-compatible endpoint: `https://api.302.ai` (Claude Code, Claude Desktop, OpenClaw, OpenCode)
  - OpenAI-compatible endpoint: `https://api.302.ai/v1` (Codex, Hermes)
  - Mainland China node `https://api.302ai.cn` available in endpoint candidates for speed testing
- Auto-updates point to this repository's releases

Get an API key from the [302.AI dashboard](https://dash.302.ai) — it starts with `sk-`.

## Features

Everything from upstream cc-switch v3.16.x:

- **Provider management** — One-click switching across 7 tools, universal providers that sync one config to Claude Code / Codex / Gemini CLI, system tray quick access, import/export
- **Proxy & failover** — Local proxy with hot-switching, format conversion, auto-failover, circuit breaker, health monitoring
- **MCP, prompts & skills** — Unified MCP panel with bidirectional sync, Markdown prompt editor (CLAUDE.md / AGENTS.md / GEMINI.md), one-click skill install from GitHub/ZIP
- **Usage & cost tracking** — Spending, requests, and token dashboards with per-model pricing
- **Session manager & workspace** — Browse and restore conversation history; OpenClaw agent-file editor
- **System** — Cloud sync (custom config dir + WebDAV), deep links (`ccswitch://`), dark/light theme, auto-launch, auto-updater, i18n (zh / zh-TW / en / ja)

## Development

Requirements: Node.js 20+, pnpm, Rust stable (Tauri 2).

```bash
pnpm install        # install dependencies
pnpm dev            # dev mode with hot reload
pnpm typecheck      # TypeScript check
pnpm test:unit      # unit tests
pnpm build          # production build
```

## Credits & License

Forked from [farion1231/cc-switch](https://github.com/farion1231/cc-switch) by Jason Young. Licensed under the [MIT License](LICENSE).
