import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ApiKeyInput from "@/components/providers/forms/ApiKeyInput";
import { ProviderIcon } from "@/components/ProviderIcon";
import { useSettingsQuery } from "@/lib/query";
import { providersApi, settingsApi } from "@/lib/api";
import { fetchModelsForConfig } from "@/lib/api/model-fetch";
import { streamCheckProvider } from "@/lib/api/model-test";
import {
  AI302_API_BASE_URL,
  AI302_API_KEY_URL,
  AI302_ONBOARDING_APPS,
  AI302_SEED_IDS,
  type Ai302OnboardingApp,
  getAi302ModelStrategy,
  readAi302ApiKey,
  readAi302BaseUrl,
  writeAi302ApiKey,
} from "@/config/ai302";
import { codexProviderPresets } from "@/config/codexProviderPresets";
import { geminiProviderPresets } from "@/config/geminiProviderPresets";
import type { Provider } from "@/types";
import { cn } from "@/lib/utils";

type ToolState = "idle" | "checking" | "installed" | "missing" | "broken";
type VerifyState = "idle" | "checking" | "ok" | "error";
type ModelMode = "follow" | "fixed";

interface ToolResult {
  state: ToolState;
  version?: string;
  error?: string;
}

interface ConfigureResult {
  appId: Ai302OnboardingApp;
  success: boolean;
  reachable: boolean;
  error?: string;
}

const APP_DETAILS: Record<
  Ai302OnboardingApp,
  { name: string; icon: string; configLabel: string }
> = {
  claude: {
    name: "Claude Code",
    icon: "anthropic",
    configLabel: "~/.claude/settings.json",
  },
  codex: {
    name: "Codex",
    icon: "openai",
    configLabel: "~/.codex/config.toml",
  },
  gemini: {
    name: "Gemini CLI",
    icon: "gemini",
    configLabel: "~/.gemini/.env",
  },
};

const INITIAL_TOOLS: Record<Ai302OnboardingApp, ToolResult> = {
  claude: { state: "idle" },
  codex: { state: "idle" },
  gemini: { state: "idle" },
};

const INITIAL_SELECTION: Record<Ai302OnboardingApp, boolean> = {
  claude: false,
  codex: false,
  gemini: false,
};

const INITIAL_FIXED_MODELS = {
  sonnet: "",
  opus: "",
  fable: "",
  haiku: "",
};

// 引导页展示的"默认模型 / 接口地址"来自 302.AI 预设本身，而不是写死的字符串——
// 这样预设改了默认模型或地址后，这两处展示会跟着变，不会悄悄显示过期信息。
const AI302_CODEX_PRESET = codexProviderPresets.find(
  (preset) => preset.name === "302.AI",
);
const AI302_GEMINI_PRESET = geminiProviderPresets.find(
  (preset) => preset.name === "302.AI",
);

function ai302OnboardingDefaultModel(appId: Ai302OnboardingApp): string {
  if (appId === "codex" && AI302_CODEX_PRESET) {
    const strategy = getAi302ModelStrategy("codex", {
      auth: AI302_CODEX_PRESET.auth,
      config: AI302_CODEX_PRESET.config,
    });
    return strategy.mappings[0]?.model ?? "";
  }
  if (appId === "gemini" && AI302_GEMINI_PRESET) {
    const strategy = getAi302ModelStrategy(
      "gemini",
      AI302_GEMINI_PRESET.settingsConfig as Record<string, unknown>,
    );
    return strategy.mappings[0]?.model ?? "";
  }
  return "";
}

function ai302OnboardingBaseUrl(appId: Ai302OnboardingApp): string {
  if (appId === "codex" && AI302_CODEX_PRESET) {
    return readAi302BaseUrl("codex", {
      auth: AI302_CODEX_PRESET.auth,
      config: AI302_CODEX_PRESET.config,
    });
  }
  return AI302_API_BASE_URL;
}

function applyClaudeModelMode(
  config: Record<string, unknown>,
  mode: ModelMode,
  models: typeof INITIAL_FIXED_MODELS,
): Record<string, unknown> {
  const env = { ...((config.env ?? {}) as Record<string, unknown>) };
  const fields = {
    sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    fable: "ANTHROPIC_DEFAULT_FABLE_MODEL",
    haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  } as const;

  for (const field of Object.values(fields)) delete env[field];
  if (mode === "fixed") {
    for (const [role, field] of Object.entries(fields) as Array<
      [keyof typeof fields, (typeof fields)[keyof typeof fields]]
    >) {
      const model = models[role].trim();
      if (model) env[field] = model;
    }
  }
  return { ...config, env };
}

