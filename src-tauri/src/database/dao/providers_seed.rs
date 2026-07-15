//! 内置供应商种子数据
//!
//! 启动时调用 `Database::init_default_official_providers` /
//! `Database::init_ai302_providers` 把这些条目写入 `providers` 表，让所有用户
//! 开箱即看到「官方 + 302.AI 海外 + 302.AI 国内」默认供应商
//! （两个 302.AI 节点都没有 key 占位，需用户补填）。
//!
//! 字段与前端预设保持一致，参见：
//! - `src/config/claudeProviderPresets.ts`（"Claude Official" / "302.AI"）
//! - `src/config/codexProviderPresets.ts`（"OpenAI Official" / "302.AI"）
//! - `src/config/geminiProviderPresets.ts`（"Google Official" / "302.AI"）
//! - `src/config/claudeDesktopProviderPresets.ts`（"Claude Desktop Official" / "302.AI"）

use crate::app_config::AppType;

pub(crate) const CLAUDE_DESKTOP_OFFICIAL_PROVIDER_ID: &str = "claude-desktop-official";

/// 单条内置供应商种子定义。
///
/// 同时承载「官方」（category = "official"）和「302.AI 聚合」
/// （category = "aggregator"）两类种子——区别只在 `category` 字段，
/// 故结构体本身命名为中性的 Builtin，由两个 const 数组分别收纳。
pub(crate) struct BuiltinProviderSeed {
    pub id: &'static str,
    pub app_type: AppType,
    pub name: &'static str,
    pub website_url: &'static str,
    pub icon: &'static str,
    pub icon_color: &'static str,
    /// 落库时写入 providers.category：官方种子 "official"，302 聚合种子 "aggregator"。
    /// 插入处直接读这个字段，不再写死 "official"——否则 302 种子会被错打成 official。
    pub category: &'static str,
    /// settings_config 的 JSON 字符串，每个 app 结构不同。
    pub settings_config_json: &'static str,
    /// 只存必须参与运行时路由判断的格式元数据；其余种子保持为空。
    pub api_format: Option<&'static str>,
}

/// Claude / Claude Desktop / Codex / Gemini 的官方预设。
///
/// id 固定，便于幂等检查；name 直接用英文原名（与前端预设一致），不做 i18n。
pub(crate) const OFFICIAL_SEEDS: &[BuiltinProviderSeed] = &[
    BuiltinProviderSeed {
        id: "claude-official",
        app_type: AppType::Claude,
        name: "Claude Official",
        website_url: "https://www.anthropic.com/claude-code",
        icon: "anthropic",
        icon_color: "#D4915D",
        category: "official",
        // 空 env 让用户走 Claude CLI 默认认证流程
        settings_config_json: r#"{"env":{}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: CLAUDE_DESKTOP_OFFICIAL_PROVIDER_ID,
        app_type: AppType::ClaudeDesktop,
        name: "Claude Desktop Official",
        website_url: "https://claude.ai/download",
        icon: "anthropic",
        icon_color: "#D4915D",
        category: "official",
        // 空 env 只是占位；切换该 provider 时会恢复 Claude Desktop 1P 模式
        settings_config_json: r#"{"env":{}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "codex-official",
        app_type: AppType::Codex,
        name: "OpenAI Official",
        website_url: "https://chatgpt.com/codex",
        icon: "openai",
        icon_color: "#00A67E",
        category: "official",
        // 空 auth + 空 config 让用户走 ChatGPT Plus/Pro OAuth
        settings_config_json: r#"{"auth":{},"config":""}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "gemini-official",
        app_type: AppType::Gemini,
        name: "Google Official",
        website_url: "https://ai.google.dev/",
        icon: "gemini",
        icon_color: "#4285F4",
        category: "official",
        // 空 env + 空 config 让用户走 Google OAuth
        settings_config_json: r#"{"env":{},"config":{}}"#,
        api_format: None,
    },
];

