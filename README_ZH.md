<div align="center">

# 302 CC Switch

### Claude Code / Claude Desktop / Codex / Gemini CLI / OpenCode / OpenClaw / Hermes Agent 供应商切换器 — [302.AI](https://302.ai) 版

[English](README.md) | 中文 | [更新日志](CHANGELOG.md)

</div>

302 CC Switch 是 [cc-switch](https://github.com/farion1231/cc-switch)（MIT）的 fork。它保留原版全部功能，把每个工具的预设列表精简为两类：**官方**与 **302.AI**。填入 302.AI API Key，选择工具，即可切换。

## 与上游的区别

- 移除全部第三方 / 赞助商供应商预设
- **302.AI** 作为内置预设覆盖全部 7 个工具
  - Anthropic 兼容端点：`https://api.302.ai`（Claude Code、Claude Desktop、OpenClaw、OpenCode）
  - OpenAI 兼容端点：`https://api.302.ai/v1`（Codex、Hermes）
  - 国内节点 `https://api.302ai.cn` 已加入端点候选，可测速切换
- 自动更新指向本仓库的 Releases

API Key 在 [302.AI 管理后台](https://dash.302.ai) 获取，以 `sk-` 开头。

## 功能

与上游 cc-switch v3.16.x 完全一致：

- **供应商管理** — 7 个工具一键切换、统一供应商（一份配置同步 Claude Code / Codex / Gemini CLI）、托盘快捷切换、导入导出
- **代理与容灾** — 本地代理热切换、格式转换、自动故障转移、熔断器、健康监测
- **MCP / 提示词 / Skills** — 统一 MCP 面板双向同步、Markdown 提示词编辑（CLAUDE.md / AGENTS.md / GEMINI.md）、GitHub/ZIP 一键安装 Skills
- **用量与成本** — 花费、请求数、token 仪表盘，支持按模型自定义价格
- **会话管理与工作区** — 浏览恢复历史会话；OpenClaw agent 文件编辑器
- **系统** — 云同步（自定义配置目录 + WebDAV）、深链接（`ccswitch://`）、深色/浅色主题、开机自启、自动更新、多语言（zh / zh-TW / en / ja）

## 开发

环境要求：Node.js 20+、pnpm、Rust stable（Tauri 2）。

```bash
pnpm install        # 安装依赖
pnpm dev            # 热重载开发模式
pnpm typecheck      # TypeScript 检查
pnpm test:unit      # 单元测试
pnpm build          # 生产构建
```

## 致谢与许可

Fork 自 Jason Young 的 [farion1231/cc-switch](https://github.com/farion1231/cc-switch)，遵循 [MIT 许可证](LICENSE)。
