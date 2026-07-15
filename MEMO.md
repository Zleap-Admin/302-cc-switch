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
- 配置目录已改为 `~/.302-cc-switch`（2026-07-09，与原版 `~/.cc-switch` 完全隔离，不迁移
  旧数据；WebDAV/S3 默认远端根目录同步改为 `302-cc-switch-sync`）
- 2026-07-15 做轻量共存隔离：安装包只注册 `ccswitch302://`（解析器仍兼容旧
  `ccswitch://`），默认代理端口改为 `30221`（v13 把仍为 `15721` 的记录迁走，其它端口
  保留），Claude Desktop Profile 使用 302 独立 ID/名称；不检测或提示原版是否安装
- `~/.claude`、`~/.codex` 等真实客户端配置仍是两个切换器共同管理的目标；若两者同时切换
  同一客户端，仍以最后一次写入为准，这部分不通过后台检测或常驻协调来处理

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

✅ 2026-07-15 已消除 302 种子的两个配置灰区（真 key 端到端实测仍归上方待办）：
- **Codex 种子**：新种子写入 `meta.apiFormat="openai_chat"`；旧卡片启动时只补缺失值，
  保留用户已经明确设置的格式和 API Key，确保本地 Responses→Chat 转换判断一致
- **Claude Desktop 种子**：新种子和预设统一写 `ANTHROPIC_AUTH_TOKEN`；前后端继续读取
  历史 `ANTHROPIC_API_KEY`，再次保存时无损迁移到 AUTH_TOKEN；两字段并存时优先 AUTH_TOKEN

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
     只填 key（Claude 落到 ANTHROPIC_API_KEY，Claude Desktop 落到 ANTHROPIC_AUTH_TOKEN，
     其余按 app 落到 OPENAI_API_KEY / GEMINI_API_KEY）
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

### ✅ 已修复：Codex 切换供应商的记账顺序 bug（2026-07-14）

主理人反馈 Codex 切到 "OpenAI Official" 后界面显示"使用中"，但实际请求仍打到
`https://api.302.ai/v1/responses`，报 401 Invalid API Key。排查是通过直接比对三处状态
（`~/.codex/config.toml` 落盘文件、应用数据库 `providers.is_current`、本机 `settings.json` 的
`currentProviderCodex`）实测出来的，不是靠猜：

- 根因：`switch_normal`（`src-tauri/src/services/provider/mod.rs`）之前是**先**把"当前供应商"
  记到 `settings.json` + DB，**再**去写 live 的 `config.toml`/`auth.json`。如果写 live 那步没有
  真正生效（本次没查清最初触发原因），记账已经先跑到前面去了。
- 恶化机制：下次任意切换时，「回填」逻辑会信任这个记账，把当时磁盘上（其实还是上一个第三方
  供应商）的配置当成"官方供应商自己的配置"存回数据库——把 302.AI 的 `[model_providers.custom]`
  路由表焊死进了 `codex-official` 这一行的存档，此后无论怎么切都会把这段污染的配置写回 live，
  死循环。
- 修复：把写 live 的调用挪到记账（`settings::set_current_provider` / `db.set_current_provider`）
  **之前**，只有 live 真正写成功才更新记账指针。这样任何一次写 live 失败都不会让记账超前于磁盘
  真实状态，从根上掐断了"回填污染错误的供应商行"这条路。
- 主理人本机已被污染的两处数据（DB 里 `codex-official` 的存档 config、`~/.codex/config.toml`）
  已手动清理干净（脚本剥掉了 `model_provider` 行和 `[model_providers.custom]` 表，其余字段原样
  保留），ChatGPT 登录令牌未受影响。
- 验证：`cargo check` 通过；`services::provider` + `switch` 相关单测 70 个全过。

### ✅ 已加：Codex "OpenAI API" 直连预设（2026-07-14）

主理人想在自己的 Codex 里同时留一张"订阅登录"卡和一张"真实 OpenAI API Key"卡，随时手动切换。
排查发现原先只有"OpenAI Official"（订阅登录）+ "302.AI"两张，没有真正直连 OpenAI 官方 API 的
预设——加了一张：

