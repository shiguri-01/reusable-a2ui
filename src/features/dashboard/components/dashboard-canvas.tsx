import { Eye, Settings2 } from "lucide-react";
import type { UiVersion } from "@schema";
import { A2UISurface } from "@/features/a2ui/components/a2ui-surface";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction, A2UIMessage } from "@/features/a2ui/types";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardFeedback } from "../hooks/use-dashboard-controller";

interface DashboardCanvasProps {
  activeVersion: UiVersion | undefined;
  messages: A2UIMessage[];
  dataModel: DataModel;
  pending: boolean;
  feedback: DashboardFeedback | null;
  previewDraft: AiPreviewDraft | null;
  compareMode: CompareMode;
  isCustomizeOpen: boolean;
  onOpenCustomize: () => void;
  onDataModelChange: (next: DataModel) => void;
  onAction: (action: A2UIAction) => void;
}

export function DashboardCanvas({
  activeVersion,
  messages,
  dataModel,
  pending,
  feedback,
  previewDraft,
  compareMode,
  isCustomizeOpen,
  onOpenCustomize,
  onDataModelChange,
  onAction,
}: DashboardCanvasProps) {
  const renderSurface = (surfaceMessages: A2UIMessage[]) => (
    <A2UISurface
      messages={surfaceMessages}
      dataModel={dataModel}
      onDataModelChange={onDataModelChange}
      onAction={onAction}
      pending={pending}
    />
  );

  return (
    <div
      className={cn(
        "mx-auto w-full space-y-4 px-4 py-6 sm:px-6",
        previewDraft && compareMode === "split" ? "max-w-7xl" : "max-w-6xl",
      )}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
          {previewDraft && (
            <Badge variant="default" className="gap-1">
              <Eye className="size-3" />
              プレビュー中
            </Badge>
          )}
        </div>

        {!isCustomizeOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={onOpenCustomize}
          >
            <Settings2 className="size-3.5" />
            <span>カスタマイズ</span>
            {activeVersion && <Badge variant="secondary">v{activeVersion.version}</Badge>}
          </Button>
        )}
      </div>

      {feedback && (
        <Alert
          variant={feedback.type === "error" ? "destructive" : "default"}
          role={feedback.type === "error" ? "alert" : "status"}
          className={
            feedback.type === "error"
              ? "bg-destructive/10 border-destructive/20 px-3 py-2 text-xs font-medium"
              : "bg-secondary text-secondary-foreground border-transparent px-3 py-2 text-xs font-medium"
          }
        >
          <AlertDescription
            className={
              feedback.type === "error"
                ? "text-xs font-medium"
                : "text-secondary-foreground text-xs font-medium"
            }
          >
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {previewDraft && compareMode === "split" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-2.5 rounded-xl border p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground text-xs font-semibold">
                現在のUI（{activeVersion?.name ?? "現在"}）
              </span>
              <Badge variant="outline" className="text-[10px]">
                Before
              </Badge>
            </div>
            {renderSurface(messages)}
          </div>

          <div
            key={previewDraft.draftId}
            className="border-primary/40 ring-primary/15 space-y-2.5 rounded-xl border p-4 ring-2 motion-safe:animate-dashboard-preview-in"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-primary text-xs font-semibold">
                新しいUI（{previewDraft.name}）
              </span>
              <Badge variant="default" className="text-[10px]">
                After
              </Badge>
            </div>
            {renderSurface(previewDraft.messages)}
          </div>
        </div>
      ) : previewDraft && compareMode === "preview" ? (
        <div
          key={previewDraft.draftId}
          className="border-primary/35 ring-primary/10 rounded-xl border p-4 ring-2 motion-safe:animate-dashboard-preview-in"
        >
          {renderSurface(previewDraft.messages)}
        </div>
      ) : (
        renderSurface(messages)
      )}
    </div>
  );
}
