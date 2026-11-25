import { useState } from "react";
import { Check, Copy, Plug, PlugZap, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_CODEX_WS_URL, type CodexClientStatus } from "@/lib/codex/client";
import { cn } from "@/lib/utils";

const SERVER_START_COMMAND = "vp run codex:server";

interface CodexConnectionBarProps {
  status: CodexClientStatus;
  wsUrlInput: string;
  showSettings: boolean;
  hasMessages: boolean;
  onWsUrlChange: (url: string) => void;
  onToggleSettings: () => void;
  onConnect: () => void;
  onResetChat: () => void;
}

export function CodexConnectionBar({
  status,
  wsUrlInput,
  showSettings,
  hasMessages,
  onWsUrlChange,
  onToggleSettings,
  onConnect,
  onResetChat,
}: CodexConnectionBarProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);

  const statusDotClass =
    status.state === "connected"
      ? "bg-emerald-500"
      : status.state === "connecting"
        ? "bg-amber-500 animate-pulse"
        : status.state === "error"
          ? "bg-destructive"
          : "bg-muted-foreground/40";

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(SERVER_START_COMMAND);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="shrink-0 space-y-2 border-b px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", statusDotClass)} />
          <span className="truncate text-xs font-medium">
            {status.state === "connected"
              ? status.model || "Codex 接続中"
              : status.state === "connecting"
                ? "接続中..."
                : "未接続"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {hasMessages && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="会話をリセット"
              aria-label="会話をリセット"
              onClick={onResetChat}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            title="接続設定"
            aria-label="接続設定"
            onClick={onToggleSettings}
          >
            <Settings2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-muted/50 space-y-2 rounded-md border p-2.5">
          <div className="text-muted-foreground text-[11px] font-medium">WebSocket URL</div>
          <div className="flex gap-1.5">
            <Input
              value={wsUrlInput}
              onChange={(e) => onWsUrlChange(e.target.value)}
              placeholder={DEFAULT_CODEX_WS_URL}
              className="h-7 font-mono text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="h-7 shrink-0 px-2.5 text-xs"
              disabled={status.state === "connecting"}
              onClick={onConnect}
            >
              接続
            </Button>
          </div>
        </div>
      )}

      {status.state !== "connected" && status.state !== "connecting" && (
        <div className="bg-muted/60 space-y-2 rounded-md border p-2.5 text-xs">
          <div className="text-foreground flex items-center gap-1.5 font-medium">
            <Plug className="size-3.5 shrink-0" />
            Codex サーバーを起動してください
          </div>
          <div className="bg-background flex items-center justify-between gap-2 rounded border px-2 py-1 font-mono text-[11px]">
            <code className="truncate">{SERVER_START_COMMAND}</code>
            <button
              type="button"
              onClick={() => void handleCopyCommand()}
              className="text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-pointer items-center"
              title="コピー"
            >
              {copiedCmd ? <Check className="size-3" /> : <Copy className="size-3" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={onConnect}
          >
            <PlugZap className="size-3.5" />
            再接続
          </Button>
        </div>
      )}
    </div>
  );
}
