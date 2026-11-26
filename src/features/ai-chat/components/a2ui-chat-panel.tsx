import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Loader2, Square } from "lucide-react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { useCodexChat } from "../hooks/use-codex-chat";
import type { AiPreviewDraft, CompareMode } from "../types";
import { ChatMessageItem } from "./chat-message-item";
import { CodexOfflineBanner } from "./codex-connection-bar";
import { McpApprovalCard } from "./mcp-approval-card";
import { PreviewCompareDock } from "./preview-compare-dock";

export type { AiPreviewDraft, CompareMode } from "../types";

const QUICK_PROMPTS = [
  "今月の予算状況と使いすぎているカテゴリを教えて",
  "今日のランチ980円（食費）とコーヒー450円（カフェ）を記録して",
  "予算管理とカテゴリ分析を最上部に大きく見せるダッシュボードにして",
];

interface A2UIChatPanelProps {
  chat: ReturnType<typeof useCodexChat>;
  dataModel: DataModel;
  saving: boolean;
  previewDraft: AiPreviewDraft | null;
  compareMode: CompareMode;
  appliedDraftIds: Record<string, boolean>;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message?: string }>;
  onPreviewA2UI: (draft: AiPreviewDraft) => void;
  onChangeCompareMode?: (mode: CompareMode) => void;
  onDiscardPreview?: () => void;
  onApplyA2UI?: (draft: AiPreviewDraft) => Promise<void>;
  onOpenInEditor?: (messagesJson: string, suggestedName?: string) => void;
}

export function A2UIChatPanel({
  chat,
  dataModel,
  saving,
  previewDraft,
  compareMode,
  appliedDraftIds,
  onExpenseAction,
  onPreviewA2UI,
  onChangeCompareMode,
  onDiscardPreview,
  onApplyA2UI,
  onOpenInEditor,
}: A2UIChatPanelProps) {
  const [input, setInput] = useState("");

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

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom();

  useEffect(() => {
    if (pendingElicitations.length > 0) {
      void scrollToBottom();
    }
  }, [pendingElicitations.length, scrollToBottom]);

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
      <div className="relative min-h-0 flex-1">
        <ScrollArea className="h-full" viewportRef={scrollRef}>
          <div ref={contentRef} className="space-y-5 px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-2 py-2">
                <div className="text-muted-foreground text-xs font-medium">プロンプト例</div>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isStreaming}
                      onClick={() => void handleSendText(prompt)}
                      className="bg-background hover:bg-accent/60 w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm leading-snug transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  dataModel={dataModel}
                  pending={saving}
                  isStreamingThis={
                    message.role === "assistant" && index === messages.length - 1 && isStreaming
                  }
                  activePreviewDraftId={previewDraft?.draftId ?? null}
                  appliedDraftIds={appliedDraftIds}
                  onExpenseAction={onExpenseAction}
                  onSendPrompt={(text) => void handleSendText(text)}
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
              <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border border-destructive/20 p-2.5 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span className="leading-relaxed">{error.message}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {!isAtBottom && messages.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-4 bottom-3 size-7 rounded-full shadow-sm"
            aria-label="最新へスクロール"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        )}
      </div>

      {previewDraft && onChangeCompareMode && onApplyA2UI && onOpenInEditor && onDiscardPreview && (
        <PreviewCompareDock
          compareMode={compareMode}
          saving={saving}
          onChangeCompareMode={onChangeCompareMode}
          onApply={() => void onApplyA2UI(previewDraft)}
          onOpenInEditor={() => onOpenInEditor(previewDraft.messagesJson, previewDraft.name)}
          onDiscard={onDiscardPreview}
        />
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
            <button
              type="button"
              onClick={() => setAutoApproveSession(false)}
              className="text-primary hover:text-primary/80 cursor-pointer underline underline-offset-2"
            >
              解除
            </button>
          </div>
        )}
        <div className="bg-background focus-within:ring-ring relative rounded-lg border focus-within:ring-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="支出の記録・分析や、UI の変更を依頼..."
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
