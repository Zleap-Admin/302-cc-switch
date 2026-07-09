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
- API Key 获取链接指向 `https://302.ai`（登录后进 API > API Keys；`dash.302.ai` 实测是 301 跳首页的别名，已弃用）

**2. 品牌**

- 应用名 `302 CC Switch`，bundle id `com.ai302.ccswitch`（原 `com.ccswitch.desktop`）
- 4 种语言 UI 文案、托盘、关于页全部改名；链接 ccswitch.io → 302.ai，仓库链接 → 本 fork
- README 重写为 302 版（仅 EN + ZH，删了日/德语版）；`assets/partners/` 整目录删除
- 302.AI logo（GitHub org 头像）注册为图标 `ai302`，名称含 "302" 的供应商自动推断此图标
- macOS 开机自启的 app 名匹配同步改为 `302 CC Switch`（`src-tauri/src/auto_launch.rs`，不改会静默失效）
- 深链接协议保持 `ccswitch://` 未动；配置目录已改为 `~/.302-cc-switch`（2026-07-09，与原版
  `~/.cc-switch` 完全隔离，不迁移旧数据；WebDAV/S3 默认远端根目录同步改为 `302-cc-switch-sync`）

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

1. **Gemini CLI 端点方向已初步验证**（2026-07-09）：无 key 请求
   `api.302.ai/v1beta/models/...:generateContent` 返回「缺少 302 API 密钥」，
   带假 key（`x-goog-api-key` 头）返回「无效的API KEY」——网关认识 Gemini 原生路径和鉴权头。
   → 仍需真 key 在 Gemini CLI 里跑通一次才算数
2. **各预设未用真 key 实测**：Claude / Codex / OpenClaw / OpenCode / Hermes 的 302 预设
   写法有官方文档或 302cc / 302oc CLI 佐证，但没有实际发过请求
3. ~~`dash.302.ai` 待确认~~ **已确认并修正**：官方指引是登录 `https://302.ai` 进
   API > API Keys，预设 `apiKeyUrl` 已全部改为 `https://302.ai`
4. **GUI 未肉眼检查**：预设列表只显示官方 + 302 这一点靠单测锁定，
   截图因终端无屏幕录制权限没拿到
5. **模型 ID 待确认**：预设里写的 `claude-opus-4-8` / `claude-sonnet-5` / `gpt-5.5`
   假设 302 与官方模型 ID 一致，需对照 302 后台模型列表
6. **发版链路未跑过**：需把 `~/.tauri/302-cc-switch.key` 填进仓库 Secrets
   `TAURI_SIGNING_PRIVATE_KEY` 后打 tag 试一次完整 release
7. **环境变量出入（新发现）**：302 官方 Claude Code 帮助页写的是 `ANTHROPIC_AUTH_TOKEN`，
   我们的预设按 302cc CLI 用的 `ANTHROPIC_API_KEY`。两者对应不同请求头
   （Bearer vs x-api-key），拿真 key 时测一下网关是否都收；不收就改成 AUTH_TOKEN

### ✅ 已完成：302 默认化（2026-07-09 实装）

「302 不是 default」两处都已改完，三个坑全绕过：

1. **添加供应商弹窗默认选中 302.AI**
   - `ProviderForm.tsx`：在 `handlePresetChange` 定义后加 effect——新建模式（无
     `initialData`）找 name 含 "302" 的 preset entry 调 `handlePresetChange(entry.id)`。
     用 `useRef` 按 appId 哨兵保证只触发一次（`handlePresetChange` 未 memo 化也不会循环）。
     覆盖 6 个 app（claude/codex/gemini/opencode/openclaw/hermes，preset 名均为 "302.AI"）
   - `ClaudeDesktopProviderForm.tsx`：同款 effect，布尔哨兵（该表单无 appId prop）
   - 编辑模式尊重 `initialData` 不强行套预设；用户手动切回「自定义」不会被覆盖
2. **首次启动自动种 302.AI（无 key 占位）**
   - `providers_seed.rs` 新增 `AI302_SEEDS`（4 条：Claude/ClaudeDesktop/Codex/Gemini），
     配置逐字段照抄前端预设；icon `ai302`、iconColor `#7C3AED`、website `https://302.ai`
   - 给种子结构体加 `category` 字段（坑 a）：官方 `"official"` / 302 `"aggregator"`，
     插入处读 `seed.category` 不再写死
   - 新增 `init_ai302_providers()` + 独立 flag `ai302_providers_seeded`（坑 b）：
     老库 `official_providers_seeded` 已 true 也能补种 302；`lib.rs` 启动流程接上
   - 命名诚实化（坑 c）：`is_official_seed_id` → `is_builtin_seed_id`、
     `OfficialProviderSeed` → `BuiltinProviderSeed`——结构体同时承载官方+302 两类种子，
     旧名是谎言；`is_builtin_seed_id` 扫两个数组，302 种子被认作内置，不挡 live 导入
