// 302.AI 产品化的共享判定与常量。
// 种子 id 清单的事实源在后端 src-tauri/src/database/dao/providers_seed.rs（AI302_SEEDS），
// 前端只依赖它们统一的 "ai302-" 前缀，避免两边维护同一份 id 列表。

import type { Provider } from "@/types";

const AI302_SEED_PREFIX = "ai302-";

// 用户领取 / 查看 API Key 的入口页（302.AI 控制台）
export const AI302_API_KEY_URL = "https://dash.302.ai/apis/list";

// 302 聚合接口根地址（种子配置的默认值，验证 Key 时兜底用）
export const AI302_API_BASE_URL = "https://api.302.ai";

// 302 内置种子供应商：不可删除，编辑时走「只填 Key」精简表单
export function isAi302SeedProvider(provider: Pick<Provider, "id">): boolean {
  return provider.id.startsWith(AI302_SEED_PREFIX);
}
