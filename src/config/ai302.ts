// 302.AI 产品化的共享判定与常量。
// 种子 id 清单的事实源在后端 src-tauri/src/database/dao/providers_seed.rs（AI302_SEEDS），
// 前端只依赖它们统一的 "ai302-" 前缀，避免两边维护同一份 id 列表。

import type { AppId } from "@/lib/api/types";
import type { Provider } from "@/types";

const AI302_SEED_PREFIX = "ai302-";

// 用户领取 / 查看 API Key 的入口页（302.AI 控制台）
export const AI302_API_KEY_URL = "https://dash.302.ai/apis/list";

// 302 聚合接口根地址（种子配置的默认值，验证 Key 时兜底用）
export const AI302_API_BASE_URL = "https://api.302.ai";

export const AI302_ONBOARDING_APPS = ["claude", "codex", "gemini"] as const;

export type Ai302OnboardingApp = (typeof AI302_ONBOARDING_APPS)[number];

export const AI302_SEED_IDS: Record<Ai302OnboardingApp, string> = {
  claude: "ai302-cn-claude",
  codex: "ai302-cn-codex",
  gemini: "ai302-cn-gemini",
};

export interface Ai302ModelMapping {
  role: "sonnet" | "opus" | "fable" | "haiku" | "subagent" | "default";
  model: string;
}

export interface Ai302ModelStrategy {
  mode: "follow" | "fixed";
  mappings: Ai302ModelMapping[];
}

// 302 内置种子供应商：不可删除，编辑时走「只填 Key」精简表单
export function isAi302SeedProvider(provider: Pick<Provider, "id">): boolean {
  return provider.id.startsWith(AI302_SEED_PREFIX);
}

export function readAi302ApiKey(
  appId: AppId,
  config: Record<string, unknown>,
): string {
  if (appId === "opencode") {
    const options = config.options as Record<string, unknown> | undefined;
    return typeof options?.apiKey === "string" ? options.apiKey : "";
  }
  if (appId === "openclaw") {
    return typeof config.apiKey === "string" ? config.apiKey : "";
  }
  if (appId === "hermes") {
    return typeof config.api_key === "string" ? config.api_key : "";
  }
  if (appId === "codex") {
    const auth = config.auth as Record<string, unknown> | undefined;
    return typeof auth?.OPENAI_API_KEY === "string" ? auth.OPENAI_API_KEY : "";
  }
  const env = config.env as Record<string, unknown> | undefined;
  if (appId === "claude-desktop") {
    const authToken = env?.ANTHROPIC_AUTH_TOKEN;
    if (typeof authToken === "string" && authToken.trim()) return authToken;
    const legacyApiKey = env?.ANTHROPIC_API_KEY;
    return typeof legacyApiKey === "string" ? legacyApiKey : "";
  }
  const field = appId === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return typeof env?.[field] === "string" ? (env[field] as string) : "";
}

export function writeAi302ApiKey(
  appId: AppId,
  config: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  if (appId === "opencode") {
    const options = (config.options ?? {}) as Record<string, unknown>;
    return { ...config, options: { ...options, apiKey: key } };
  }
  if (appId === "openclaw") {
    return { ...config, apiKey: key };
  }
  if (appId === "hermes") {
    return { ...config, api_key: key };
  }
  if (appId === "codex") {
    const auth = (config.auth ?? {}) as Record<string, unknown>;
    return { ...config, auth: { ...auth, OPENAI_API_KEY: key } };
  }
  const env = (config.env ?? {}) as Record<string, unknown>;
  if (appId === "claude-desktop") {
    const nextEnv: Record<string, unknown> = {
      ...env,
      ANTHROPIC_AUTH_TOKEN: key,
    };
    delete nextEnv.ANTHROPIC_API_KEY;
    return { ...config, env: nextEnv };
  }
  const field = appId === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return { ...config, env: { ...env, [field]: key } };
}

export function readAi302BaseUrl(
  appId: AppId,
  config: Record<string, unknown>,
): string {
  if (appId === "opencode") {
    const options = config.options as Record<string, unknown> | undefined;
    const value = options?.baseURL;
    return typeof value === "string" && value.trim()
      ? value
      : `${AI302_API_BASE_URL}/v1`;
  }
  if (appId === "openclaw") {
    const value = config.baseUrl;
    return typeof value === "string" && value.trim()
      ? value
      : AI302_API_BASE_URL;
  }
  if (appId === "hermes") {
    const value = config.base_url;
    return typeof value === "string" && value.trim()
      ? value
      : `${AI302_API_BASE_URL}/v1`;
  }
  if (appId === "codex") {
    const toml = typeof config.config === "string" ? config.config : "";
    const match = toml.match(/^\s*base_url\s*=\s*["']([^"']+)["']/m);
    return match?.[1] || `${AI302_API_BASE_URL}/v1`;
  }
  const env = config.env as Record<string, unknown> | undefined;
  const field =
    appId === "gemini" ? "GOOGLE_GEMINI_BASE_URL" : "ANTHROPIC_BASE_URL";
  const value = env?.[field];
  return typeof value === "string" && value.trim() ? value : AI302_API_BASE_URL;
}

export function getAi302ModelStrategy(
  appId: AppId,
  config: Record<string, unknown>,
): Ai302ModelStrategy {
  const env = (config.env ?? {}) as Record<string, unknown>;
  if (appId === "claude" || appId === "claude-desktop") {
    const fields: Array<[Ai302ModelMapping["role"], string]> = [
      ["sonnet", "ANTHROPIC_DEFAULT_SONNET_MODEL"],
      ["opus", "ANTHROPIC_DEFAULT_OPUS_MODEL"],
      ["fable", "ANTHROPIC_DEFAULT_FABLE_MODEL"],
      ["haiku", "ANTHROPIC_DEFAULT_HAIKU_MODEL"],
      ["subagent", "CLAUDE_CODE_SUBAGENT_MODEL"],
      ["default", "ANTHROPIC_MODEL"],
    ];
    const mappings = fields.flatMap(([role, field]) => {
      const value = env[field];
      return typeof value === "string" && value.trim()
        ? [{ role, model: value.trim() }]
        : [];
    });
    return { mode: mappings.length > 0 ? "fixed" : "follow", mappings };
  }

  if (appId === "codex") {
    const toml = typeof config.config === "string" ? config.config : "";
    const model = toml.match(/^\s*model\s*=\s*["']([^"']+)["']/m)?.[1];
    return model
      ? { mode: "fixed", mappings: [{ role: "default", model }] }
      : { mode: "follow", mappings: [] };
  }

  if (appId === "gemini") {
    const model = env.GEMINI_MODEL;
    return typeof model === "string" && model.trim()
      ? {
          mode: "fixed",
          mappings: [{ role: "default", model: model.trim() }],
        }
      : { mode: "follow", mappings: [] };
  }

  if (appId === "opencode") {
    const models = config.models as Record<string, unknown> | undefined;
    const model = models ? Object.keys(models)[0] : undefined;
    return model
      ? { mode: "fixed", mappings: [{ role: "default", model }] }
      : { mode: "follow", mappings: [] };
  }

  if (appId === "openclaw" || appId === "hermes") {
    const models = Array.isArray(config.models) ? config.models : [];
    const model = models
      .map((item) =>
        item && typeof item === "object"
          ? (item as Record<string, unknown>).id
          : undefined,
      )
      .find((id): id is string => typeof id === "string" && id.trim() !== "");
    return model
      ? { mode: "fixed", mappings: [{ role: "default", model }] }
      : { mode: "follow", mappings: [] };
  }

  return { mode: "follow", mappings: [] };
}
