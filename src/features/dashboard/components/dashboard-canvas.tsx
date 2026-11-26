import type { ReactNode } from "react";
import { Eye, RotateCcw, Settings2, SlidersHorizontal } from "lucide-react";
import type { UiVersion } from "@schema";
import { A2UISurface } from "@/features/a2ui/components/a2ui-surface";
import type { A2UISurfaceEditorProps } from "@/features/a2ui/components/render-context";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction, A2UIMessage } from "@/features/a2ui/types";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CustomizePanelTab,
  DashboardBuilderActions,
  DashboardBuilderState,
  DashboardFeedback,
} from "../hooks/use-dashboard-controller";
import { AddBlockButton, CanvasModeControl, UndoRedoButtons } from "./builder-controls";

interface DashboardCanvasProps {
  activeVersion: UiVersion | undefined;
  messages: A2UIMessage[];
  dataModel: DataModel;
  pending: boolean;
  feedback: DashboardFeedback | null;
  previewDraft: AiPreviewDraft | null;
  compareMode: CompareMode;
  isCustomizeOpen: boolean;
  customizeTab: CustomizePanelTab;
  builder: DashboardBuilderState & DashboardBuilderActions;
  onOpenCustomize: (tab?: CustomizePanelTab) => void;
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
  customizeTab,
  builder,
  onOpenCustomize,
  onDataModelChange,
  onAction,
}: DashboardCanvasProps) {
  const isBuilderSessionActive =
    !previewDraft && isCustomizeOpen && (customizeTab === "builder" || customizeTab === "json");
  const isSplitWide =
    (previewDraft && compareMode === "split") ||
    (isBuilderSessionActive && builder.canvasMode === "split");
  const canvasWidth = isSplitWide ? "max-w-7xl" : "max-w-6xl";

  const editorProps: A2UISurfaceEditorProps | undefined =
    isBuilderSessionActive && builder.canvasMode === "edit"
      ? {
          selectedId: builder.selectedId,
          onSelect: builder.setSelectedId,
          onMove: builder.moveNode,
          onMoveRelative: builder.moveNodeRelative,
          onDuplicate: builder.duplicateNode,
          onDelete: builder.deleteNode,
          onRequestAdd: (parentId) => builder.openPalette(parentId),
        }
      : undefined;

  const renderSurface = (surfaceMessages: A2UIMessage[], editor?: A2UISurfaceEditorProps) => (
    <A2UISurface
      messages={surfaceMessages}
      dataModel={dataModel}
      onDataModelChange={onDataModelChange}
      onAction={onAction}
      pending={pending}
      editor={editor}
    />
  );

  return (
    <div className="w-full space-y-4 py-6">
      {/* Top Page Header */}
      <div
        className={cn(
          "mx-auto",
          canvasWidth,
          isBuilderSessionActive && [
            "md:bg-background/95 md:sticky md:top-14 md:z-20 md:py-1 md:backdrop-blur",
            "md:after:pointer-events-none md:after:absolute md:after:inset-x-0 md:after:top-full md:after:h-5 md:after:bg-linear-to-b md:after:from-background/95 md:after:to-transparent",
          ],
        )}
      >
        <div className="mx-auto flex min-h-8 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
            {previewDraft && (
              <Badge variant="default" className="gap-1">
                <Eye className="size-3" />
                プレビュー中
              </Badge>
            )}
          </div>

          {isBuilderSessionActive && (
            <div className="ml-auto hidden max-w-full flex-wrap items-center justify-end gap-2 md:flex">
              <div className="flex shrink-0 items-center gap-0.5">
                <UndoRedoButtons builder={builder} />
              </div>
              {customizeTab === "builder" && (
                <AddBlockButton onClick={() => builder.openPalette()} />
              )}
              <CanvasModeControl
                value={builder.canvasMode}
                onChange={builder.setCanvasMode}
                className="w-auto max-w-full border shadow-sm"
              />
            </div>
          )}

          {!isCustomizeOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => onOpenCustomize("builder")}
            >
              <Settings2 className="size-3.5" />
              <span>カスタマイズ</span>
            </Button>
          )}
        </div>
      </div>

      <div className={cn("mx-auto space-y-4 px-4 sm:px-6", canvasWidth)}>
        {/* Unsaved draft reminder when Customize panel is closed or on History tab */}
        {!previewDraft && !isBuilderSessionActive && builder.isDirty && (
          <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs">
            <span className="font-medium">未保存のカスタマイズがあります</span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={builder.resetDraft}
              >
                <RotateCcw className="size-3.5" />
                破棄
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={() => onOpenCustomize("builder")}
              >
                <SlidersHorizontal className="size-3.5" />
                編集を再開
              </Button>
            </div>
          </div>
        )}

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

        {/* Canvas Body */}
        {previewDraft && compareMode === "split" ? (
          <CanvasComparison
            beforeLabel={`現在のUI（${activeVersion?.name ?? "現在"}）`}
            before={renderSurface(messages)}
            afterLabel={`新しいUI（${previewDraft.name}）`}
            after={renderSurface(previewDraft.messages)}
            previewId={previewDraft.draftId}
          />
        ) : previewDraft && compareMode === "preview" ? (
          <div
            key={previewDraft.draftId}
            className="border-primary/35 ring-primary/10 rounded-xl border p-4 ring-2 motion-safe:animate-dashboard-preview-in"
          >
            {renderSurface(previewDraft.messages)}
          </div>
        ) : isBuilderSessionActive && builder.canvasMode === "split" ? (
          <CanvasComparison
            beforeLabel="保存済みのUI"
            before={renderSurface(messages)}
            afterLabel="編集中のUI"
            after={renderSurface(builder.messages)}
          />
        ) : isBuilderSessionActive ? (
          <div
            className={cn(
              builder.canvasMode === "edit" &&
                "border-primary/25 bg-background/50 isolate rounded-2xl border border-dashed p-3 pt-5 sm:p-4 sm:pt-6",
            )}
          >
            {renderSurface(builder.messages, editorProps)}
          </div>
        ) : (
          renderSurface(messages)
        )}
      </div>
    </div>
  );
}

function CanvasComparison({
  beforeLabel,
  before,
  afterLabel,
  after,
  previewId,
}: {
  beforeLabel: string;
  before: ReactNode;
  afterLabel: string;
  after: ReactNode;
  previewId?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="space-y-2.5 rounded-xl border p-4">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-muted-foreground text-xs font-semibold">{beforeLabel}</span>
          <Badge variant="outline" className="text-[10px]">
            Before
          </Badge>
        </div>
        {before}
      </div>
      <div
        key={previewId}
        className={cn(
          "border-primary/40 ring-primary/15 space-y-2.5 rounded-xl border p-4 ring-2",
          previewId !== undefined && "motion-safe:animate-dashboard-preview-in",
        )}
      >
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-primary text-xs font-semibold">{afterLabel}</span>
          <Badge variant="default" className="text-[10px]">
            After
          </Badge>
        </div>
        {after}
      </div>
    </div>
  );
}