/// 302.AI 国内 / 海外聚合层种子（无 key 占位）。
///
/// 只覆盖 4 个非 additive app（additive 的 opencode/openclaw/hermes 走 live 同步，
/// 不走启动种子）。海外卡沿用对应前端预设的配置形态，国内卡只替换节点域名；
/// Claude Desktop 与前端保存后的 env 形态一致（直连模式，空 key）。
///
/// ⚠️ key 字段为空，仅为占位；用户需编辑补填真实 302 API Key 后再切换。
/// Claude Desktop 新配置统一写 AUTH_TOKEN；读取层继续兼容历史 API_KEY。
pub(crate) const AI302_SEEDS: &[BuiltinProviderSeed] = &[
    BuiltinProviderSeed {
        id: "ai302-claude",
        app_type: AppType::Claude,
        name: "302.AI（海外）",
        website_url: "https://api.302.ai",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        // 与官方 302cc CLI 写入字段一致：ANTHROPIC_BASE_URL 根域名 + 空 API_KEY
        settings_config_json: r#"{"env":{"ANTHROPIC_BASE_URL":"https://api.302.ai","ANTHROPIC_API_KEY":""}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "ai302-claude-desktop",
        app_type: AppType::ClaudeDesktop,
        name: "302.AI（海外）",
        website_url: "https://api.302.ai",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        // 直连模式统一使用 AUTH_TOKEN；后台仍兼容历史 API_KEY。
        settings_config_json: r#"{"env":{"ANTHROPIC_BASE_URL":"https://api.302.ai","ANTHROPIC_AUTH_TOKEN":""}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "ai302-codex",
        app_type: AppType::Codex,
        name: "302.AI（海外）",
        website_url: "https://api.302.ai",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        // config.toml 等价于前端 generateThirdPartyConfig("302ai",
        // "https://api.302.ai/codex/v1") 的输出；/codex/v1 是 302 的 Codex 专用
        // 原生 Responses 端点，直连透传（api_format="openai_responses"），
        // 不再走本地 Responses→Chat 转换。
        // 不写 model 行 = 自动路由：跟随 Codex 客户端按任务自选模型（sol / mini 等），
        // 302 按实际收到的模型 id 计费。钉死 gpt-5.5 会和真实调用对不上。
        settings_config_json: r#"{"auth":{"OPENAI_API_KEY":""},"config":"model_provider = \"custom\"\nmodel_reasoning_effort = \"high\"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = \"302ai\"\nbase_url = \"https://api.302.ai/codex/v1\"\nwire_api = \"responses\"\nrequires_openai_auth = true"}"#,
        api_format: Some("openai_responses"),
    },
    BuiltinProviderSeed {
        id: "ai302-gemini",
        app_type: AppType::Gemini,
        name: "302.AI（海外）",
        website_url: "https://api.302.ai",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        // 与其他中转商的 Gemini 原生透传写法一致：根域名 + 模型名
        settings_config_json: r#"{"env":{"GOOGLE_GEMINI_BASE_URL":"https://api.302.ai","GEMINI_MODEL":"gemini-3.5-flash"},"config":{}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "ai302-cn-claude",
        app_type: AppType::Claude,
        name: "302.AI（国内）",
        website_url: "https://api.302ai.cn",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        settings_config_json: r#"{"env":{"ANTHROPIC_BASE_URL":"https://api.302ai.cn","ANTHROPIC_API_KEY":""}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "ai302-cn-claude-desktop",
        app_type: AppType::ClaudeDesktop,
        name: "302.AI（国内）",
        website_url: "https://api.302ai.cn",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        settings_config_json: r#"{"env":{"ANTHROPIC_BASE_URL":"https://api.302ai.cn","ANTHROPIC_AUTH_TOKEN":""}}"#,
        api_format: None,
    },
    BuiltinProviderSeed {
        id: "ai302-cn-codex",
        app_type: AppType::Codex,
        name: "302.AI（国内）",
        website_url: "https://api.302ai.cn",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        settings_config_json: r#"{"auth":{"OPENAI_API_KEY":""},"config":"model_provider = \"custom\"\nmodel_reasoning_effort = \"high\"\ndisable_response_storage = true\n\n[model_providers.custom]\nname = \"302ai-cn\"\nbase_url = \"https://api.302ai.cn/codex/v1\"\nwire_api = \"responses\"\nrequires_openai_auth = true"}"#,
        api_format: Some("openai_responses"),
    },
    BuiltinProviderSeed {
        id: "ai302-cn-gemini",
        app_type: AppType::Gemini,
        name: "302.AI（国内）",
        website_url: "https://api.302ai.cn",
        icon: "ai302",
        icon_color: "#7C3AED",
        category: "aggregator",
        settings_config_json: r#"{"env":{"GOOGLE_GEMINI_BASE_URL":"https://api.302ai.cn","GEMINI_MODEL":"gemini-3.5-flash"},"config":{}}"#,
        api_format: None,
    },
];

