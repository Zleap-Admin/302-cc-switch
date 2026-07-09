/**
 * Codex 预设供应商配置模板
 */
import { ProviderCategory } from "../types";
import type {
  CodexApiFormat,
  CodexCatalogModel,
  CodexChatReasoning,
} from "../types";
import type { PresetTheme } from "./claudeProviderPresets";

export interface CodexProviderPreset {
  name: string;
  nameKey?: string; // i18n key for localized display name
  websiteUrl: string;
  // 第三方供应商可提供单独的获取 API Key 链接
  apiKeyUrl?: string;
  auth: Record<string, any>; // 将写入 ~/.codex/auth.json
  config: string; // 将写入 ~/.codex/config.toml（TOML 字符串）
  isOfficial?: boolean; // 标识是否为官方预设
  isPartner?: boolean; // 标识是否为商业合作伙伴
  primePartner?: boolean; // 置顶合作伙伴（顶级）：徽章显示为心形
  partnerPromotionKey?: string; // 合作伙伴促销信息的 i18n key
  category?: ProviderCategory; // 新增：分类
  isCustomTemplate?: boolean; // 标识是否为自定义模板
  // 新增：请求地址候选列表（用于地址管理/测速）
  endpointCandidates?: string[];
  // 新增：视觉主题配置
  theme?: PresetTheme;
  // 图标配置
  icon?: string; // 图标名称
  iconColor?: string; // 图标颜色
  // Codex API 格式
  apiFormat?: CodexApiFormat;
  // Codex Chat 本地路由模式下的模型目录
  modelCatalog?: CodexCatalogModel[];
  // Codex Responses -> Chat Completions reasoning capability defaults
  codexChatReasoning?: CodexChatReasoning;
}

/**
 * 生成第三方供应商的 auth.json
 */
export function generateThirdPartyAuth(apiKey: string): Record<string, any> {
  return {
    OPENAI_API_KEY: apiKey || "",
  };
}

/**
 * 生成第三方供应商的 config.toml
 */
export function generateThirdPartyConfig(
  providerName: string,
  baseUrl: string,
  modelName = "gpt-5.5",
): string {
  const tomlString = (value: string) => JSON.stringify(value);

  return `model_provider = "custom"
model = ${tomlString(modelName)}
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.custom]
name = ${tomlString(providerName)}
base_url = ${tomlString(baseUrl)}
wire_api = "responses"
requires_openai_auth = true`;
}

function modelCatalog(
  models: Array<
    | string
    | {
        model: string;
        displayName?: string;
        contextWindow?: number;
        // Native Responses (direct) overrides for the generated
        // model-catalogs.json; omit to inherit the native template defaults
        // (supports_parallel_tool_calls=false, input_modalities=["text"]).
        supportsParallelToolCalls?: boolean;
        inputModalities?: string[];
        // Vendor's OFFICIAL base_instructions; omit to inherit the neutral
        // template default. Required by Codex, so the backend always emits one.
        baseInstructions?: string;
      }
  >,
): CodexCatalogModel[] {
  return models.map((entry) =>
    typeof entry === "string"
      ? { model: entry }
      : {
          model: entry.model,
          displayName: entry.displayName,
          contextWindow: entry.contextWindow,
          supportsParallelToolCalls: entry.supportsParallelToolCalls,
          inputModalities: entry.inputModalities,
          baseInstructions: entry.baseInstructions,
        },
  );
}

export const codexProviderPresets: CodexProviderPreset[] = [
  {
    name: "OpenAI Official",
    websiteUrl: "https://chatgpt.com/codex",
    isOfficial: true,
    category: "official",
    auth: {},
    config: ``,
    theme: {
      icon: "codex",
      backgroundColor: "#1F2937", // gray-800
      textColor: "#FFFFFF",
    },
    icon: "openai",
    iconColor: "#00A67E",
  },
  {
    // 302.AI 的 OpenAI 兼容层：把 api.openai.com 换成 api.302.ai 即可。
    // 走 openai_chat（本地 Responses→Chat 转换），因为 302 官方示例只承诺
    // /v1/chat/completions；国内节点 api.302ai.cn 在地址管理里可切换。
    name: "302.AI",
    websiteUrl: "https://302.ai",
    apiKeyUrl: "https://dash.302.ai",
    auth: generateThirdPartyAuth(""),
    config: generateThirdPartyConfig("302ai", "https://api.302.ai/v1"),
    endpointCandidates: ["https://api.302.ai/v1", "https://api.302ai.cn/v1"],
    apiFormat: "openai_chat",
    modelCatalog: modelCatalog([
      { model: "gpt-5.5", displayName: "GPT-5.5", contextWindow: 400000 },
    ]),
    category: "aggregator",
    icon: "ai302",
    iconColor: "#7C3AED",
  },
];