- `codexProviderPresets.ts` 新增 `"OpenAI API"`：`base_url = "https://api.openai.com/v1"`，
  `apiFormat: "openai_responses"`（走原生 Responses 接口，不需要像 302.AI 那样本地转换成
  Chat Completions），`category: "custom"`（不是 `"official"`，避免跟订阅登录那张混淆、也不触发
  官方专属的备份/保护逻辑）
- **打破了既有约定**：`tests/config/ai302ProviderPresets.test.ts` 原本锁死"每个应用预设只有
  官方 + 302.AI"（302 产品化的核心规则之一）。这张卡是主理人明确要求的例外——给自己留一条绕开
  302.AI、直连 OpenAI 的路——已更新该测试，注释里写明这是唯一的例外，不代表规则松动
- 按主理人要求做成**普通预设**，不是 302.AI 那种"开箱自带、不可删除"的种子卡：需要在"添加供应商"
  里手动选一次，选完可正常编辑/删除，没有特殊保护，改动量最小
- 验证：`tsc --noEmit` 零错误；`vitest` 372/372 全过

⚠️ 待办：主理人在自己机器上验证 Codex 401 是否真的解决（数据已手动清理，但还没重新
`pnpm tauri build` 装带根因修复的新版本去验证"以后切换不会再复现"）；"OpenAI API"这张新卡还
没有实机点开"添加供应商"验证过表单显示是否正常。

### ✅ 已修：首次运行引导页三处小问题（2026-07-14）

主理人截图反馈引导页（`FirstRunNoticeDialog.tsx`，302.AI 首次配置向导）几处问题，逐一确认后改：

- **对齐 bug**：第 0 步"一个 Key，连接你的编码工具"下面两张卡片，第二张被多套了一个
  `sm:translate-y-3`，导致跟第一张卡错位。删掉这个多余的类。
- **文案**：第 4 步模型策略里"跟随 Claude Code"这个选项名不够准确（没说清是"原样转发给官方
  接口，不做模型替换"），按主理人选定的方向改成"跟随官方调用"（简体 `zh.json`、繁体
  `zh-TW.json` 同步；英文 `en.json`/日文 `ja.json` 未动，仍是 "Follow Claude Code"，如需一起改
  再说）。
- **写死的展示值**：第 4 步给 Codex/Gemini 显示的默认模型（原来写死 `"gpt-5.5"` /
  `"gemini-3.5-flash"`）和 Codex 的接口地址（原来写死 `${AI302_API_BASE_URL}/v1`），改成从
  `codexProviderPresets` / `geminiProviderPresets` 里实际的"302.AI"预设定义读取（复用
  `ai302.ts` 已有的 `getAi302ModelStrategy` / `readAi302BaseUrl`），避免以后预设改了默认模型或
  地址，这两处引导页文案却没跟着变、静默显示过期信息——这类问题肉眼点一遍看不出来，只有读代码
  能发现。
- 验证：`tsc --noEmit` 零错误；`vitest` 372/372 全过。
- 这几处改动都落在 `FirstRunNoticeDialog.tsx` / `zh.json` / `zh-TW.json` 里，这三个文件本身还
  躺着主理人自己一大块（`FirstRunNoticeDialog.tsx` 约 1000+ 行）尚未提交的引导页开发工作——这次
  一并提交，不是只提交这三处小改动。

### ✅ 已改：Codex 302 节点统一使用 `/v1`（2026-07-15）

- **最终地址**：海外 `https://api.302.ai/v1`，国内 `https://api.302ai.cn/v1`；两者都以
  `openai_responses` 原生透传，不走本地 Responses→Chat 转换。
- **配置一致性**：前端预设、两张数据库种子卡、Key 诊断和 Codex fallback 全部统一到 `/v1`。
- **存量迁移**：启动时扫描全部 Codex 卡片、地址候选表和 live `config.toml`，只把 302.AI
  两个域名下旧版本增加的多余路径改回 `/v1`；Key、模型、注释和其他自定义地址保持不变。
- **默认选择**：不再自动创建 Codex `default` 卡；已有 `default` 会删除。若它正在使用或当前
  没有选择，则启用 `302.AI（国内）`，并在删除前保留其中已有的 302 API Key。用户已经选择
  其他供应商时不强制切换。
- **真 Key 实跑**：未做（无 Key），归入上方「真 Key 全链路」待办。

### 产品 polish 方向（2026-07-14 讨论）