/// 判断给定的 provider id 是否属于内置种子（官方或 302 聚合）。
///
/// 单一事实源：直接扫描两个种子数组，避免在多处重复维护 id 列表。
/// 用于 live 导入去重 / 历史桶归类——内置种子都不算「用户自建第三方」，
/// 302 聚合种子也必须被认作内置，否则会挡住 live 导入或污染历史迁移。
pub(crate) fn is_builtin_seed_id(id: &str) -> bool {
    OFFICIAL_SEEDS.iter().any(|seed| seed.id == id) || AI302_SEEDS.iter().any(|seed| seed.id == id)
}

/// 判断是否为 302.AI 聚合种子——这是产品的招牌入口，不允许删除
/// （前端隐藏删除按钮，`ProviderService::delete` 用它兜底拦截）。
pub(crate) fn is_ai302_seed_id(id: &str) -> bool {
    AI302_SEEDS.iter().any(|seed| seed.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn official_seeds_include_claude_desktop() {
        let seed = OFFICIAL_SEEDS
            .iter()
            .find(|seed| seed.id == CLAUDE_DESKTOP_OFFICIAL_PROVIDER_ID)
            .expect("claude desktop official seed");

        assert_eq!(seed.app_type, AppType::ClaudeDesktop);
        assert!(is_builtin_seed_id(CLAUDE_DESKTOP_OFFICIAL_PROVIDER_ID));
    }

    /// 302 种子覆盖 4 个非 additive app，且每个 app 恰好有国内、海外两条。
    #[test]
    fn ai302_seeds_cover_four_non_additive_apps() {
        let app_types: Vec<AppType> = AI302_SEEDS.iter().map(|s| s.app_type.clone()).collect();
        assert_eq!(AI302_SEEDS.len(), 8, "exactly 8 regional ai302 seeds");
        for app_type in [
            AppType::Claude,
            AppType::ClaudeDesktop,
            AppType::Codex,
            AppType::Gemini,
        ] {
            assert_eq!(
                app_types
                    .iter()
                    .filter(|candidate| **candidate == app_type)
                    .count(),
                2,
                "{app_type:?} should have domestic and overseas seeds"
            );
        }
        // 不应误种 additive app
        assert!(!app_types.contains(&AppType::OpenCode));
    }

    #[test]
    fn ai302_seeds_are_builtin_and_aggregator() {
        for seed in AI302_SEEDS {
            assert!(
                is_builtin_seed_id(seed.id),
                "{} should be a builtin seed id",
                seed.id
            );
            assert!(
                is_ai302_seed_id(seed.id),
                "{} should be a protected 302.AI seed id",
                seed.id
            );
            assert_eq!(seed.category, "aggregator", "{} category", seed.id);
            assert_eq!(seed.icon, "ai302", "{} icon", seed.id);
            assert_eq!(seed.icon_color, "#7C3AED", "{} icon_color", seed.id);
        }
    }

    #[test]
    fn ai302_seeds_label_and_route_both_regions() {
        for seed in AI302_SEEDS {
            let config: serde_json::Value =
                serde_json::from_str(seed.settings_config_json).expect("seed config");
            let serialized = config.to_string();
            if seed.id.starts_with("ai302-cn-") {
                assert_eq!(seed.name, "302.AI（国内）");
                assert_eq!(seed.website_url, "https://api.302ai.cn");
                assert!(serialized.contains("api.302ai.cn"), "{} endpoint", seed.id);
            } else {
                assert_eq!(seed.name, "302.AI（海外）");
                assert_eq!(seed.website_url, "https://api.302.ai");
                assert!(serialized.contains("api.302.ai"), "{} endpoint", seed.id);
            }
        }
    }

    /// 官方与 302 种子的 id 不得撞车，否则后插入的会被幂等跳过。
    #[test]
    fn seed_ids_are_globally_unique() {
        let mut ids: Vec<&str> = OFFICIAL_SEEDS.iter().map(|s| s.id).collect();
        ids.extend(AI302_SEEDS.iter().map(|s| s.id));
        let mut sorted = ids.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), ids.len(), "duplicate seed ids: {ids:?}");
    }

    /// 每条种子的 settings_config_json 必须是合法 JSON，且 302 的 Codex TOML
    /// 要还原出 generateThirdPartyConfig 的关键行（防止手写转义写错）。
    #[test]
    fn seed_settings_config_json_parses() {
        for seed in OFFICIAL_SEEDS.iter().chain(AI302_SEEDS.iter()) {
            serde_json::from_str::<serde_json::Value>(seed.settings_config_json)
                .unwrap_or_else(|e| panic!("{} settings_config_json invalid: {e}", seed.id));
        }

        let codex = AI302_SEEDS
            .iter()
            .find(|s| s.id == "ai302-codex")
            .expect("ai302-codex seed");
        let config = serde_json::from_str::<serde_json::Value>(codex.settings_config_json)
            .expect("codex json");
        let toml = config["config"].as_str().expect("codex config string");
        assert!(toml.contains("wire_api = \"responses\""));
        assert!(toml.contains("base_url = \"https://api.302.ai/codex/v1\""));
        // 自动路由：种子不得钉死 model，Codex 客户端按任务自选
        assert!(!toml.contains("\nmodel = "));
        assert!(!toml.starts_with("model = "));
        assert!(toml.contains("model_reasoning_effort = \"high\""));
        assert_eq!(config["auth"]["OPENAI_API_KEY"].as_str(), Some(""));
        assert_eq!(codex.api_format, Some("openai_responses"));

        let domestic_codex = AI302_SEEDS
            .iter()
            .find(|s| s.id == "ai302-cn-codex")
            .expect("ai302-cn-codex seed");
        let domestic_config =
            serde_json::from_str::<serde_json::Value>(domestic_codex.settings_config_json)
                .expect("domestic codex json");
        let domestic_toml = domestic_config["config"]
            .as_str()
            .expect("domestic codex config string");
        assert!(domestic_toml.contains("base_url = \"https://api.302ai.cn/codex/v1\""));
        assert_eq!(domestic_codex.api_format, Some("openai_responses"));

        let desktop = AI302_SEEDS
            .iter()
            .find(|s| s.id == "ai302-claude-desktop")
            .expect("ai302-claude-desktop seed");
        let desktop_config =
            serde_json::from_str::<serde_json::Value>(desktop.settings_config_json)
                .expect("desktop json");
        assert_eq!(
            desktop_config["env"]["ANTHROPIC_AUTH_TOKEN"].as_str(),
            Some("")
        );
        assert!(desktop_config["env"].get("ANTHROPIC_API_KEY").is_none());
    }
}