/** 首次运行配置向导，仅在全新安装且用户尚未确认时展示。 */
export function FirstRunNoticeDialog() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings } = useSettingsQuery();
  const isOpen = settings != null && settings.firstRunNoticeConfirmed !== true;

  const [step, setStep] = useState(0);
  const [tools, setTools] = useState(INITIAL_TOOLS);
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [detectionStarted, setDetectionStarted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [modelCount, setModelCount] = useState(0);
  const [modelMode, setModelMode] = useState<ModelMode>("follow");
  const [fixedModels, setFixedModels] = useState(INITIAL_FIXED_MODELS);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configureResults, setConfigureResults] = useState<ConfigureResult[]>(
    [],
  );
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const selectedApps = useMemo(
    () => AI302_ONBOARDING_APPS.filter((appId) => selection[appId]),
    [selection],
  );

  const fixedModeValid =
    modelMode === "follow" ||
    Object.values(fixedModels).some((model) => model.trim());

  const resetWizardState = useCallback(() => {
    setStep(0);
    setTools(INITIAL_TOOLS);
    setSelection(INITIAL_SELECTION);
    setDetectionStarted(false);
    setApiKey("");
    setVerifyState("idle");
    setVerifyError("");
    setModelCount(0);
    setModelMode("follow");
    setFixedModels(INITIAL_FIXED_MODELS);
    setIsConfiguring(false);
    setConfigureResults([]);
    setIsDiagnosing(false);
  }, []);

  useEffect(() => {
    if (isOpen) resetWizardState();
  }, [isOpen, resetWizardState]);

  const saveCompletion = useCallback(async () => {
    if (!settings) return;
    const { webdavSync: _, ...rest } = settings;
    await settingsApi.save({ ...rest, firstRunNoticeConfirmed: true });
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  }, [queryClient, settings]);

  const detectTools = useCallback(async () => {
    setDetectionStarted(true);
    setTools({
      claude: { state: "checking" },
      codex: { state: "checking" },
      gemini: { state: "checking" },
    });
    try {
      const batches = await Promise.all(
        AI302_ONBOARDING_APPS.map((appId) =>
          settingsApi.getToolVersions([appId]),
        ),
      );
      const nextTools = { ...INITIAL_TOOLS };
      const nextSelection = { ...INITIAL_SELECTION };
      AI302_ONBOARDING_APPS.forEach((appId, index) => {
        const result = batches[index][0];
        if (result?.version) {
          nextTools[appId] = {
            state: "installed",
            version: result.version,
          };
          nextSelection[appId] = true;
        } else if (result?.installed_but_broken) {
          nextTools[appId] = {
            state: "broken",
            error: result.error ?? undefined,
          };
        } else {
          nextTools[appId] = {
            state: "missing",
            error: result?.error ?? undefined,
          };
        }
      });
      setTools(nextTools);
      setSelection((current) =>
        Object.values(current).some(Boolean) ? current : nextSelection,
      );
    } catch (error) {
      const message = String(error);
      setTools({
        claude: { state: "broken", error: message },
        codex: { state: "broken", error: message },
        gemini: { state: "broken", error: message },
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen && step === 1 && !detectionStarted) void detectTools();
  }, [detectTools, detectionStarted, isOpen, step]);

  const verifyKey = useCallback(async (): Promise<boolean> => {
    const key = apiKey.trim();
    if (!key) {
      setVerifyState("error");
      setVerifyError(
        t("onboarding.keyRequired", { defaultValue: "请先填写 API Key" }),
      );
      return false;
    }
    setVerifyState("checking");
    setVerifyError("");
    try {
      const models = await fetchModelsForConfig(AI302_API_BASE_URL, key);
      setModelCount(models.length);
      setVerifyState("ok");
      return true;
    } catch (error) {
      const message = String(error);
      const authFailed = message.includes("401") || message.includes("403");
      setVerifyError(
        authFailed
          ? t("onboarding.keyInvalid", {
              defaultValue: "Key 无效或没有访问权限",
            })
          : t("onboarding.keyNetworkError", {
              defaultValue: "无法连接 302.AI，请检查网络后重试",
            }),
      );
      setVerifyState("error");
      return false;
    }
  }, [apiKey, t]);

  const configureApp = useCallback(
    async (appId: Ai302OnboardingApp): Promise<ConfigureResult> => {
      try {
        const providers = await providersApi.getAll(appId);
        const provider = providers[AI302_SEED_IDS[appId]];
        if (!provider) {
          throw new Error(
            t("onboarding.presetMissing", {
              app: APP_DETAILS[appId].name,
              defaultValue: `${APP_DETAILS[appId].name} 的 302.AI 预设不存在`,
            }),
          );
        }

        let settingsConfig = writeAi302ApiKey(
          appId,
          provider.settingsConfig as Record<string, unknown>,
          apiKey.trim(),
        );
        if (appId === "claude") {
          settingsConfig = applyClaudeModelMode(
            settingsConfig,
            modelMode,
            fixedModels,
          );
        }

        const updated: Provider = { ...provider, settingsConfig };
        await providersApi.update(updated, appId, provider.id);
        await providersApi.switch(provider.id, appId);

        let reachable = false;
        try {
          const check = await streamCheckProvider(appId, provider.id);
          reachable = check.status !== "failed";
        } catch {
          reachable = false;
        }
        return { appId, success: true, reachable };
      } catch (error) {
        return {
          appId,
          success: false,
          reachable: false,
          error: String(error),
        };
      }
    },
    [apiKey, fixedModels, modelMode, t],
  );

  const configureSelectedApps = useCallback(async () => {
    if (selectedApps.length === 0 || !fixedModeValid) return;
    setIsConfiguring(true);
    try {
      const keyOk = verifyState === "ok" ? true : await verifyKey();
      if (!keyOk) {
        setStep(2);
        return;
      }
      const results = await Promise.all(selectedApps.map(configureApp));
      setConfigureResults(results);
      await Promise.all(
        selectedApps.map((appId) =>
          queryClient.invalidateQueries({ queryKey: ["providers", appId] }),
        ),
      );
      try {
        await providersApi.updateTrayMenu();
      } catch (error) {
        console.error("[Onboarding] Failed to refresh the tray menu", error);
      }
      setStep(5);
    } finally {
      setIsConfiguring(false);
    }
  }, [
    configureApp,
    fixedModeValid,
    queryClient,
    selectedApps,
    verifyKey,
    verifyState,
  ]);

  const runDiagnosis = useCallback(async () => {
    setIsDiagnosing(true);
    try {
      await detectTools();
      await verifyKey();
      const results = await Promise.all(
        selectedApps.map(async (appId): Promise<ConfigureResult> => {
          try {
            const providers = await providersApi.getAll(appId);
            const provider = providers[AI302_SEED_IDS[appId]];
            if (!provider) {
              throw new Error(
                t("onboarding.presetMissing", {
                  app: APP_DETAILS[appId].name,
                  defaultValue: `${APP_DETAILS[appId].name} 的 302.AI 预设不存在`,
                }),
              );
            }
            if (
              readAi302ApiKey(
                appId,
                provider.settingsConfig as Record<string, unknown>,
              ) !== apiKey.trim()
            ) {
              throw new Error(
                t("onboarding.configNotApplied", {
                  defaultValue: "302.AI 配置尚未写入",
                }),
              );
            }

            let reachable = false;
            try {
              const check = await streamCheckProvider(
                appId,
                AI302_SEED_IDS[appId],
              );
              reachable = check.status !== "failed";
            } catch {
              reachable = false;
            }
            return {
              appId,
              success: true,
              reachable,
            };
          } catch (error) {
            return {
              appId,
              success: false,
              reachable: false,
              error: String(error),
            };
          }
        }),
      );
      setConfigureResults(results);
    } finally {
      setIsDiagnosing(false);
    }
  }, [apiKey, detectTools, selectedApps, t, verifyKey]);

  const goBack = () => setStep((current) => Math.max(0, current - 1));
  const goNext = () => setStep((current) => Math.min(5, current + 1));
  const allConfigured =
    configureResults.length > 0 &&
    configureResults.every((result) => result.success);

  const stepTitle = [
    t("onboarding.introTitle", { defaultValue: "一个入口，管理所有配置" }),
    t("onboarding.detectTitle", { defaultValue: "看看你正在使用哪些工具" }),
    t("onboarding.keyTitle", { defaultValue: "连接你的 302.AI 账户" }),
    t("onboarding.appsTitle", { defaultValue: "选择要接入的客户端" }),
    t("onboarding.modelsTitle", { defaultValue: "确认模型策略" }),
    allConfigured
      ? t("onboarding.doneTitle", { defaultValue: "配置已经就绪" })
      : t("onboarding.partialDoneTitle", {
          defaultValue: "检查配置结果",
        }),
  ][step];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void saveCompletion();
      }}
    >
      <DialogContent
        className="max-w-[760px] overflow-hidden"
        zIndex="top"
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2.5">
              <ProviderIcon icon="ai302" name="302.AI" size={24} />
              {stepTitle}
            </DialogTitle>
            {step > 0 && step < 5 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {step}/4
              </span>
            )}
          </div>
          {step > 0 && step < 5 && (
            <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={cn(
                    "h-1 rounded-full transition-colors",
                    item <= step ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="min-h-[390px] overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="flex min-h-[350px] flex-col justify-center">
              <div className="max-w-[560px] space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">
                    {t("onboarding.introHeading", {
                      defaultValue: "一个 Key，连接你的编码工具",
                    })}
                  </h2>
                  <DialogDescription className="max-w-[54ch] text-base leading-relaxed">
                    {t("onboarding.introBody", {
                      defaultValue:
                        "302 CC Switch 统一管理 Claude Code、Codex 和 Gemini CLI 的 API 配置。切换供应商时，原配置会自动保留。",
                    })}
                  </DialogDescription>
                </div>
                <div className="grid gap-3 pt-3 sm:grid-cols-[1fr_1.2fr]">
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium">
                        {t("onboarding.oneKey", {
                          defaultValue: "只填一次 Key",
                        })}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t("onboarding.oneKeyBody", {
                          defaultValue:
                            "选择客户端后，自动写入正确的地址和认证字段。",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <Route className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium">
                        {t("onboarding.switchSafely", {
                          defaultValue: "多套配置，随时切换",
                        })}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t("onboarding.switchSafelyBody", {
                          defaultValue:
                            "官方、302.AI 和自定义配置互不覆盖，当前模型始终可见。",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <DialogDescription>
                {t("onboarding.detectBody", {
                  defaultValue:
                    "我们只读取本机安装状态，不会修改任何工具。未安装的客户端也可以稍后配置。",
                })}
              </DialogDescription>
              <div className="overflow-hidden rounded-lg border border-border">
                {AI302_ONBOARDING_APPS.map((appId, index) => {
                  const detail = APP_DETAILS[appId];
                  const result = tools[appId];
                  return (
                    <div
                      key={appId}
                      className={cn(
                        "flex min-h-16 items-center gap-3 px-4 py-3",
                        index > 0 && "border-t border-border",
                      )}
                    >
                      <ProviderIcon
                        icon={detail.icon}
                        name={detail.name}
                        size={22}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{detail.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {result.state === "checking"
                            ? t("onboarding.detecting", {
                                defaultValue: "正在检测",
                              })
                            : result.state === "installed"
                              ? result.version
                              : result.state === "broken"
                                ? t("onboarding.installedBroken", {
                                    defaultValue: "已安装，但暂时无法运行",
                                  })
                                : t("onboarding.notInstalled", {
                                    defaultValue: "未检测到",
                                  })}
                        </div>
                      </div>
                      {result.state === "checking" ||
                      result.state === "idle" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : result.state === "installed" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : result.state === "broken" ? (
                        <CircleAlert className="h-5 w-5 text-amber-500" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("onboarding.optional", { defaultValue: "可选" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void detectTools()}
                disabled={Object.values(tools).some(
                  (tool) => tool.state === "checking",
                )}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("onboarding.detectAgain", { defaultValue: "重新检测" })}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto max-w-[520px] space-y-5 py-4">
              <DialogDescription className="leading-relaxed">
                {t("onboarding.keyBody", {
                  defaultValue:
                    "Key 只保存在本机，并写入你选中的客户端配置。验证不会产生模型调用费用。",
                })}
              </DialogDescription>
              <ApiKeyInput
                id="onboarding-ai302-key"
                value={apiKey}
                onChange={(value) => {
                  setApiKey(value);
                  setVerifyState("idle");
                  setVerifyError("");
                }}
                placeholder="sk-..."
                label="302.AI API Key"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void settingsApi.openExternal(AI302_API_KEY_URL)
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("onboarding.getKey", {
                    defaultValue: "前往 302.AI 获取 Key",
                  })}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void verifyKey()}
                  disabled={verifyState === "checking"}
                >
                  {verifyState === "checking" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {t("onboarding.verifyAndDiagnose", {
                    defaultValue: "验证并诊断",
                  })}
                </Button>
              </div>
              {verifyState === "ok" && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {t("onboarding.keyOk", {
                    count: modelCount,
                    defaultValue: `Key 可用，已读取 ${modelCount} 个模型`,
                  })}
                </div>
              )}
              {verifyState === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {verifyError}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <DialogDescription>
                {t("onboarding.appsBody", {
                  defaultValue:
                    "已安装的客户端会默认选中。你也可以提前配置尚未安装的客户端。",
                })}
              </DialogDescription>
              <div className="overflow-hidden rounded-lg border border-border">
                {AI302_ONBOARDING_APPS.map((appId, index) => {
                  const detail = APP_DETAILS[appId];
                  return (
                    <label
                      key={appId}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
                        index > 0 && "border-t border-border",
                      )}
                    >
                      <Checkbox
                        checked={selection[appId]}
                        onCheckedChange={(checked) =>
                          setSelection((current) => ({
                            ...current,
                            [appId]: checked === true,
                          }))
                        }
                      />
                      <ProviderIcon
                        icon={detail.icon}
                        name={detail.name}
                        size={22}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{detail.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {detail.configLabel}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {tools[appId].state === "installed"
                          ? t("onboarding.installed", {
                              defaultValue: "已安装",
                            })
                          : t("onboarding.notInstalled", {
                              defaultValue: "未检测到",
                            })}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedApps.length === 0 && (
                <p className="text-sm text-destructive">
                  {t("onboarding.selectOne", {
                    defaultValue: "至少选择一个客户端",
                  })}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <DialogDescription>
                {selection.claude
                  ? t("onboarding.modelsBody", {
                      defaultValue:
                        "Claude Code 默认把当前选择的模型原样发送给 302.AI。需要锁定版本时，可以设置固定映射。",
                    })
                  : t("onboarding.modelsBodyNoClaude", {
                      defaultValue: "确认各客户端将要写入的默认模型。",
                    })}
              </DialogDescription>

              {selection.claude && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setModelMode("follow")}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      modelMode === "follow"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Route className="h-5 w-5 text-primary" />
                      {modelMode === "follow" && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="mt-3 text-sm font-medium">
                      {t("onboarding.followClaude", {
                        defaultValue: "跟随官方调用",
                      })}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t("onboarding.followClaudeBody", {
                        defaultValue:
                          "Opus 4.8 会请求 claude-opus-4-8，不额外替换。",
                      })}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModelMode("fixed")}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      modelMode === "fixed"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <SlidersHorizontal className="h-5 w-5 text-primary" />
                      {modelMode === "fixed" && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="mt-3 text-sm font-medium">
                      {t("onboarding.fixedModels", {
                        defaultValue: "固定模型映射",
                      })}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t("onboarding.fixedModelsBody", {
                        defaultValue:
                          "为角色指定版本，适合成本控制和稳定复现。",
                      })}
                    </p>
                  </button>
                </div>
              )}

              {selection.claude && modelMode === "fixed" && (
                <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
                  {(
                    Object.keys(fixedModels) as Array<keyof typeof fixedModels>
                  ).map((role) => (
                    <label key={role} className="space-y-1.5">
                      <span className="text-xs font-medium capitalize">
                        {role}
                      </span>
                      <Input
                        value={fixedModels[role]}
                        onChange={(event) =>
                          setFixedModels((current) => ({
                            ...current,
                            [role]: event.target.value,
                          }))
                        }
                        placeholder={
                          role === "sonnet"
                            ? "claude-sonnet-5"
                            : role === "opus"
                              ? "claude-opus-4-8"
                              : role === "fable"
                                ? "claude-fable-5"
                                : "claude-haiku-4-5"
                        }
                      />
                    </label>
                  ))}
                  {!fixedModeValid && (
                    <p className="text-xs text-destructive sm:col-span-2">
                      {t("onboarding.fixedModelRequired", {
                        defaultValue:
                          "至少填写一个模型，其余角色由 Claude Code 处理。",
                      })}
                    </p>
                  )}
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-border">
                {selectedApps.map((appId, index) => (
                  <div
                    key={appId}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      index > 0 && "border-t border-border",
                    )}
                  >
                    <ProviderIcon
                      icon={APP_DETAILS[appId].icon}
                      name={APP_DETAILS[appId].name}
                      size={20}
                    />
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {APP_DETAILS[appId].name}
                    </span>
                    <span className="max-w-[55%] truncate text-xs text-muted-foreground">
                      {appId === "claude"
                        ? modelMode === "follow"
                          ? t("onboarding.passthrough", {
                              defaultValue: "原样转发",
                            })
                          : t("onboarding.customMapping", {
                              defaultValue: "自定义映射",
                            })
                        : ai302OnboardingDefaultModel(appId)}
                    </span>
                  </div>
                ))}
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group w-full justify-between px-2 text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <TerminalSquare className="h-4 w-4" />
                      {t("onboarding.technicalDetails", {
                        defaultValue: "查看写入位置和接口地址",
                      })}
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                  {selectedApps.map((appId) => (
                    <div
                      key={appId}
                      className="flex items-start justify-between gap-4"
                    >
                      <span>{APP_DETAILS[appId].configLabel}</span>
                      <span className="text-right font-mono text-foreground">
                        {ai302OnboardingBaseUrl(appId)}
                      </span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4",
                  allConfigured
                    ? "border-primary/25 bg-primary/5"
                    : "border-amber-500/30 bg-amber-500/5",
                )}
              >
                {allConfigured ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                ) : (
                  <CircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {allConfigured
                      ? t("onboarding.doneSummary", {
                          defaultValue: "302.AI 已写入并启用",
                        })
                      : t("onboarding.partialSummary", {
                          defaultValue: "部分客户端需要处理",
                        })}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("onboarding.doneBody", {
                      defaultValue:
                        "以后可以在供应商卡片看到当前模型策略，也可以随时切回官方配置。",
                    })}
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                {configureResults.map((result, index) => (
                  <div
                    key={result.appId}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5",
                      index > 0 && "border-t border-border",
                    )}
                  >
                    <ProviderIcon
                      icon={APP_DETAILS[result.appId].icon}
                      name={APP_DETAILS[result.appId].name}
                      size={21}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {APP_DETAILS[result.appId].name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {!result.success
                          ? result.error
                          : result.reachable
                            ? t("onboarding.configuredReachable", {
                                defaultValue: "已启用，接口可达",
                              })
                            : t("onboarding.configuredUnreachable", {
                                defaultValue: "已启用，但当前网络无法访问接口",
                              })}
                      </div>
                    </div>
                    {result.success && result.reachable ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <CircleAlert className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
              {verifyState === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {verifyError}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => void runDiagnosis()}
                disabled={isDiagnosing}
              >
                {isDiagnosing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {t("onboarding.diagnoseAgain", {
                  defaultValue: "重新运行一键诊断",
                })}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <div>
            {step === 0 ? (
              <Button variant="ghost" onClick={() => void saveCompletion()}>
                {t("onboarding.skip", { defaultValue: "暂时跳过" })}
              </Button>
            ) : step < 5 ? (
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back", { defaultValue: "返回" })}
              </Button>
            ) : (
              <span />
            )}
          </div>
          {step === 0 ? (
            <Button onClick={goNext}>
              {t("onboarding.start", { defaultValue: "开始配置" })}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : step === 1 ? (
            <Button
              onClick={goNext}
              disabled={Object.values(tools).some(
                (tool) => tool.state === "checking" || tool.state === "idle",
              )}
            >
              {t("common.next", { defaultValue: "下一步" })}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : step === 2 ? (
            <Button
              onClick={() => {
                if (verifyState === "ok") goNext();
                else void verifyKey().then((ok) => ok && goNext());
              }}
              disabled={verifyState === "checking" || !apiKey.trim()}
            >
              {t("common.next", { defaultValue: "下一步" })}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : step === 3 ? (
            <Button onClick={goNext} disabled={selectedApps.length === 0}>
              {t("common.next", { defaultValue: "下一步" })}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : step === 4 ? (
            <Button
              onClick={() => void configureSelectedApps()}
              disabled={isConfiguring || !fixedModeValid}
            >
              {isConfiguring ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {t("onboarding.apply", { defaultValue: "写入并启用" })}
            </Button>
          ) : (
            <Button onClick={() => void saveCompletion()}>
              {t("onboarding.enterApp", { defaultValue: "进入 302 CC Switch" })}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
