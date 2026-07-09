# 302 CC Switch — Fork Memo / 改造备忘录

> Fork of [farion1231/cc-switch](https://github.com/farion1231/cc-switch) v3.16.5 (MIT).
> Rebranded and repurposed for 302.AI on 2026-07-09, commit `2382bf82`.

---

## 中文

### 改了什么

**1. 预设清洗（核心改动）**

7 个客户端的预设列表全部重写，各文件只保留「官方 + 302.AI」，共删约 13,000 行第三方/赞助商预设：

| 文件（`src/config/`） | 保留条目 |
|---|---|
| `claudeProviderPresets.ts` | Claude Official + 302.AI |
| `codexProviderPresets.ts` | OpenAI Official + 302.AI |
| `geminiProviderPresets.ts` | Google Official + 302.AI + 自定义模板 |
| `claudeDesktopProviderPresets.ts` | Claude Desktop Official + 302.AI |
| `opencodeProviderPresets.ts` | 302.AI + 两个 Oh My OpenCode 自定义模板 |
| `openclawProviderPresets.ts` | 302.AI（OpenClaw 无官方供应商） |
| `hermesProviderPresets.ts` | Nous Research（官方）+ 302.AI |
| `universalProviderPresets.ts` | 未动（NewAPI / 自定义网关是网关模板，非供应商） |

302.AI 端点约定：
- **Anthropic 兼容**：`https://api.302.ai`（Claude Code / Claude Desktop / OpenClaw；OpenCode 用 `/v1`）
- **OpenAI 兼容**：`https://api.302.ai/v1`（Codex 走 chat completions 本地转换、Hermes）
- **国内节点**：`https://api.302ai.cn` 放进了各预设的端点候选（地址管理里可测速切换）
- Claude Code 预设按官方 302cc CLI 的写法用 `ANTHROPIC_API_KEY`（不是 AUTH_TOKEN）
- API Key 获取链接指向 `https://dash.302.ai`

**2. 品牌**

- 应用名 `302 CC Switch`，bundle id `com.ai302.ccswitch`（原 `com.ccswitch.desktop`）
- 4 种语言 UI 文案、托盘、关于页全部改名；链接 ccswitch.io → 302.ai，仓库链接 → 本 fork
- README 重写为 302 版（仅 EN + ZH，删了日/德语版）；`assets/partners/` 整目录删除
- 302.AI logo（GitHub org 头像）注册为图标 `ai302`，名称含 "302" 的供应商自动推断此图标
- macOS 开机自启的 app 名匹配同步改为 `302 CC Switch`（`src-tauri/src/auto_launch.rs`，不改会静默失效）
- 深链接协议保持 `ccswitch://` 未动；配置目录仍是 `~/.cc-switch`（数据兼容）

**3. 更新与发版**

- 更新器指向本 repo Releases；已生成新签名密钥对，**私钥在本机 `~/.tauri/302-cc-switch.key`（空密码，未入库）**
- `release.yml` 产物改名 `302-CC-Switch-*`；latest.json 组装是模式匹配，不受影响
- flatpak 三个文件改名换 id 为 `com.ai302.ccswitch`

**4. 测试**

- 删了 9 个专测已移除供应商的测试文件
- 新增 `tests/config/ai302ProviderPresets.test.ts`，锁死「每个应用只有官方 + 302.AI」的约定

### 已验证 ✓

- `tsc --noEmit` 零错误
- 前端 vitest：58 文件 369 测试全过
- Rust `cargo check` + `cargo test`：1770 测试全过
- `pnpm tauri dev` 真机启动成功，进程稳定运行，前端无报错
- 更新器日志确认在请求新 endpoint（404 是因为还没发过 Release，属预期）

### ⚠️ 待验证（后续要做）

1. **Gemini CLI 的 302 端点是推测的**：302 官方文档没有 Gemini CLI 页面，
   `GOOGLE_GEMINI_BASE_URL=https://api.302.ai` 是照其他中转商的通用写法配的。
   → 拿真 key 在 Gemini CLI 里跑一次；不通就改掉或删掉这条预设
2. **各预设未用真 key 实测**：Claude / Codex / OpenClaw / OpenCode / Hermes 的 302 预设
   写法有官方文档或 302cc / 302oc CLI 佐证，但没有实际发过请求
3. **`dash.302.ai` 作为拿 Key 的链接是推断的**，请确认后台地址
4. **GUI 未肉眼检查**：预设列表只显示官方 + 302 这一点靠单测锁定，
   截图因终端无屏幕录制权限没拿到
5. **模型 ID 待确认**：预设里写的 `claude-opus-4-8` / `claude-sonnet-5` / `gpt-5.5`
   假设 302 与官方模型 ID 一致，需对照 302 后台模型列表
6. **发版链路未跑过**：需把 `~/.tauri/302-cc-switch.key` 填进仓库 Secrets
   `TAURI_SIGNING_PRIVATE_KEY` 后打 tag 试一次完整 release

### 刻意保留的灰色地带

- Coding Plan 配额查询（`codingPlanProviders.ts`，含 Kimi/智谱等厂商路由）——功能非广告
- 统一供应商面板的 NewAPI 模板——自部署网关模板
- 图标库里的第三方厂商图标——自定义供应商选图标时用
- GitHub Copilot / Codex OAuth / AWS Bedrock 的**预设**删了，但功能代码都在，要恢复只需加回预设条目

---

## English

### What changed

**1. Preset cleanup (the core change)**

All 7 tools' preset lists were rewritten to contain only **official + 302.AI**, deleting ~13,000 lines of third-party/sponsor presets (see table above for surviving entries per file in `src/config/`).

302.AI endpoint conventions:
- **Anthropic-compatible**: `https://api.302.ai` (Claude Code / Claude Desktop / OpenClaw; OpenCode uses `/v1`)
- **OpenAI-compatible**: `https://api.302.ai/v1` (Codex via local chat-completions conversion, Hermes)
- **Mainland China node** `https://api.302ai.cn` added to endpoint candidates for speed testing
- Claude Code preset uses `ANTHROPIC_API_KEY` (not AUTH_TOKEN), matching the official 302cc CLI
- API-key link points to `https://dash.302.ai`

**2. Branding**

- Product name `302 CC Switch`, bundle id `com.ai302.ccswitch` (was `com.ccswitch.desktop`)
- All UI copy in 4 locales, tray, about page renamed; ccswitch.io links → 302.ai, repo links → this fork
- README rewritten (EN + ZH only; JA/DE deleted); `assets/partners/` removed entirely
- 302.AI logo registered as icon `ai302`; providers named "302*" auto-infer it
- macOS auto-launch app-name matching updated to `302 CC Switch` (`src-tauri/src/auto_launch.rs` — would silently break otherwise)
- Deep-link scheme stays `ccswitch://`; config dir stays `~/.cc-switch` (data compatibility)

**3. Updater & release**

- Updater points to this repo's releases; a new signing keypair was generated —
  **private key lives at `~/.tauri/302-cc-switch.key` on this Mac (empty password, not committed)**
- `release.yml` artifacts renamed to `302-CC-Switch-*`; latest.json assembly is pattern-based and unaffected
- Flatpak files renamed to `com.ai302.ccswitch`

**4. Tests**

- 9 vendor-specific preset test files deleted
- New `tests/config/ai302ProviderPresets.test.ts` locks the "official + 302.AI only" invariant

### Verified ✓

- `tsc --noEmit` clean; vitest 369/369 passing
- Rust `cargo check` + `cargo test` 1770/1770 passing
- `pnpm tauri dev` launches and runs stably, no frontend errors
- Updater log confirms it now hits the new endpoint (404 expected — no release published yet)

### ⚠️ Verification still to do

1. **Gemini CLI endpoint is a guess** — 302 docs have no Gemini CLI page;
   `GOOGLE_GEMINI_BASE_URL=https://api.302.ai` follows the pattern other relays use.
   → Test with a real key; fix or drop the preset if it fails
2. **No preset has been exercised with a real API key** — configs follow 302 docs / 302cc / 302oc CLI, but no live request was made
3. **`dash.302.ai` as the API-key URL is inferred** — confirm the dashboard address
4. **GUI not eyeballed** — the official+302-only list is locked by unit tests; no screenshot (terminal lacks screen-recording permission)
5. **Model IDs unconfirmed** — presets assume 302 mirrors official IDs (`claude-opus-4-8`, `claude-sonnet-5`, `gpt-5.5`); cross-check against the 302 dashboard model list
6. **Release pipeline untested** — add `~/.tauri/302-cc-switch.key` to repo secret `TAURI_SIGNING_PRIVATE_KEY`, then tag a test release

### Deliberately kept (gray areas)

- Coding-plan quota queries (`codingPlanProviders.ts`, incl. Kimi/Zhipu vendor routing) — a feature, not an ad
- NewAPI template in the universal-provider panel — self-hosted gateway template
- Third-party vendor icons in the icon library — used by the custom-provider icon picker
- GitHub Copilot / Codex OAuth / AWS Bedrock **presets** removed, but all feature code remains; restoring = re-adding preset entries
