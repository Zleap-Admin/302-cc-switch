import { describe, expect, it } from "vitest";
import {
  getAi302ModelStrategy,
  readAi302ApiKey,
  readAi302BaseUrl,
  writeAi302ApiKey,
} from "./ai302";

describe("ai302 config helpers", () => {
  it("reads and writes the app-specific API key fields", () => {
    const claude = writeAi302ApiKey(
      "claude",
      { env: { ANTHROPIC_BASE_URL: "https://api.302.ai" } },
      "sk-claude",
    );
    const codex = writeAi302ApiKey("codex", { auth: {} }, "sk-codex");
    const gemini = writeAi302ApiKey("gemini", { env: {} }, "sk-gemini");

    expect(readAi302ApiKey("claude", claude)).toBe("sk-claude");
    expect(readAi302ApiKey("codex", codex)).toBe("sk-codex");
    expect(readAi302ApiKey("gemini", gemini)).toBe("sk-gemini");
  });

  it("reports Claude passthrough until an explicit role mapping exists", () => {
    expect(
      getAi302ModelStrategy("claude", {
        env: { ANTHROPIC_BASE_URL: "https://api.302.ai" },
      }),
    ).toEqual({ mode: "follow", mappings: [] });

    expect(
      getAi302ModelStrategy("claude", {
        env: {
          ANTHROPIC_DEFAULT_SONNET_MODEL: "kimi-k2.7-code",
          ANTHROPIC_DEFAULT_OPUS_MODEL: "deepseek-v4-pro",
        },
      }),
    ).toEqual({
      mode: "fixed",
      mappings: [
        { role: "sonnet", model: "kimi-k2.7-code" },
        { role: "opus", model: "deepseek-v4-pro" },
      ],
    });

    expect(
      getAi302ModelStrategy("claude-desktop", {
        env: { ANTHROPIC_DEFAULT_OPUS_MODEL: "claude-opus-4-8" },
      }),
    ).toEqual({
      mode: "fixed",
      mappings: [{ role: "opus", model: "claude-opus-4-8" }],
    });
  });

  it("extracts the fixed model and endpoint from Codex TOML", () => {
    const config = {
      config:
        'model_provider = "custom"\nmodel = "gpt-5.5"\n\n[model_providers.custom]\nbase_url = "https://api.302.ai/v1"',
    };

    expect(readAi302BaseUrl("codex", config)).toBe("https://api.302.ai/v1");
    expect(getAi302ModelStrategy("codex", config)).toEqual({
      mode: "fixed",
      mappings: [{ role: "default", model: "gpt-5.5" }],
    });
  });
});
