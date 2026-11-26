import type { ReactNode } from "react";
import { Bot, RotateCcw, Settings2, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { A2UISurface } from "@/features/a2ui/components/a2ui-surface";
import type { A2UISurfaceEditorProps } from "@/features/a2ui/components/render-context";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction, A2UIMessage } from "@/features/a2ui/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CustomizePanelTab,
  BuilderCanvasMode,
  DashboardBuilderActions,
  DashboardBuilderState,
  DashboardFeedback,
} from "../hooks/use-dashboard-controller";
import type { DashboardProposal } from "../lib/ai-proposal";
import {
  AddBlockButton,
  CanvasModeControl,
  SaveVersionButton,
  UndoRedoButtons,
} from "./builder-controls";

interface DashboardCanvasProps {
  messages: A2UIMessage[];
  dataModel: DataModel;
  pending: boolean;
  feedback: DashboardFeedback | null;
  proposal: DashboardProposal | null;
  isEditing: boolean;
  isAssistantOpen: boolean;
  builder: DashboardBuilderState & DashboardBuilderActions;
  onChangeProposalMode: (mode: BuilderCanvasMode) => void;
  onCompareProposal: () => void;
  onAdoptProposal: () => void;
  onDiscardProposal: () => void;
  onAskAssistant: () => void;
  onFinishEditing: () => void;
  onOpenCustomize: (tab?: CustomizePanelTab) => void;
  onDataModelChange: (next: DataModel) => void;
  onAction: (action: A2UIAction) => void;
}

export function DashboardCanvas({
  messages,
  dataModel,
  pending,
  feedback,
  proposal,
  isEditing,
  isAssistantOpen,
  builder,
  onChangeProposalMode,
  onCompareProposal,
  onAdoptProposal,
  onDiscardProposal,
  onAskAssistant,
  onFinishEditing,
  onOpenCustomize,
  onDataModelChange,
  onAction,
}: DashboardCanvasProps) {
  const previewDraft = proposal?.draft ?? null;
  const compareMode = proposal?.mode ?? null;
  const isReviewingProposal = previewDraft !== null && compareMode !== null;
  const isComparing = isReviewingProposal
    ? compareMode === "split"
    : isEditing && builder.canvasMode === "split";
  const canvasWidth = isComparing ? "max-w-7xl" : "max-w-6xl";

  const editorProps: A2UISurfaceEditorProps | undefined =
    isEditing && !isReviewingProposal && builder.canvasMode === "edit"
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
          (isEditing || isReviewingProposal) && [
            "md:bg-background/95 md:sticky md:top-14 md:z-20 md:py-1 md:backdrop-blur",
            "md:after:pointer-events-none md:after:absolute md:after:inset-x-0 md:after:top-full md:after:h-5 md:after:bg-linear-to-b md:after:from-background/95 md:after:to-transparent",
          ],
        )}
      >
        <div className="@container mx-auto max-w-6xl px-4 sm:px-6">
          {isEditing || isReviewingProposal ? (
            <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 @min-[42rem]:grid-cols-[minmax(0,1fr)_auto_auto]">
              <h1 className="sr-only">ダッシュボード</h1>
              <div
                role="group"
                aria-label={isReviewingProposal ? "提案" : "編集操作"}
                className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-center gap-1.5"
              >
                {isReviewingProposal ? (
                  <Badge variant="secondary" className="gap-1" title={previewDraft.name}>
                    <Sparkles className="size-3" />
                    AIの提案
                  </Badge>
                ) : (
                  <>
                    <div className="flex shrink-0 items-center">
                      <UndoRedoButtons builder={builder} />
                    </div>
                    <AddBlockButton compact onClick={() => builder.openPalette()} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={isAssistantOpen ? () => onOpenCustomize("builder") : onAskAssistant}
                    >
                      {isAssistantOpen ? (
                        <>
                          <Settings2 className="size-4" />
                          カスタマイズパネル
                        </>
                      ) : (
                        <>
                          <Bot className="size-4" />
                          AIに頼む
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              <CanvasModeControl
                value={isReviewingProposal ? compareMode : builder.canvasMode}
                onChange={isReviewingProposal ? onChangeProposalMode : builder.setCanvasMode}
                className="col-span-2 col-start-1 row-start-2 w-auto max-w-full justify-self-center border shadow-sm @min-[42rem]:col-span-1 @min-[42rem]:col-start-2 @min-[42rem]:row-start-1"
              />

              <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 @min-[42rem]:col-start-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title={isReviewingProposal ? "提案を閉じる" : "編集を終了"}
                  aria-label={isReviewingProposal ? "提案を閉じる" : "編集を終了"}
                  onClick={isReviewingProposal ? onDiscardProposal : onFinishEditing}
                >
                  <X className="size-4" />
                </Button>
                {isReviewingProposal ? (
                  <Button type="button" size="sm" onClick={onAdoptProposal}>
                    下書きに取り込む
                  </Button>
                ) : (
                  <SaveVersionButton
                    disabled={!builder.canSave}
                    onClick={() => builder.setSaveDialogOpen(true)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-8 items-center justify-between gap-3">
              <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenCustomize("builder")}
              >
                <Settings2 className="size-3.5" />
                カスタマイズ
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={cn("mx-auto space-y-4 px-4 sm:px-6", canvasWidth)}>
        {previewDraft && !isReviewingProposal && (
          <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Sparkles className="size-4 shrink-0" />
              <span className="truncate">AIの提案：{previewDraft.name}</span>
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="outline" onClick={onCompareProposal}>
                下書きと比較
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="提案を閉じる"
                onClick={onDiscardProposal}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
        {!isEditing && !isReviewingProposal && builder.isDirty && (
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
        {isComparing ? (
          <CanvasComparison
            beforeLabel={isReviewingProposal ? "現在の下書き" : "保存済みのUI"}
            before={renderSurface(isReviewingProposal ? builder.messages : messages)}
            afterLabel={isReviewingProposal ? previewDraft.name : "編集中のUI"}
            after={renderSurface(isReviewingProposal ? previewDraft.messages : builder.messages)}
            previewId={isReviewingProposal ? previewDraft.draftId : undefined}
          />
        ) : isReviewingProposal ? (
          <div
            key={previewDraft.draftId}
            className="border-primary/35 ring-primary/10 rounded-xl border p-4 ring-2 motion-safe:animate-dashboard-preview-in"
          >
            {renderSurface(previewDraft.messages)}
          </div>
        ) : isEditing ? (
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
