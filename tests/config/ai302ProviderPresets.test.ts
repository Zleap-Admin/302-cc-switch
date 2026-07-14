import { describe, expect, it } from "vitest";
import { providerPresets } from "@/config/claudeProviderPresets";
import { codexProviderPresets } from "@/config/codexProviderPresets";
import { geminiProviderPresets } from "@/config/geminiProviderPresets";
import { claudeDesktopProviderPresets } from "@/config/claudeDesktopProviderPresets";
import { opencodeProviderPresets } from "@/config/opencodeProviderPresets";
import { openclawProviderPresets } from "@/config/openclawProviderPresets";
import { hermesProviderPresets } from "@/config/hermesProviderPresets";

// 302 版核心约定：每个应用的预设列表只有「官方 + 302.AI」
// （opencode/openclaw 无官方供应商；opencode 另保留两个自定义模板）。

describe("302.AI presets across apps", () => {
  it("Claude: official + 302.AI only", () => {
    expect(providerPresets.map((p) => p.name)).toEqual([
      "Claude Official",
      "302.AI",
    ]);
  });

  it("Claude: 302.AI uses Anthropic-compatible root with API key field", () => {
    const p = providerPresets.find((x) => x.name === "302.AI")!;
    const env = (p.settingsConfig as any).env;
    expect(env.ANTHROPIC_BASE_URL).toBe("https://api.302.ai");
    expect(env).toHaveProperty("ANTHROPIC_API_KEY", "");
    expect(p.apiKeyField).toBe("ANTHROPIC_API_KEY");
    // 国内节点作为测速候选
    expect(p.endpointCandidates).toContain("https://api.302ai.cn");
  });

  it("Codex: official + 302.AI + OpenAI API (direct escape hatch)", () => {
    // 唯一的例外：Codex 额外保留一张"OpenAI API"直连卡，作为绕开 302.AI 的
    // 官方逃生舱——主理人明确要求给自己留一条直连 OpenAI 的路，不受
    // "只有官方+302.AI" 这条约定约束。
    expect(codexProviderPresets.map((p) => p.name)).toEqual([
      "OpenAI Official",
      "302.AI",
      "OpenAI API",
    ]);
    const p = codexProviderPresets.find((x) => x.name === "302.AI")!;
    expect(p.config).toContain('base_url = "https://api.302.ai/v1"');
    expect(p.apiFormat).toBe("openai_chat");
    expect(p.auth).toHaveProperty("OPENAI_API_KEY", "");

    const direct = codexProviderPresets.find((x) => x.name === "OpenAI API")!;
    expect(direct.config).toContain('base_url = "https://api.openai.com/v1"');
    expect(direct.apiFormat).toBe("openai_responses");
    expect(direct.category).toBe("custom");
    expect(direct.auth).toHaveProperty("OPENAI_API_KEY", "");
  });

  it("Gemini: official + 302.AI + custom template", () => {
    expect(geminiProviderPresets.map((p) => p.name)).toEqual([
      "Google Official",
      "302.AI",
      "自定义",
    ]);
    const p = geminiProviderPresets.find((x) => x.name === "302.AI")!;
    expect(p.baseURL).toBe("https://api.302.ai");
  });

  it("Claude Desktop: official + 302.AI only, passthrough routes", () => {
    expect(claudeDesktopProviderPresets.map((p) => p.name)).toEqual([
      "Claude Desktop Official",
      "302.AI",
    ]);
    const p = claudeDesktopProviderPresets.find((x) => x.name === "302.AI")!;
    expect(p.baseUrl).toBe("https://api.302.ai");
    expect(p.apiFormat).toBe("anthropic");
    expect(p.modelRoutes?.length).toBe(3);
  });

  it("OpenCode: 302.AI + custom templates only", () => {
    expect(opencodeProviderPresets.map((p) => p.name)).toEqual([
      "302.AI",
      "Oh My OpenCode",
      "Oh My OpenCode Slim",
    ]);
    const p = opencodeProviderPresets.find((x) => x.name === "302.AI")!;
    expect(p.settingsConfig.npm).toBe("@ai-sdk/anthropic");
    expect((p.settingsConfig.options as any).baseURL).toBe(
      "https://api.302.ai/v1",
    );
  });

  it("OpenClaw: 302.AI only, anthropic-messages protocol", () => {
    expect(openclawProviderPresets.map((p) => p.name)).toEqual(["302.AI"]);
    const p = openclawProviderPresets[0];
    expect(p.settingsConfig.baseUrl).toBe("https://api.302.ai");
    expect(p.settingsConfig.api).toBe("anthropic-messages");
  });

  it("Hermes: official + 302.AI only", () => {
    expect(hermesProviderPresets.map((p) => p.name)).toEqual([
      "Nous Research",
      "302.AI",
    ]);
    const p = hermesProviderPresets.find((x) => x.name === "302.AI")!;
    expect(p.settingsConfig.base_url).toBe("https://api.302.ai/v1");
    expect(p.settingsConfig.api_mode).toBe("chat_completions");
  });

  it("no partner promotions remain in any preset list", () => {
    const all = [
      ...providerPresets,
      ...codexProviderPresets,
      ...geminiProviderPresets.filter((p) => p.name !== "Google Official"),
      ...claudeDesktopProviderPresets,
      ...opencodeProviderPresets,
      ...openclawProviderPresets,
      ...hermesProviderPresets,
    ];
    expect(all.every((p) => !p.isPartner)).toBe(true);
  });
});