1. **官方配置一致性检查**：在设置里提供手动检查入口，确认 Claude/Codex/Gemini/Claude Desktop 的
   官方供应商仍保持官方默认配置；如检测到自定义 API 地址或非默认配置，提供恢复到官方默认的能力。
   文案使用“配置一致性检查 / 恢复官方默认”，避免“污染”等负面表达。
2. **模型组合轻量版**：不要替代“项目”功能。项目承载工作上下文（仓库、提示词、MCP、Skills），
   模型组合承载推理/成本策略（如 Code Set / Brainstorm Set / Cheap Set / Max Set），两者可组合。
3. **MCP / Skills / 提示词任务化**：从“管理页展示”升级为“项目能力推荐”。按项目类型推荐 MCP、
   Skills、提示词，并提供项目体检，让用户知道这些能力什么时候该启用、能帮他完成什么任务。

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
- The config dir moved to `~/.302-cc-switch` (2026-07-09, fully isolated from upstream's
  `~/.cc-switch`, no data migration; WebDAV/S3 default remote root is now `302-cc-switch-sync`).
- Lightweight coexistence isolation landed on 2026-07-15: installers register only
  `ccswitch302://` (the parser still accepts legacy `ccswitch://`), the default proxy port is
  `30221` (schema v13 migrates rows still set to `15721` and preserves other ports), and the
  Claude Desktop profile has a 302-specific ID/name. There is no upstream-install detection or
  extra prompt.
- Real client targets such as `~/.claude` and `~/.codex` are still managed by both switchers. If
  both apps switch the same client, the last writer still wins; no background coordinator is added.

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

✅ The two 302 seed configuration gaps were closed on 2026-07-15 (real-key end-to-end testing
remains in the TODOs above):
- **Codex seed**: new seeds store `meta.apiFormat="openai_chat"`; startup backfills only a
  missing value on old cards, preserving an explicit user format and the existing API key.
- **Claude Desktop seed**: new seeds and presets use `ANTHROPIC_AUTH_TOKEN`; both frontend and
  backend still read legacy `ANTHROPIC_API_KEY`, and the next save migrates it without losing
  the key. When both fields exist, AUTH_TOKEN wins.

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
     the id is `ai302-*`; Claude writes ANTHROPIC_API_KEY, Claude Desktop writes
     ANTHROPIC_AUTH_TOKEN, and the remaining apps use OPENAI_API_KEY / GEMINI_API_KEY
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

### ✅ Fixed: Codex provider-switch bookkeeping-ordering bug (2026-07-14)

Owner reported Codex showing "OpenAI Official" as active after switching, while requests
still hit `https://api.302.ai/v1/responses` and got 401 Invalid API Key. Root-caused by
directly diffing three states (live `~/.codex/config.toml`, DB `providers.is_current`,
local `settings.json`'s `currentProviderCodex`) rather than guessing:

- Root cause: `switch_normal` (`src-tauri/src/services/provider/mod.rs`) used to record the
  "current provider" pointer (settings.json + DB) **before** writing the live
  `config.toml`/`auth.json`. When the live write didn't actually take effect once (original
  trigger not fully pinned down), the pointer had already moved ahead of reality.
- How it got worse: on the *next* switch, the backfill step trusted that pointer and saved
  whatever was actually on disk (still the previous third-party provider's routing) into the
  DB row it believed was "official" — permanently baking 302.AI's
  `[model_providers.custom]` table into the `codex-official` row. Every subsequent switch
  then wrote that poisoned config back to live, on a loop.
- Fix: moved the live write ahead of the pointer updates, so pointers only advance once live
  has actually landed. A failed live write can no longer leave the pointer pointing somewhere
  the disk doesn't match, which is what fed the backfill-poisoning loop.
- Manually cleaned the two pieces of already-poisoned data on the owner's machine (the DB's
  `codex-official` stored config, and `~/.codex/config.toml`) — stripped the `model_provider`
  line and `[model_providers.custom]` table, left everything else untouched; ChatGPT login
  tokens were unaffected.
- Verified: `cargo check` clean; 70 `services::provider` + `switch` unit tests passing.

### ✅ Added: Codex "OpenAI API" direct-connect preset (2026-07-14)

Owner wants to keep both a subscription-login card and a real OpenAI API-key card side by
side on Codex, switchable at will. Previously there was only "OpenAI Official" (subscription
login) + "302.AI" — no preset for a genuine direct-to-OpenAI API key. Added one:

