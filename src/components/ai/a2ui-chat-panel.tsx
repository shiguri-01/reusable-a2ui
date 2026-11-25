import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { AlertCircle, ArrowDown, ArrowUp, Loader2, Square } from "lucide-react";
import { useStickToBottom } from "use-stick-to-bottom";
import {
  buildA2UIDeveloperInstructions,
  buildUserTurnPrompt,
  extractA2UIFromText,
} from "@/a2ui/prompt";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  CodexAppServerClient,
  DEFAULT_CODEX_WS_URL,
  type CodexClientStatus,
} from "@/lib/codex/client";
import { CodexChatTransport } from "@/lib/codex/transport";
import { ChatMessageItem } from "./chat-message-item";
import { CodexConnectionBar } from "./codex-connection-bar";
import { PreviewCompareDock } from "./preview-compare-dock";
import {
  getMessageText,
  getPrecedingUserText,
  summarizePromptForVersionName,
  type AiPreviewDraft,
  type CompareMode,
} from "./types";

export type { AiPreviewDraft, CompareMode } from "./types";

const STORAGE_KEY_WS_URL = "reusable-a2ui:codex-ws-url:v3";

const QUICK_PROMPTS = [
  "予算管理とカテゴリ分析を最上部に大きく見せるレイアウトにして",
  "支出入力フォームを最上部に置いたシンプルな1カラムにして",
  "KPIを4枚構成にして、最近の支出を5件だけ表示するコンパクト版にして",
];

interface A2UIChatPanelProps {
  activeVersionName: string;
  currentMessagesJson: string;
  nextVersionNumber: number;
  saving: boolean;
  previewDraft: AiPreviewDraft | null;
  compareMode: CompareMode;
  appliedMessageIds: Record<string, boolean>;
  onPreviewA2UI: (draft: AiPreviewDraft) => void;
  onChangeCompareMode: (mode: CompareMode) => void;
  onDiscardPreview: () => void;
  onApplyA2UI: (options: {
    messageId: string;
    name: string;
    description: string;
    messagesJson: string;
  }) => Promise<void>;
  onOpenInEditor: (messagesJson: string, suggestedName?: string) => void;
}

function getInitialWsUrl(): string {
  if (typeof window === "undefined") return DEFAULT_CODEX_WS_URL;
  return window.localStorage.getItem(STORAGE_KEY_WS_URL) || DEFAULT_CODEX_WS_URL;
}

export function A2UIChatPanel({
  activeVersionName,
  currentMessagesJson,
  nextVersionNumber,
  saving,
  previewDraft,
  compareMode,
  appliedMessageIds,
  onPreviewA2UI,
  onChangeCompareMode,
  onDiscardPreview,
  onApplyA2UI,
  onOpenInEditor,
}: A2UIChatPanelProps) {
  const [wsUrlInput, setWsUrlInput] = useState(getInitialWsUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const autoPreviewedIdsRef = useRef(new Set<string>());

  const latestContextRef = useRef({ activeVersionName, currentMessagesJson });
  latestContextRef.current = { activeVersionName, currentMessagesJson };

  const client = useMemo(() => new CodexAppServerClient(getInitialWsUrl()), []);
  const [codexStatus, setCodexStatus] = useState<CodexClientStatus>(() => client.getStatus());

  useEffect(() => {
    const unsubscribe = client.subscribeStatus(setCodexStatus);
    void client.connect().catch(() => {
      // Connection bar guides the user to start the local server
    });
    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  const transport = useMemo(
    () =>
      new CodexChatTransport({
        client,
        getDeveloperInstructions: buildA2UIDeveloperInstructions,
        formatUserPrompt: (userText) =>
          buildUserTurnPrompt({
            userText,
            activeVersionName: latestContextRef.current.activeVersionName,
            currentMessagesJson: latestContextRef.current.currentMessagesJson,
          }),
        effort: "low",
      }),
    [client],
  );

  const { messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({
    transport,
  });

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom();
  const isStreaming = status === "submitted" || status === "streaming";

  const onPreviewRef = useRef(onPreviewA2UI);
  onPreviewRef.current = onPreviewA2UI;

  useEffect(() => {
    if (isStreaming || messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    if (autoPreviewedIdsRef.current.has(lastMsg.id)) return;

    const extracted = extractA2UIFromText(getMessageText(lastMsg));
    if (!extracted?.messages) return;

    const userPrompt = getPrecedingUserText(messages, lastIndex);
    autoPreviewedIdsRef.current.add(lastMsg.id);
    onPreviewRef.current({
      messageId: lastMsg.id,
      name: summarizePromptForVersionName(userPrompt, nextVersionNumber),
      description: userPrompt.slice(0, 200),
      messagesJson: extracted.rawJson,
      messages: extracted.messages,
    });
  }, [isStreaming, messages, nextVersionNumber]);

  const handleConnect = async () => {
    const nextUrl = wsUrlInput.trim() || DEFAULT_CODEX_WS_URL;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY_WS_URL, nextUrl);
    }
    client.setUrl(nextUrl);
    clearError();
    try {
      await client.connect();
      setShowSettings(false);
    } catch {
      // Status state already reflects the error
    }
  };

  const handleResetChat = () => {
    if (isStreaming) {
      void stop();
    }
    client.resetThread();
    setMessages([]);
    autoPreviewedIdsRef.current.clear();
    clearError();
  };

  const handleSendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    clearError();
    await sendMessage({ text: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSendText(input);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CodexConnectionBar
        status={codexStatus}
        wsUrlInput={wsUrlInput}
        showSettings={showSettings}
        hasMessages={messages.length > 0}
        onWsUrlChange={setWsUrlInput}
        onToggleSettings={() => setShowSettings((prev) => !prev)}
        onConnect={() => void handleConnect()}
        onResetChat={handleResetChat}
      />

      {/* Conversation */}
      <div className="relative min-h-0 flex-1">
        <ScrollArea className="h-full" viewportRef={scrollRef}>
          <div ref={contentRef} className="space-y-3 px-4 py-3">
            {messages.length === 0 ? (
              <div className="space-y-1.5 py-2">
                <div className="text-muted-foreground text-[11px] font-medium">プロンプト例</div>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isStreaming}
                      onClick={() => void handleSendText(prompt)}
                      className="bg-background hover:bg-accent/60 w-full cursor-pointer rounded-md border px-2.5 py-2 text-left text-xs leading-snug transition-colors disabled:opacity-50"
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
                  precedingUserText={getPrecedingUserText(messages, index)}
                  nextVersionNumber={nextVersionNumber}
                  isStreamingThis={
                    message.role === "assistant" && index === messages.length - 1 && isStreaming
                  }
                  isActivePreview={previewDraft?.messageId === message.id}
                  isApplied={Boolean(appliedMessageIds[message.id])}
                  onPreview={onPreviewA2UI}
                  onOpenInEditor={onOpenInEditor}
                />
              ))
            )}

            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                応答中...
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border border-destructive/20 p-2.5 text-xs">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
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

      {previewDraft && (
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
        className="shrink-0 border-t p-3"
      >
        <div className="bg-background focus-within:ring-ring relative rounded-lg border focus-within:ring-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="UI の変更したい内容を入力..."
            rows={2}
            className="min-h-[60px] resize-none border-0 pr-11 text-xs shadow-none focus-visible:ring-0"
          />
          <div className="absolute right-2 bottom-2">
            {isStreaming ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-7 rounded-md"
                aria-label="停止"
                onClick={() => void stop()}
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
