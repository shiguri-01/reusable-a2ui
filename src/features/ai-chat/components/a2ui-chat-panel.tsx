import { useEffect, useRef, useState } from "react";
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaScrollToEnd,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "@ui-sdk/react/scroll-area";
import { AlertCircle, ArrowDown, ArrowUp, Eye, Loader2, Square, X } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { useCodexChat } from "../hooks/use-codex-chat";
import type { AiPreviewDraft } from "../types";
import { ChatMessageItem } from "./chat-message-item";
import { CodexOfflineBanner } from "./codex-connection-bar";
import { McpApprovalCard } from "./mcp-approval-card";

const QUICK_PROMPTS = [
  "今月の予算状況と使いすぎているカテゴリを教えて",
  "今日のランチ980円（食費）とコーヒー450円（カフェ）を記録して",
  "予算管理とカテゴリ分析を最上部に大きく見せるダッシュボードにして",
];

interface A2UIChatPanelProps {
  chat: ReturnType<typeof useCodexChat>;
  dataModel: DataModel;
  saving: boolean;
  activePreviewDraftId: string | null;
  showDashboardReturn: boolean;
  appliedDraftIds: Record<string, boolean>;
  editingDraftId: string | null;
  selectedBlock?: string;
  onClearSelectedBlock: () => void;
  focusComposer: boolean;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message?: string }>;
  onPreviewA2UI: (draft: AiPreviewDraft) => void;
  onViewPreview: () => void;
}

export function A2UIChatPanel({
  chat,
  dataModel,
  saving,
  activePreviewDraftId,
  showDashboardReturn,
  appliedDraftIds,
  editingDraftId,
  selectedBlock,
  onClearSelectedBlock,
  focusComposer,
  onExpenseAction,
  onPreviewA2UI,
  onViewPreview,
}: A2UIChatPanelProps) {
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusComposer) composerRef.current?.focus({ preventScroll: true });
  }, [focusComposer]);

  const {
    codexStatus,
    messages,
    isStreaming,
    error,
    pendingElicitations,
    autoApproveSession,
    setAutoApproveSession,
    activeRunningTool,
    approveElicitation,
    declineElicitation,
    connect,
    stopStreaming,
    sendPrompt,
  } = chat;

  const handleSendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    await sendPrompt(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSendText(input);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CodexOfflineBanner status={codexStatus} onReconnect={() => void connect()} />

      {/* Conversation */}
      <ScrollArea stickToEnd className="relative min-h-0 flex-1 overflow-hidden">
        <ScrollAreaViewport role="log" aria-label="チャット履歴" className="h-full w-full">
          <ScrollAreaContent className="space-y-5 px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-2 py-2">
                <div className="text-muted-foreground text-xs font-medium">プロンプト例</div>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      disabled={isStreaming}
                      onClick={() => void handleSendText(prompt)}
                      className="h-auto w-full justify-start px-3 py-2 text-left text-sm leading-snug font-normal whitespace-normal"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  dataModel={dataModel}
                  pending={saving || isStreaming}
                  isStreamingThis={
                    message.role === "assistant" && index === messages.length - 1 && isStreaming
                  }
                  activePreviewDraftId={activePreviewDraftId}
                  appliedDraftIds={appliedDraftIds}
                  editingDraftId={editingDraftId}
                  onExpenseAction={onExpenseAction}
                  onSendPrompt={(text) => void sendPrompt(text)}
                  onPreview={onPreviewA2UI}
                />
              ))
            )}

            {pendingElicitations.map((request) => (
              <McpApprovalCard
                key={String(request.requestId)}
                request={request}
                fallbackToolName={activeRunningTool?.toolName}
                fallbackToolParams={activeRunningTool?.toolParams}
                dataModel={dataModel}
                onApprove={() => approveElicitation(request, false)}
                onApproveSession={() => approveElicitation(request, true)}
                onDecline={() => declineElicitation(request)}
              />
            ))}

            {isStreaming &&
              pendingElicitations.length === 0 &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  応答中...
                </div>
              )}

            {error && (
              <Alert
                variant="destructive"
                className="bg-destructive/10 border-destructive/20 px-3 py-2.5"
              >
                <AlertCircle />
                <AlertDescription className="leading-relaxed">{error.message}</AlertDescription>
              </Alert>
            )}
          </ScrollAreaContent>
        </ScrollAreaViewport>

        <ScrollAreaScrollbar
          orientation="vertical"
          className="flex w-2.5 flex-col p-0.5 opacity-0 transition-opacity data-visible:opacity-100"
        >
          <ScrollAreaThumb className="bg-border hover:bg-muted-foreground/40 data-dragging:bg-muted-foreground/60 rounded-full" />
        </ScrollAreaScrollbar>

        <ScrollAreaScrollToEnd
          aria-label="最新へスクロール"
          className={cn(
            buttonVariants({ variant: "secondary", size: "icon" }),
            "pointer-events-none absolute right-4 bottom-3 size-7 rounded-full opacity-0 shadow-sm transition-opacity data-visible:pointer-events-auto data-visible:opacity-100",
          )}
        >
          <ArrowDown className="size-3.5" />
        </ScrollAreaScrollToEnd>
      </ScrollArea>

      {showDashboardReturn && (
        <div className="shrink-0 border-t p-3 md:hidden">
          <Button type="button" variant="outline" className="w-full" onClick={onViewPreview}>
            <Eye className="size-4" />
            ダッシュボードに戻る
          </Button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendText(input);
        }}
        className="shrink-0 space-y-2 border-t p-3"
      >
        {autoApproveSession && (
          <div className="text-muted-foreground flex items-center justify-between gap-2 px-0.5 text-[11px]">
            <span>この会話中は削除などの MCP 操作を自動許可中</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setAutoApproveSession(false)}
              className="h-auto p-0 text-[11px] underline underline-offset-2"
            >
              解除
            </Button>
          </div>
        )}
        {selectedBlock && (
          <div className="bg-muted inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2 text-xs">
            <span className="truncate">対象：{selectedBlock}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label="対象ブロックを解除"
              onClick={onClearSelectedBlock}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
        <div className="bg-background focus-within:ring-ring relative rounded-lg border focus-within:ring-1">
          <Textarea
            ref={composerRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              focusComposer
                ? "ダッシュボードをどう変えますか？"
                : "支出の記録・分析や、UI の変更を依頼..."
            }
            rows={2}
            className="min-h-[64px] resize-none border-0 pr-11 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="absolute right-2 bottom-2">
            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-7 rounded-md"
                aria-label="停止"
                onClick={stopStreaming}
              >
                <Square className="size-3 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-7 rounded-md"
                disabled={!input.trim()}
                aria-label="送信"
              >
                <ArrowUp className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
