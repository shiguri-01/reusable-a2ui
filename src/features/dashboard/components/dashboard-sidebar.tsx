import { Code2, History, Plus, Sparkles, X } from "lucide-react";
import type { UiVersion } from "@schema";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import { A2UIChatPanel } from "@/features/ai-chat/components/a2ui-chat-panel";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from "../constants";
import { JsonEditorPanel } from "./json-editor-panel";
import { VersionHistoryPanel } from "./version-history-panel";

export type DashboardSidebarTab = "ai" | "history" | "editor";

function MobileSidebarCloseButton() {
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 md:hidden"
      aria-label="サイドバーを閉じる"
      onClick={() => setOpenMobile(false)}
    >
      <X className="size-4" />
    </Button>
  );
}

function SidebarResizeHandle() {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const wrapper = e.currentTarget.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (!wrapper) return;

    const startX = e.clientX;
    const currentWidth =
      parseFloat(getComputedStyle(wrapper).getPropertyValue("--sidebar-width")) ||
      DEFAULT_SIDEBAR_WIDTH;
    let latestWidth = currentWidth;

    wrapper.setAttribute("data-resizing", "true");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: PointerEvent) => {
      const delta = startX - ev.clientX;
      latestWidth = Math.round(
        Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, currentWidth + delta)),
      );
      wrapper.style.setProperty("--sidebar-width", `${latestWidth}px`);
    };

    const handleUp = () => {
      wrapper.removeAttribute("data-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(latestWidth));
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = e.currentTarget.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (!wrapper) return;
    wrapper.style.setProperty("--sidebar-width", `${DEFAULT_SIDEBAR_WIDTH}px`);
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(DEFAULT_SIDEBAR_WIDTH));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="サイドバーの幅を調整（ダブルクリックでリセット）"
      title="ドラッグして幅を調整（ダブルクリックで初期幅に戻す）"
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className="hover:after:bg-primary/40 active:after:bg-primary/60 absolute inset-y-0 -left-1.5 z-20 hidden w-3 cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors md:block"
    />
  );
}

interface DashboardSidebarProps {
  panelTab: DashboardSidebarTab;
  uiVersions: UiVersion[];
  activeVersion: UiVersion | undefined;
  dataModel: DataModel;
  pending: boolean;
  previewDraft: AiPreviewDraft | null;
  compareMode: CompareMode;
  appliedDraftIds: Record<string, boolean>;
  versionName: string;
  versionDesc: string;
  editorJson: string;
  editorError: string | null;
  onSelectTab: (tab: DashboardSidebarTab) => void;
  onSwitchToEditor: () => void;
  onActivateVersion: (versionId: number) => void;
  onVersionNameChange: (value: string) => void;
  onVersionDescChange: (value: string) => void;
  onEditorJsonChange: (value: string) => void;
  onSaveNewVersion: () => void;
  onDataMutated: () => void;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message?: string }>;
  onPreviewA2UI: (draft: AiPreviewDraft) => void;
  onChangeCompareMode: (mode: CompareMode) => void;
  onDiscardPreview: () => void;
  onApplyA2UI: (draft: AiPreviewDraft) => Promise<void>;
  onOpenInEditor: (messagesJson: string, suggestedName?: string) => void;
}

export function DashboardSidebar({
  panelTab,
  uiVersions,
  activeVersion,
  dataModel,
  pending,
  previewDraft,
  compareMode,
  appliedDraftIds,
  versionName,
  versionDesc,
  editorJson,
  editorError,
  onSelectTab,
  onSwitchToEditor,
  onActivateVersion,
  onVersionNameChange,
  onVersionDescChange,
  onEditorJsonChange,
  onSaveNewVersion,
  onDataMutated,
  onExpenseAction,
  onPreviewA2UI,
  onChangeCompareMode,
  onDiscardPreview,
  onApplyA2UI,
  onOpenInEditor,
}: DashboardSidebarProps) {
  return (
    <Sidebar side="right" collapsible="offcanvas" className="top-14 h-[calc(100svh-3.5rem)]">
      {/* Sidebar Header */}
      <SidebarHeader className="gap-0 p-0">
        <div className="flex h-12 shrink-0 items-center justify-between border-b pr-2 pl-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            <span className="text-sm font-semibold">AI アシスタント</span>
          </div>
          <MobileSidebarCloseButton />
        </div>

        {/* Sidebar Tabs */}
        <div className="shrink-0 px-4 pt-3 pb-1">
          <div className="bg-muted grid grid-cols-3 rounded-lg p-1">
            <button
              type="button"
              onClick={() => onSelectTab("ai")}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                panelTab === "ai"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-3.5" />
              AI
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("history")}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                panelTab === "history"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <History className="size-3.5" />
              履歴 ({uiVersions.length})
            </button>
            <button
              type="button"
              onClick={onSwitchToEditor}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                panelTab === "editor"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Code2 className="size-3.5" />
              JSON
            </button>
          </div>
        </div>
      </SidebarHeader>

      {/* Sidebar Body */}
      <SidebarContent className="gap-0 overflow-hidden">
        {panelTab === "ai" ? (
          <div className="min-h-0 flex-1">
            <A2UIChatPanel
              activeVersionName={
                previewDraft ? `${previewDraft.name} (プレビュー中)` : (activeVersion?.name ?? "v1")
              }
              currentMessagesJson={
                previewDraft?.messagesJson ?? activeVersion?.messagesJson ?? "[]"
              }
              dataModel={dataModel}
              saving={pending}
              previewDraft={previewDraft}
              compareMode={compareMode}
              appliedDraftIds={appliedDraftIds}
              onDataMutated={onDataMutated}
              onExpenseAction={onExpenseAction}
              onPreviewA2UI={onPreviewA2UI}
              onChangeCompareMode={onChangeCompareMode}
              onDiscardPreview={onDiscardPreview}
              onApplyA2UI={onApplyA2UI}
              onOpenInEditor={onOpenInEditor}
            />
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              {panelTab === "history" ? (
                <VersionHistoryPanel
                  uiVersions={uiVersions}
                  activeVersionId={activeVersion?.id}
                  pending={pending}
                  onActivateVersion={onActivateVersion}
                  onSwitchToEditor={onSwitchToEditor}
                />
              ) : (
                <JsonEditorPanel
                  versionName={versionName}
                  versionDesc={versionDesc}
                  editorJson={editorJson}
                  editorError={editorError}
                  onVersionNameChange={onVersionNameChange}
                  onVersionDescChange={onVersionDescChange}
                  onEditorJsonChange={onEditorJsonChange}
                />
              )}
            </div>
          </ScrollArea>
        )}
      </SidebarContent>

      {/* Sidebar Footer for Editor */}
      {panelTab === "editor" && (
        <SidebarFooter className="flex-row items-center justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => onSelectTab("history")}>
            戻る
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={onSaveNewVersion}>
            <Plus className="size-4" />
            新バージョンとして保存
          </Button>
        </SidebarFooter>
      )}

      <SidebarResizeHandle />
    </Sidebar>
  );
}
