import { Code2, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import type { DashboardSidebarHost } from "@/features/ai-chat/context/assistant-context";
import { JsonEditorPanel } from "./json-editor-panel";
import { VersionHistoryPanel } from "./version-history-panel";

const customizeTabClass =
  "text-muted-foreground hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors";

export function DashboardCustomizePanel({ host }: { host: DashboardSidebarHost }) {
  const {
    customizeTab,
    uiVersions,
    activeVersion,
    pending,
    editorDraft,
    onShowHistory,
    onSwitchToEditor,
    onActivateVersion,
    onEditorDraftChange,
    onSaveNewVersion,
  } = host;
  const isEditing = customizeTab === "editor";

  return (
    <>
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="bg-muted grid grid-cols-2 rounded-lg p-1">
          <button
            type="button"
            className={customizeTabClass}
            aria-pressed={!isEditing}
            onClick={onShowHistory}
          >
            <History className="size-3.5" />
            履歴 ({uiVersions.length})
          </button>
          <button
            type="button"
            className={customizeTabClass}
            aria-pressed={isEditing}
            onClick={onSwitchToEditor}
          >
            <Code2 className="size-3.5" />
            JSON
          </button>
        </div>
      </div>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {isEditing ? (
              <JsonEditorPanel draft={editorDraft} onChange={onEditorDraftChange} />
            ) : (
              <VersionHistoryPanel
                uiVersions={uiVersions}
                activeVersionId={activeVersion?.id}
                pending={pending}
                onActivateVersion={onActivateVersion}
                onSwitchToEditor={onSwitchToEditor}
              />
            )}
          </div>
        </ScrollArea>
      </SidebarContent>

      {isEditing && (
        <SidebarFooter className="flex-row items-center justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onShowHistory}>
            戻る
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={onSaveNewVersion}>
            <Plus className="size-4" />
            新バージョンとして保存
          </Button>
        </SidebarFooter>
      )}
    </>
  );
}