- New `"OpenAI API"` entry in `codexProviderPresets.ts`: `base_url =
  "https://api.openai.com/v1"`, `apiFormat: "openai_responses"` (native Responses API, no
  local Chat-Completions conversion needed the way 302.AI requires), `category: "custom"`
  (not `"official"`, to avoid conflating it with the subscription card or triggering
  official-only backup/protection logic).
- **Breaks an existing invariant**: `tests/config/ai302ProviderPresets.test.ts` previously
  locked "every app's preset list is official + 302.AI only" as one of the 302
  productization's core rules. This card is a deliberate, owner-approved exception — a
  personal escape hatch to bypass 302.AI and go straight to OpenAI — the test has been
  updated with a comment marking it as the sole exception, not a loosening of the rule.
- Built as a **plain preset** per the owner's request, not a 302.AI-style seeded/undeletable
  card: it has to be picked once from "Add provider," then behaves like any normal editable/
  deletable provider — smallest possible change.
- Verified: `tsc --noEmit` clean; `vitest` 372/372 passing.

⚠️ TODO: owner still needs to verify on their own machine that the Codex 401 is actually
gone (data was manually cleaned, but the app hasn't been rebuilt with the root-cause fix yet
to confirm future switches won't reproduce it); the new "OpenAI API" card hasn't been
eyeballed yet by actually opening "Add provider" in the running app.

### ✅ Fixed: three small first-run onboarding issues (2026-07-14)

Owner screenshotted issues in the onboarding wizard (`FirstRunNoticeDialog.tsx`, the 302.AI
first-run setup flow). Confirmed and fixed each:

- **Misalignment**: on step 0 ("One Key, connect your coding tools"), the second of the two
  intro cards had a stray `sm:translate-y-3` offsetting it from the first. Removed.
- **Copy**: step 4's model-policy option "Follow Claude Code" didn't clearly convey "passes
  the model through to the official endpoint unchanged" — reworded to "跟随官方调用" per the
  owner's chosen direction (zh + zh-TW updated; en/ja left as "Follow Claude Code" for now).
- **Hardcoded display values**: step 4's Codex/Gemini default-model labels (previously
  hardcoded `"gpt-5.5"` / `"gemini-3.5-flash"`) and Codex's shown endpoint (previously
  hardcoded `${AI302_API_BASE_URL}/v1`) now read from the actual "302.AI" entries in
  `codexProviderPresets` / `geminiProviderPresets` (reusing `ai302.ts`'s existing
  `getAi302ModelStrategy` / `readAi302BaseUrl`) instead of duplicating the values inline —
  so if the presets' defaults ever change, this screen won't silently go stale. This class of
  bug is invisible by eyeballing the running app; it only surfaces from reading the code.
- Verified: `tsc --noEmit` clean; `vitest` 372/372 passing.
- These edits land inside `FirstRunNoticeDialog.tsx` / `zh.json` / `zh-TW.json`, which already
  carried a large chunk (~1000+ lines in `FirstRunNoticeDialog.tsx`) of the owner's own
  not-yet-committed onboarding work — this commit includes all of it, not just the three
  fixes above.

### ✅ Changed: both Codex 302 nodes now use `/v1` (2026-07-15)

- **Final endpoints**: overseas `https://api.302.ai/v1`, domestic `https://api.302ai.cn/v1`.
  Both use native `openai_responses` passthrough.
- **Consistent configuration**: frontend presets, both database seeds, Key diagnostics, and the
  Codex fallback all use `/v1`.
- **Existing-data migration**: startup repairs the old extra path only on the two 302.AI hosts
  across every Codex provider, endpoint candidate, and live `config.toml`. Keys, models,
  comments, and unrelated custom URLs are preserved.
- **Default selection**: Codex no longer auto-creates a `default` card. Existing cards with that
  id are removed; when one was active or no provider was selected, the domestic 302.AI seed is
  selected and its existing 302 API Key is preserved. Explicit user selections are untouched.
- **No real-key end-to-end Codex run yet** (no key on hand) — tracked under the existing
  "real-key full-chain" TODO.
- ⚠️ If the card is currently active, the migration only fixes the DB archive; the live
  `~/.codex/config.toml` gets the new URL only after the user re-switches to the card.
