import { useState } from "react";
import type { UIMessage } from "ai";
import { AlertCircle, Check, ChevronDown, ChevronRight, Eye, Loader2 } from "lucide-react";
import { extractA2UIFromText, stripA2UIJsonBlocks } from "@/a2ui/prompt";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./markdown-content";
import {
  getMessageReasoning,
  getMessageText,
  summarizePromptForVersionName,
  type AiPreviewDraft,
} from "./types";

const TOOL_LABELS: Record<string, string> = {
  list_expenses: "支出を検索",
  get_spending_summary: "支出を集計・分析",
  create_expenses: "支出を登録",
  update_expense: "支出を更新",
  delete_expenses: "支出を削除",
  list_ui_versions: "UI履歴を取得",
  activate_ui_version: "UIバージョンを切替",
  save_ui_version: "UIバージョンを保存",
};

type DynamicToolPart = Extract<UIMessage["parts"][number], { type: "dynamic-tool" }>;

function ToolCallRow({ part }: { part: DynamicToolPart }) {
  const [open, setOpen] = useState(false);
  const label = TOOL_LABELS[part.toolName] ?? part.toolName;
  const isRunning = part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "output-error" || part.state === "output-denied";

  return (
    <div className="bg-muted/60 w-full rounded-md px-3 py-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          {isRunning ? (
            <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />
          ) : isError ? (
            <AlertCircle className="text-destructive size-3.5 shrink-0" />
          ) : (
            <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="truncate">{label}</span>
        </span>
        <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px]">
          {isRunning ? "実行中..." : isError ? "エラー" : "完了"}
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>
      </button>

      {open && (
        <div className="text-muted-foreground mt-2 space-y-2 font-mono text-[11px] leading-relaxed">
          {part.input !== undefined && (
            <div>
              <div className="font-sans text-xs font-medium">入力</div>
              <pre className="bg-background/80 mt-1 max-h-36 overflow-auto rounded p-2 whitespace-pre-wrap">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {part.state === "output-available" && (
            <div>
              <div className="font-sans text-xs font-medium">結果</div>
              <pre className="bg-background/80 mt-1 max-h-44 overflow-auto rounded p-2 whitespace-pre-wrap">
                {typeof part.output === "string"
                  ? part.output
                  : JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
          {part.state === "output-error" && (
            <div className="text-destructive font-sans text-xs">{part.errorText}</div>
          )}
        </div>
      )}
    </div>
  );
}

interface ChatMessageItemProps {
  message: UIMessage;
  precedingUserText: string;
  nextVersionNumber: number;
  isStreamingThis: boolean;
  isActivePreview: boolean;
  isApplied: boolean;
  onPreview: (draft: AiPreviewDraft) => void;
  onOpenInEditor: (messagesJson: string, suggestedName?: string) => void;
}

export function ChatMessageItem({
  message,
  precedingUserText,
  nextVersionNumber,
  isStreamingThis,
  isActivePreview,
  isApplied,
  onPreview,
  onOpenInEditor,
}: ChatMessageItemProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const isUser = message.role === "user";
  const textContent = getMessageText(message);
  const reasoningContent = isUser ? "" : getMessageReasoning(message);
  const toolParts = isUser
    ? []
    : message.parts.filter((part): part is DynamicToolPart => part.type === "dynamic-tool");

  const extracted = !isUser && !isStreamingThis ? extractA2UIFromText(textContent) : null;
  const displayText = extracted ? stripA2UIJsonBlocks(textContent) : textContent;

  return (
    <div
      className={cn("shadcn-scrollbar flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      {!isUser && reasoningContent && (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setReasoningOpen((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs"
          >
            {reasoningOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            思考プロセス
          </button>
          {reasoningOpen && (
            <div className="bg-muted/40 text-muted-foreground mt-1.5 rounded-md border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">
              {reasoningContent}
            </div>
          )}
        </div>
      )}

      {!isUser && toolParts.length > 0 && (
        <div className="w-full space-y-1.5">
          {toolParts.map((part) => (
            <ToolCallRow key={part.toolCallId} part={part} />
          ))}
        </div>
      )}

      <div
        className={cn(
          "text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground max-w-[90%] rounded-lg px-3.5 py-2 whitespace-pre-wrap"
            : "text-foreground min-w-0 w-full py-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        )}
      >
        {isUser ? (
          displayText
        ) : !displayText && isStreamingThis ? (
          toolParts.length === 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" />
              応答中...
            </span>
          ) : null
        ) : (
          <MarkdownContent
            content={displayText || (extracted ? "新しい UI を生成しました。" : "")}
            isAnimating={isStreamingThis}
          />
        )}
      </div>

      {extracted && (
        <>
          {extracted.messages ? (
            isApplied ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 pt-0.5 text-xs">
                <Check className="size-3.5" />
                適用済み
              </span>
            ) : !isActivePreview ? (
              <button
                type="button"
                onClick={() =>
                  onPreview({
                    messageId: message.id,
                    name: summarizePromptForVersionName(precedingUserText, nextVersionNumber),
                    description: precedingUserText.slice(0, 200),
                    messagesJson: extracted.rawJson,
                    messages: extracted.messages!,
                  })
                }
                className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 pt-0.5 text-xs underline underline-offset-2"
              >
                <Eye className="size-3.5" />
                プレビュー
              </button>
            ) : null
          ) : (
            <div className="text-destructive flex items-center gap-2 pt-0.5 text-xs">
              <span>{extracted.error}</span>
              <button
                type="button"
                onClick={() =>
                  onOpenInEditor(
                    extracted.rawJson,
                    summarizePromptForVersionName(precedingUserText, nextVersionNumber),
                  )
                }
                className="cursor-pointer underline underline-offset-2"
              >
                JSON編集
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
