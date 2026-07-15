import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Route,
  Save,
  Settings2,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ApiKeyInput from "@/components/providers/forms/ApiKeyInput";
import { ProviderIcon } from "@/components/ProviderIcon";
import {
  AI302_API_KEY_URL,
  getAi302ModelStrategy,
  readAi302ApiKey,
  readAi302BaseUrl,
  writeAi302ApiKey,
} from "@/config/ai302";
import { fetchModelsForConfig } from "@/lib/api/model-fetch";
import { settingsApi, type AppId } from "@/lib/api";
import type { Provider } from "@/types";

// 302 内置供应商的专属编辑框：接口地址已预置，模型策略在表单内明确展示。
// 「一键诊断」使用模型列表接口检查 key 与网络，不产生模型调用费用。
// 改名、固定模型等低频操作继续复用 EditProviderDialog 的完整表单。

interface Ai302KeyDialogProps {
  open: boolean;
  provider: Provider | null;
  appId: AppId;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    provider: Provider;
    originalId?: string;
  }) => Promise<void> | void;
  onAdvancedSettings?: () => void;
}

type VerifyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; modelCount: number }
  | { status: "fail"; reason: "key" | "network" | "empty" };

export function Ai302KeyDialog({
  open,
  provider,
  appId,
  onOpenChange,
  onSubmit,
  onAdvancedSettings,
}: Ai302KeyDialogProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

  const initialKey = useMemo(
    () =>
      provider
        ? readAi302ApiKey(
            appId,
            provider.settingsConfig as Record<string, unknown>,
          )
        : "",
    [provider?.id, appId, open],
  );

  // 每次打开时回填当前 key，关闭丢弃未保存的输入
  useEffect(() => {
    if (open) {
      setApiKey(initialKey);
      setVerify({ status: "idle" });
    }
  }, [open, initialKey]);

  if (!provider) {
    return null;
  }

  const config = provider.settingsConfig as Record<string, unknown>;
  const modelStrategy = getAi302ModelStrategy(appId, config);
  const baseUrl = readAi302BaseUrl(appId, config);
  const clientName =
    appId === "claude"
      ? "Claude Code"
      : appId === "claude-desktop"
        ? "Claude Desktop"
        : appId === "codex"
          ? "Codex"
          : appId === "gemini"
            ? "Gemini CLI"
            : appId;

  const handleVerify = async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setVerify({ status: "fail", reason: "empty" });
      return;
    }
    setVerify({ status: "loading" });
    try {
      const models = await fetchModelsForConfig(baseUrl, trimmed);
      setVerify({ status: "ok", modelCount: models.length });
    } catch (err) {
      const msg = String(err);
      const isAuthError = msg.includes("HTTP 401") || msg.includes("HTTP 403");
      setVerify({ status: "fail", reason: isAuthError ? "key" : "network" });
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updated: Provider = {
        ...provider,
        settingsConfig: writeAi302ApiKey(appId, config, apiKey.trim()),
      };
      await onSubmit({ provider: updated, originalId: provider.id });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyLine = (() => {
    switch (verify.status) {
      case "loading":
        return (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("ai302.verifying", { defaultValue: "正在验证……" })}
          </span>
        );
      case "ok":
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {t("ai302.verifyOk", {
              defaultValue: "Key 可用，{{num}} 个模型就绪",
              num: verify.modelCount,
            })}
          </span>
        );
      case "fail":
        return (
          <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            {verify.reason === "empty"
              ? t("ai302.verifyNeedKey", {
                  defaultValue: "请先填写 Key 再验证",
                })
              : verify.reason === "key"
                ? t("ai302.verifyFailKey", {
                    defaultValue: "Key 无效或已过期",
                  })
                : t("ai302.verifyFailNetwork", {
                    defaultValue: "连不上 302.AI，请检查网络后重试",
                  })}
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="text-left sm:text-left">
          <DialogTitle className="flex items-center gap-2.5">
            <ProviderIcon icon="ai302" name={provider.name} size={24} />
            {t("ai302.dialogTitle", { defaultValue: "302.AI API Key" })}
          </DialogTitle>
          <DialogDescription>
            {t("ai302.dialogHint", {
              defaultValue:
                "接口地址已预置，模型策略会在下方明确显示。现在只差这一把 Key。",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <ApiKeyInput
            id="ai302-api-key"
            value={apiKey}
            onChange={(value) => {
              setApiKey(value);
              // key 一变，旧的验证结论就不作数了
              setVerify({ status: "idle" });
            }}
            placeholder="sk-..."
            label={t("ai302.keyLabel", { defaultValue: "API Key" })}
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void settingsApi.openExternal(AI302_API_KEY_URL)}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("ai302.getKey", { defaultValue: "没有 Key？去 302.AI 领取" })}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleVerify(apiKey)}
              disabled={verify.status === "loading"}
            >
              {t("ai302.verify", { defaultValue: "验证 Key" })}
            </Button>
          </div>

          {/* 占位固定高度，验证结果出现时布局不跳动 */}
          <div className="min-h-5 text-sm">{verifyLine}</div>

          <div className="rounded-lg border border-border bg-muted/30 p-3.5">
            <div className="flex items-start gap-3">
              <Route className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm font-medium">
                  {t("ai302.modelStrategyTitle", {
                    defaultValue: "模型策略",
                  })}
                </div>
                {modelStrategy.mode === "follow" ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("ai302.modelStrategyFollow", {
                      client: clientName,
                      defaultValue: `自动路由：跟随 ${clientName}，按任务自动选择模型，请求原样发送给 302.AI。`,
                    })}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      {t("ai302.modelStrategyFixed", {
                        defaultValue: "已固定模型",
                      })}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {modelStrategy.mappings.map((mapping) => (
                        <span key={`${mapping.role}-${mapping.model}`}>
                          <span className="text-muted-foreground">
                            {mapping.role === "default"
                              ? t("ai302.defaultModel", {
                                  defaultValue: "默认",
                                })
                              : mapping.role}
                            :
                          </span>{" "}
                          <span className="font-medium">{mapping.model}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="group h-8 w-full justify-between px-2 text-muted-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5" />
                  {t("ai302.technicalDetails", {
                    defaultValue: "技术详情",
                  })}
                </span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 rounded-md bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-start justify-between gap-4">
                <span>{t("ai302.endpoint", { defaultValue: "请求地址" })}</span>
                <span className="break-all text-right font-mono text-foreground">
                  {baseUrl}
                </span>
              </div>
              <p className="leading-relaxed">
                {t("ai302.diagnosisHint", {
                  defaultValue:
                    "验证会同时检查 Key、网络和模型列表，不会发起付费模型请求。",
                })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          {onAdvancedSettings && (
            <Button
              variant="ghost"
              onClick={() => {
                onAdvancedSettings();
              }}
              disabled={isSubmitting}
              className="sm:mr-auto"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              {t("ai302.advancedModels", {
                defaultValue: "高级模型设置",
              })}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isSubmitting || !apiKey.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
