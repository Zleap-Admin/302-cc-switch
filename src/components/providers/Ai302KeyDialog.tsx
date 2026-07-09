import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
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
import ApiKeyInput from "@/components/providers/forms/ApiKeyInput";
import { ProviderIcon } from "@/components/ProviderIcon";
import { AI302_API_BASE_URL, AI302_API_KEY_URL } from "@/config/ai302";
import { fetchModelsForConfig } from "@/lib/api/model-fetch";
import { settingsApi, type AppId } from "@/lib/api";
import type { Provider } from "@/types";

// 302 内置供应商的专属编辑框：接口地址与模型都已预置，
// 用户唯一要做的事就是填 key。「验证」按钮拿 key 去请求 302 的
// 模型列表接口，让用户保存前就知道这把 key 到底能不能用。
// 通用编辑（改名、调模型等）走 EditProviderDialog 的完整表单，这里不做。

interface Ai302KeyDialogProps {
  open: boolean;
  provider: Provider | null;
  appId: AppId;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    provider: Provider;
    originalId?: string;
  }) => Promise<void> | void;
}

// key 在各应用配置里的落点与后端种子(AI302_SEEDS)保持一致
function readApiKey(appId: AppId, config: Record<string, unknown>): string {
  if (appId === "codex") {
    const auth = config.auth as Record<string, unknown> | undefined;
    return typeof auth?.OPENAI_API_KEY === "string" ? auth.OPENAI_API_KEY : "";
  }
  const env = config.env as Record<string, unknown> | undefined;
  const field = appId === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return typeof env?.[field] === "string" ? (env[field] as string) : "";
}

function writeApiKey(
  appId: AppId,
  config: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  if (appId === "codex") {
    const auth = (config.auth ?? {}) as Record<string, unknown>;
    return { ...config, auth: { ...auth, OPENAI_API_KEY: key } };
  }
  const env = (config.env ?? {}) as Record<string, unknown>;
  const field = appId === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return { ...config, env: { ...env, [field]: key } };
}

// 验证时优先用配置里实际生效的接口地址（用户可能切到国内域名），codex 的
// config 是 toml 文本不做解析，直接用默认根地址
function readBaseUrl(appId: AppId, config: Record<string, unknown>): string {
  const env = config.env as Record<string, unknown> | undefined;
  const field =
    appId === "gemini" ? "GOOGLE_GEMINI_BASE_URL" : "ANTHROPIC_BASE_URL";
  const fromEnv = appId === "codex" ? undefined : env?.[field];
  return typeof fromEnv === "string" && fromEnv.trim() !== ""
    ? fromEnv
    : AI302_API_BASE_URL;
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
}: Ai302KeyDialogProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

  const initialKey = useMemo(
    () =>
      provider
        ? readApiKey(appId, provider.settingsConfig as Record<string, unknown>)
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

  const handleVerify = async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setVerify({ status: "fail", reason: "empty" });
      return;
    }
    setVerify({ status: "loading" });
    try {
      const baseUrl = readBaseUrl(
        appId,
        provider.settingsConfig as Record<string, unknown>,
      );
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
        settingsConfig: writeApiKey(
          appId,
          provider.settingsConfig as Record<string, unknown>,
          apiKey.trim(),
        ),
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
                "接口地址与模型均已预置，模型自动跟随客户端——只差这一把 Key。",
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
