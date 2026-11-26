import { useState } from "react";
import type { UIMessage } from "ai";
import { AlertCircle, Check, ChevronDown, ChevronRight, Eye, Loader2 } from "lucide-react";
import { extractDashboardDraft } from "@/features/a2ui/draft";
import { MCP_TOOL_LABELS } from "@/features/mcp/tool-metadata";
import type { AiPreviewDraft } from "../types";

export type DynamicToolPart = Extract<UIMessage["parts"][number], { type: "dynamic-tool" }>;

interface ToolCallRowProps {
  part: DynamicToolPart;
  activePreviewDraftId: string | null;
  appliedDraftIds: Record<string, boolean>;
  onPreview: (draft: AiPreviewDraft) => void;
}

export function ToolCallRow({
  part,
  activePreviewDraftId,
  appliedDraftIds,
  onPreview,
}: ToolCallRowProps) {
  const [open, setOpen] = useState(false);
  const label = MCP_TOOL_LABELS[part.toolName] ?? part.toolName;
  const isRunning = part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "output-error" || part.state === "output-denied";

  const dashboardDraft =
    part.toolName === "propose_dashboard_ui" && part.state === "output-available"
      ? extractDashboardDraft(part.toolCallId, part.output)
      : null;

  const isApplied = dashboardDraft ? Boolean(appliedDraftIds[dashboardDraft.draftId]) : false;
  const isActivePreview = dashboardDraft ? activePreviewDraftId === dashboardDraft.draftId : false;

  return (
    <div className="space-y-1">
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

      {dashboardDraft && (
        <div className="flex min-h-6 items-center px-1 text-xs">
          {isApplied || isActivePreview ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              {isApplied ? <Check className="size-3.5" /> : <Eye className="size-3.5" />}
              {isApplied ? "適用済み" : "プレビュー中"}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onPreview(dashboardDraft)}
              className="text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-1.5 underline underline-offset-2"
            >
              <Eye className="size-3.5" />
              プレビューを開く（{dashboardDraft.name}）
            </button>
          )}
        </div>
      )}
    </div>
  );
}