3. **验证**
   - `tsc --noEmit` ✓；`vitest` 369/369 ✓；`cargo test` 1774/1774 ✓
     （含 5 个新种子单测：覆盖范围 / 分类 / 唯一 id / JSON 合法性 / Codex TOML 转义）
   - dev 启动截图**未做**：`pnpm tauri dev` 二进制链接撞上 cargo 跨 profile 缓存故障
     （`reqwest required in rlib format`——跑过 `cargo test` 再跑 bin 触发，与本次改动无关），
     需 `cargo clean` 重编；且截图无辅助功能权限点不进「添加」弹窗，验证不到默认选中。
     → **前端「默认选中 302」仅靠 code review + tsc；建议主理人点开各 app「添加供应商」肉眼确认**
   - 已用 `CC_SWITCH_TEST_HOME=/tmp/...` 隔离试跑（构建未通过即止），未触碰真实 `~/.cc-switch`

⚠️ 302 种子相关的两个灰区（属 MEMO 既有的「真 key 实测」待办，非本次回归）：
- **Codex 种子**：编辑时表单从 TOML 的 `wire_api="responses"` 反推 apiFormat=
  `openai_responses`，而 302 预设用的是 `openai_chat`（本地 Responses→Chat 转换）。
  种子只存 TOML 不存 meta，编辑补 key 后保存可能丢掉本地转换 → 拿真 key 验一次
- **Claude Desktop 种子**：env 留空 `ANTHROPIC_API_KEY`，编辑时表单因 key 为空把
  apiKeyField 默认成 `ANTHROPIC_AUTH_TOKEN`（后端 `direct_gateway_credentials` 正好要
  AUTH_TOKEN，反而能跑通）；与预设的 API_KEY 写法不一致 → 同样待真 key 验证

杂项备忘：
- 隔离试跑用 `CC_SWITCH_TEST_HOME`（`config.rs:23` 专为 CI/本地隔离真实数据而设）
- brew 原版 cc-switch 仍常驻后台共用 `~/.cc-switch`（实测 16:43 又写了一次）——
  本 fork 已于晚间改用独立目录 `~/.302-cc-switch`，与它彻底无关

### ✅ 已完成：数据目录独立 + 302 产品化（2026-07-09 晚间实装）

四个 commit，全部已在本机装机人工验收：

1. **数据目录独立**（`00ffb059`）：`~/.cc-switch` → `~/.302-cc-switch`，全仓 64 文件机械替换
   + 三处人工修正。**刻意不迁移旧数据**（旧目录归原版 app 所有）。WebDAV/S3 默认远端根同步改
   `302-cc-switch-sync`（防止与原版同步互相覆盖）；删掉上游 v3.10.3 的 Windows HOME 回退死代码。
   已用 lsof 实测双 app 同跑各写各库
2. **图标修复**（`ceb9a371`）：ai302 是 PNG，原来登记在 `icons`（内联 SVG map）导致 URL 被当
   SVG 文本渲染成乱码，移到 `iconUrls` 走 `<img>`
3. **302 产品化**（`63afe28f`）：
   - 302 种子不可删除：后端 `is_ai302_seed_id` 在 `ProviderService::delete` 入口拦截，
     前端 `isProtected` 禁用删除按钮（`ProviderCard` 按 id 前缀 `ai302-` 判定）
   - 精简 key 弹窗 `Ai302KeyDialog`：App.tsx 里 id 为 `ai302-*` 时替换 `EditProviderDialog`；
     只填 key（按 app 落到 ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY）
   - Claude 官方登录识别：live 导入时 env 无 BASE_URL/API_KEY/AUTH_TOKEN → 跳过 "default"
     落库，种子就位后把 claude-official 设为 current（镜像 Codex 的 has_login_material 逻辑）
   - 新增集成测试 2 个（官方识别跳过导入 / 302 删除被拒）
4. **key 验证 + 弹窗美化**（`da26ec63`）：「验证 Key」按钮打 `/v1/models`（复用
   `fetch_models_for_config`，走配置里实际生效的 base_url，兼容国内镜像域名）；
   401/403 → Key 无效，其余 → 网络问题（已用假 key 实测 302 返回 401）。
   布局按 app 弹窗规范（body `px-6 py-5`），key 输入复用 `ApiKeyInput`

设计决策：302 官方预设卡保持「只填 key 零配置」；想改模型（如 sonnet 换 GLM）的用户
用「复制」出副本卡走完整表单——副本 id 非 `ai302-*`，自动脱离保护与精简弹窗。

