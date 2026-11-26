import { Eye } from "lucide-react";
import type { UiVersion } from "@schema";
import { A2UISurface } from "@/features/a2ui/components/a2ui-surface";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction, A2UIMessage } from "@/features/a2ui/types";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import { Badge } from "@/components/ui/badge";
import { SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface DashboardCanvasProps {
  activeVersion: UiVersion | undefined;
  messages: A2UIMessage[];
  dataModel: DataModel;
  pending: boolean;
  feedback: { type: "error" | "success"; message: string } | null;
  previewDraft: AiPreviewDraft | null;
  compareMode: CompareMode;
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
  onDataModelChange,
  onAction,
}: DashboardCanvasProps) {
  return (
    <SidebarInset className="min-w-0 bg-transparent">
      <div
        className={cn(
          "mx-auto w-full space-y-4 px-4 py-6 sm:px-6",
          previewDraft && compareMode === "split" ? "max-w-7xl" : "max-w-6xl",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
            {activeVersion && <Badge variant="outline">v{activeVersion.version}</Badge>}
            {previewDraft && (
              <Badge variant="default" className="gap-1">
                <Eye className="size-3" />
                プレビュー中
              </Badge>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={
              feedback.type === "error"
                ? "bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs font-medium"
                : "bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-xs font-medium"
            }
          >
            {feedback.message}
          </div>
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
              <A2UISurface
                messages={messages}
                dataModel={dataModel}
                onDataModelChange={onDataModelChange}
                onAction={onAction}
                pending={pending}
              />
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
              <A2UISurface
                messages={previewDraft.messages}
                dataModel={dataModel}
                onDataModelChange={onDataModelChange}
                onAction={onAction}
                pending={pending}
              />
            </div>
          </div>
        ) : previewDraft && compareMode === "preview" ? (
          <div
            key={previewDraft.draftId}
            className="border-primary/35 ring-primary/10 rounded-xl border p-4 ring-2 motion-safe:animate-dashboard-preview-in"
          >
            <A2UISurface
              messages={previewDraft.messages}
              dataModel={dataModel}
              onDataModelChange={onDataModelChange}
              onAction={onAction}
              pending={pending}
            />
          </div>
        ) : (
          <A2UISurface
            messages={messages}
            dataModel={dataModel}
            onDataModelChange={onDataModelChange}
            onAction={onAction}
            pending={pending}
          />
        )}
      </div>
    </SidebarInset>
  );
}
