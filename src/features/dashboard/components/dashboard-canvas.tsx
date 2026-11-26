import { Eye, Plus, RotateCcw, Save, Settings2, SlidersHorizontal } from "lucide-react";
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
import { BuilderSegmentedControl } from "./ui-sdk-controls";

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
    <div
      className={cn(
        "mx-auto w-full space-y-4 px-4 py-6 sm:px-6",
        isSplitWide ? "max-w-7xl" : "max-w-6xl",
      )}
    >
      {/* Top Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
          {activeVersion && !previewDraft && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {activeVersion.name}
            </Badge>
          )}
          {previewDraft && (
            <Badge variant="default" className="gap-1">
              <Eye className="size-3" />
              AI プレビュー中
            </Badge>
          )}
          {isBuilderSessionActive && (
            <Badge variant="default" className="gap-1">
              <SlidersHorizontal className="size-3" />
              ビジュアル編集中
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isBuilderSessionActive ? (
            <>
              <div className="hidden w-56 sm:block">
                <BuilderSegmentedControl
                  size="xs"
                  value={builder.canvasMode}
                  ariaLabel="キャンバス表示切替"
                  options={[
                    { value: "edit", label: "選択・並び替え" },
                    { value: "preview", label: "操作テスト" },
                    { value: "split", label: "前後比較" },
                  ]}
                  onChange={builder.setCanvasMode}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => builder.openPalette()}
              >
                <Plus className="size-3.5" />
                <span>パーツ追加</span>
              </Button>
              {builder.isDirty && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={pending || Boolean(builder.jsonError)}
                  onClick={() => builder.setSaveDialogOpen(true)}
                >
                  <Save className="size-3.5" />
                  <span>保存</span>
                </Button>
              )}
            </>
          ) : (
            !isCustomizeOpen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => onOpenCustomize("builder")}
              >
                <Settings2 className="size-3.5" />
                <span>画面をカスタマイズ</span>
                {activeVersion && <Badge variant="secondary">v{activeVersion.version}</Badge>}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Unsaved draft reminder when Customize panel is closed or on History tab */}
      {!previewDraft && !isBuilderSessionActive && builder.isDirty && (
        <div className="bg-primary/5 border-primary/25 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs">
          <span className="font-medium">
            未保存のカスタマイズ下書きがあります（現在は保存済みの「{activeVersion?.name ?? "現在"}
            」を表示中）
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={builder.resetDraft}
            >
              <RotateCcw className="size-3" />
              破棄
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => onOpenCustomize("builder")}
            >
              <SlidersHorizontal className="size-3" />
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
      ) : isBuilderSessionActive && builder.canvasMode === "split" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-2.5 rounded-xl border p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground text-xs font-semibold">
                保存済みのUI（{activeVersion?.name ?? "現在"}）
              </span>
              <Badge variant="outline" className="text-[10px]">
                Before
              </Badge>
            </div>
            {renderSurface(messages)}
          </div>

          <div className="border-primary/40 ring-primary/15 space-y-2.5 rounded-xl border p-4 ring-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-primary text-xs font-semibold">カスタマイズ中のUI</span>
              <Badge variant="default" className="text-[10px]">
                After
              </Badge>
            </div>
            {renderSurface(builder.messages)}
          </div>
        </div>
      ) : isBuilderSessionActive ? (
        <div
          className={cn(
            builder.canvasMode === "edit" &&
              "border-primary/25 bg-background/50 rounded-2xl border border-dashed p-3 pt-5 sm:p-4 sm:pt-5",
          )}
        >
          {renderSurface(builder.messages, editorProps)}
        </div>
      ) : (
        renderSurface(messages)
      )}
    </div>
  );
}