待办新增（除 MEMO 既有项外）：
- [ ] 领 key 链接暂定 `https://dash.302.ai/apis/list`（`src/config/ai302.ts`），待主理人确认
- [ ] 「自动领取 key」等 302 平台接口文档
- [ ] 精简弹窗加「模型方案」下拉（验证时已拿到模型清单，可直接复用）——主理人未拍板
- [ ] 真 key 全链路：验证 → 切换 → 实跑一次 Claude Code（确认 302 认识 CC 报的模型名）
- [ ] 主理人本机的历史 "default" 卡片需手动清理（切到 Claude Official 后删除）

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
- API-key link points to `https://302.ai` (log in → API > API Keys; `dash.302.ai` turned out to be a 301 alias to the homepage, dropped)

**2. Branding**

- Product name `302 CC Switch`, bundle id `com.ai302.ccswitch` (was `com.ccswitch.desktop`)
- All UI copy in 4 locales, tray, about page renamed; ccswitch.io links → 302.ai, repo links → this fork
- README rewritten (EN + ZH only; JA/DE deleted); `assets/partners/` removed entirely
- 302.AI logo registered as icon `ai302`; providers named "302*" auto-infer it
- macOS auto-launch app-name matching updated to `302 CC Switch` (`src-tauri/src/auto_launch.rs` — would silently break otherwise)
- Deep-link scheme stays `ccswitch://`; config dir moved to `~/.302-cc-switch` (2026-07-09, fully
  isolated from upstream's `~/.cc-switch`, no data migration; WebDAV/S3 default remote root is now
  `302-cc-switch-sync`)

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

1. **Gemini CLI endpoint direction pre-verified** (2026-07-09): keyless requests to
   `api.302.ai/v1beta/models/...:generateContent` return "Missing 302 Apikey", and a fake
   `x-goog-api-key` returns "Invalid API Key" — the gateway recognizes the Gemini-native
   path and auth header. Still needs a real-key run through Gemini CLI to count
2. **No preset has been exercised with a real API key** — configs follow 302 docs / 302cc / 302oc CLI, but no live request was made
3. ~~`dash.302.ai` unconfirmed~~ **Confirmed & fixed**: official guidance is to log in at
   `https://302.ai` → API > API Keys; all preset `apiKeyUrl`s now point to `https://302.ai`
4. **GUI not eyeballed** — the official+302-only list is locked by unit tests; no screenshot (terminal lacks screen-recording permission)
5. **Model IDs unconfirmed** — presets assume 302 mirrors official IDs (`claude-opus-4-8`, `claude-sonnet-5`, `gpt-5.5`); cross-check against the 302 dashboard model list
6. **Release pipeline untested** — add `~/.tauri/302-cc-switch.key` to repo secret `TAURI_SIGNING_PRIVATE_KEY`, then tag a test release

### ✅ Done: make 302 the default (implemented 2026-07-09)

Both changes shipped; all three traps handled:

1. **Add-provider dialog defaults to 302.AI**
   - `ProviderForm.tsx`: effect placed after `handlePresetChange` — in create mode (no
     `initialData`) finds the preset whose name contains "302" and calls
     `handlePresetChange(entry.id)`. A `useRef` guard keyed on appId fires it once (no loop
     even though `handlePresetChange` isn't memoized). Covers all 6 apps.
   - `ClaudeDesktopProviderForm.tsx`: same effect, boolean guard (that form has no appId prop).
   - Edit mode respects `initialData`; a manual switch back to "custom" isn't overridden.
2. **Seed a keyless 302.AI on first launch**
   - `providers_seed.rs` adds `AI302_SEEDS` (4: Claude/ClaudeDesktop/Codex/Gemini), configs
     copied field-for-field from the frontend presets.
   - Added a `category` field to the seed struct (trap a): "official" / "aggregator"; insert
     reads `seed.category` instead of hardcoding.
   - New `init_ai302_providers()` + independent flag `ai302_providers_seeded` (trap b): old DBs
     where `official_providers_seeded=true` still get 302 seeded; wired into the `lib.rs` startup.
   - Honest rename (trap c): `is_official_seed_id` → `is_builtin_seed_id`,
     `OfficialProviderSeed` → `BuiltinProviderSeed` — the struct now holds both official and
     aggregator seeds, so the old name was a lie. `is_builtin_seed_id` scans both arrays, so
     302 seeds count as built-in and don't block live import.
3. **Verification**
   - `tsc --noEmit` ✓; `vitest` 369/369 ✓; `cargo test` 1774/1774 ✓
     (5 new seed unit tests: coverage / category / unique ids / JSON validity / Codex TOML escaping)
   - Dev-launch screenshot **not done**: `pnpm tauri dev` bin linking hit a cargo cross-profile
     cache glitch (`reqwest required in rlib format` — triggered by running `cargo test` then
     the bin; unrelated to this change), needs `cargo clean`; and without accessibility
     permission the "Add" dialog can't be clicked open, so the default-selection can't be
     screenshotted anyway. → **the frontend default-302 is code-review + tsc only; 主理人
     should click "Add provider" per app to eyeball it.**
   - Tried an isolated run via `CC_SWITCH_TEST_HOME` (stopped at the failed build); the real
     `~/.cc-switch` was never touched.

⚠️ Two gray areas around the 302 seeds (these fall under the memo's existing "real-key test"
TODOs, not regressions from this batch):
- **Codex seed**: on edit the form infers apiFormat=`openai_responses` from the TOML's
  `wire_api="responses"`, whereas the 302 preset uses `openai_chat` (local Responses→Chat
  conversion). The seed stores only the TOML (no meta), so editing + saving may drop the
  local conversion → verify with a real key.
- **Claude Desktop seed**: env holds an empty `ANTHROPIC_API_KEY`, so on edit the form
  defaults apiKeyField to `ANTHROPIC_AUTH_TOKEN` (which the backend's
  `direct_gateway_credentials` requires anyway — actually works); inconsistent with the
  preset's API_KEY style → also pending real-key verification.

Misc: isolated runs use `CC_SWITCH_TEST_HOME` (`config.rs:23`, purpose-built for CI/local
data isolation). The brew original cc-switch still runs in the background writing to
`~/.cc-switch` — irrelevant since the evening batch moved this fork to `~/.302-cc-switch`.

### ✅ Done: independent data dir + 302 productization (evening of 2026-07-09)

Four commits, all installed and eyeballed on this Mac:

1. **Independent data dir** (`00ffb059`): `~/.cc-switch` → `~/.302-cc-switch`, 64 files of
   mechanical replacement + three manual fixes. **Deliberately no migration** (the old dir
   belongs to the original app). WebDAV/S3 default remote root changed to
   `302-cc-switch-sync` (prevents sync clobbering with upstream); dropped upstream v3.10.3's
   Windows HOME legacy-db fallback (dead code here). Verified with lsof: both apps running
   side by side each hold their own DB.
2. **Icon fix** (`ceb9a371`): ai302 is a PNG; it was registered in `icons` (the inline-SVG
   map) so its URL rendered as literal text. Moved to `iconUrls` → `<img>`.
3. **302 productization** (`63afe28f`):
   - 302 seeds undeletable: backend `is_ai302_seed_id` guard at the top of
     `ProviderService::delete`; frontend `isProtected` disables the delete button
     (`ProviderCard` keys off the `ai302-` id prefix)
   - Minimal key dialog `Ai302KeyDialog`: App.tsx swaps it in for `EditProviderDialog` when
     the id is `ai302-*`; key lands in ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
     per app
   - Official-login detection for Claude: live import with no BASE_URL/API_KEY/AUTH_TOKEN in
     env skips creating "default"; startup then sets claude-official as current (mirrors
     Codex's has_login_material logic)
   - Two new integration tests (official-login skip / 302 delete rejected)
4. **Key verification + dialog polish** (`da26ec63`): a "Verify key" button hits
   `/v1/models` (reuses `fetch_models_for_config`, using the base_url actually in the
   config, so the cn mirror keeps working); 401/403 → invalid key, anything else → network
   (confirmed with a bogus key: 302 returns 401). Layout follows the app's dialog spec
   (body `px-6 py-5`); key input reuses `ApiKeyInput`.

Design decision: the official 302 seed card stays "key only, zero config"; users who want
model remapping (e.g. sonnet → GLM) duplicate the card — the copy's id isn't `ai302-*`, so
it automatically loses both the protection and the minimal dialog.

New TODOs (besides the memo's existing ones):
- [ ] Key-page link is tentatively `https://dash.302.ai/apis/list` (`src/config/ai302.ts`) — owner to confirm
- [ ] "Auto-claim key" waits on 302 platform API docs
- [ ] Model-plan dropdown in the minimal dialog (the verify call already returns the model list) — not yet approved
- [ ] Real-key end-to-end: verify → switch → run Claude Code once (confirm 302 knows the model names CC requests)
- [ ] The owner's own machine still has the historical "default" card (switch to Claude Official, then delete it)

### Deliberately kept (gray areas)

- Coding-plan quota queries (`codingPlanProviders.ts`, incl. Kimi/Zhipu vendor routing) — a feature, not an ad
- NewAPI template in the universal-provider panel — self-hosted gateway template
- Third-party vendor icons in the icon library — used by the custom-provider icon picker
- GitHub Copilot / Codex OAuth / AWS Bedrock **presets** removed, but all feature code remains; restoring = re-adding preset entries
