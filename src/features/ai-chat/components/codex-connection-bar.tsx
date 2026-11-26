import { Check, Copy, Plug, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CODEX_WS_URL, type CodexClientStatus } from "@/features/ai-chat/codex/client";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

const SERVER_START_COMMAND = "vp run codex:server";

function CommandCopyRow() {
  const { copied, copy } = useCopyToClipboard(1800);

  return (
    <div className="bg-background flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 font-mono text-xs">
      <code className="truncate">{SERVER_START_COMMAND}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void copy(SERVER_START_COMMAND)}
        className="text-muted-foreground hover:text-foreground size-6 shrink-0"
        title="コピー"
        aria-label="起動コマンドをコピー"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}

interface CodexOfflineBannerProps {
  status: CodexClientStatus;
  onReconnect: () => void;
}

export function CodexOfflineBanner({ status, onReconnect }: CodexOfflineBannerProps) {
  if (status.state === "connected" || status.state === "connecting") {
    return null;
  }

  return (
    <div className="shrink-0 space-y-2 border-b px-4 py-3 text-xs">
      <div className="text-foreground flex items-center gap-1.5 font-medium">
        <Plug className="size-3.5 shrink-0" />
        Codex サーバーを起動してください
      </div>
      <CommandCopyRow />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full text-xs"
        onClick={onReconnect}
      >
        <PlugZap className="size-3.5" />
        再接続
      </Button>
    </div>
  );
}

interface CodexConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: CodexClientStatus;
  wsUrlInput: string;
  onWsUrlChange: (url: string) => void;
  onConnect: () => void;
}

export function CodexConnectionDialog({
  open,
  onOpenChange,
  status,
  wsUrlInput,
  onWsUrlChange,
  onConnect,
}: CodexConnectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Codex 接続設定</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConnect();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="codex-ws-url" className="text-xs">
                WebSocket URL
              </Label>
              {status.model && (
                <span className="text-muted-foreground font-mono text-xs">{status.model}</span>
              )}
            </div>
            <Input
              id="codex-ws-url"
              value={wsUrlInput}
              onChange={(e) => onWsUrlChange(e.target.value)}
              placeholder={DEFAULT_CODEX_WS_URL}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">サーバー起動コマンド</Label>
            <CommandCopyRow />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={status.state === "connecting"}>
              接続
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
