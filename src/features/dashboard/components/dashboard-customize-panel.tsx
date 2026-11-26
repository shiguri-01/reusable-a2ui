import { Code2, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardSidebarHost } from "@/features/ai-chat/context/assistant-context";
import { JsonEditorPanel } from "./json-editor-panel";
import { VersionHistoryPanel } from "./version-history-panel";

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
    <Tabs
      value={customizeTab}
      onValueChange={(value) => {
        if (value === "editor") {
          onSwitchToEditor();
        } else {
          onShowHistory();
        }
      }}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="shrink-0 px-4 pt-3 pb-1">
        <TabsList className="grid h-auto w-full grid-cols-2 p-1">
          <TabsTrigger value="history" className="gap-1 px-2 py-1.5 text-xs">
            <History className="size-3.5" />
            履歴 ({uiVersions.length})
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-1 px-2 py-1.5 text-xs">
            <Code2 className="size-3.5" />
            JSON
          </TabsTrigger>
        </TabsList>
      </div>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            <TabsContent value="history" className="mt-0">
              <VersionHistoryPanel
                uiVersions={uiVersions}
                activeVersionId={activeVersion?.id}
                pending={pending}
                onActivateVersion={onActivateVersion}
                onSwitchToEditor={onSwitchToEditor}
              />
            </TabsContent>
            <TabsContent value="editor" className="mt-0">
              <JsonEditorPanel draft={editorDraft} onChange={onEditorDraftChange} />
            </TabsContent>
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
    </Tabs>
  );
}
