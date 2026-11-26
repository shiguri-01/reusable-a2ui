import { Code2, History, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardSidebarHost } from "@/features/ai-chat/context/assistant-context";
import type { CustomizePanelTab } from "../hooks/use-dashboard-controller";
import { JsonEditorPanel } from "./json-editor-panel";
import { CanvasModeControl, SaveVersionButton, UndoRedoButtons } from "./builder-controls";
import { VersionHistoryPanel } from "./version-history-panel";
import { VisualBuilderPanel } from "./visual-builder-panel";

export function DashboardCustomizePanel({
  host,
  onAskAssistant,
}: {
  host: DashboardSidebarHost;
  onAskAssistant: () => void;
}) {
  const {
    customizeTab,
    onChangeCustomizeTab,
    uiVersions,
    activeVersion,
    dataModel,
    pending,
    builder,
    onActivateVersion,
  } = host;

  const isEditingSurface = customizeTab === "builder" || customizeTab === "json";

  return (
    <Tabs
      value={customizeTab}
      onValueChange={(value) => onChangeCustomizeTab(value as CustomizePanelTab)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="shrink-0 space-y-2.5 border-b px-4 pt-3 pb-3">
        <TabsList className="grid h-auto w-full grid-cols-3 p-1">
          <TabsTrigger value="builder" className="gap-1 px-2 py-1.5 text-xs">
            <SlidersHorizontal className="size-3.5" />
            ビルダー
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-1 px-2 py-1.5 text-xs">
            <Code2 className="size-3.5" />
            JSON
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 px-2 py-1.5 text-xs">
            <History className="size-3.5" />
            履歴
          </TabsTrigger>
        </TabsList>

        {isEditingSurface && (
          <div className="md:hidden">
            <CanvasModeControl value={builder.canvasMode} onChange={builder.setCanvasMode} />
          </div>
        )}
      </div>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="builder" className="mt-0">
            <VisualBuilderPanel
              builder={builder}
              dataModel={dataModel}
              onAskAssistant={onAskAssistant}
            />
          </TabsContent>
          <TabsContent value="json" className="mt-0 p-4">
            <JsonEditorPanel
              rawJson={builder.rawJson}
              jsonError={builder.jsonError}
              onChange={builder.updateRawJson}
              onFormat={builder.formatRawJson}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-0 p-4">
            <VersionHistoryPanel
              uiVersions={uiVersions}
              activeVersionId={activeVersion?.id}
              pending={pending}
              onActivateVersion={onActivateVersion}
              onLoadIntoBuilder={(json, label) => {
                builder.loadFromMessagesJson(json, label);
                onChangeCustomizeTab("builder");
              }}
            />
          </TabsContent>
        </ScrollArea>
      </SidebarContent>

      {isEditingSurface && (
        <SidebarFooter className="border-t px-4 py-3">
          <SaveVersionButton
            className="w-full"
            disabled={!builder.canSave}
            onClick={() => builder.setSaveDialogOpen(true)}
          />
        </SidebarFooter>
      )}
    </Tabs>
  );
}

export function DashboardCustomizeDraftActions({
  builder,
  customizeTab,
}: Pick<DashboardSidebarHost, "builder" | "customizeTab">) {
  if (customizeTab === "history") return null;

  return (
    <div className="mr-1 flex items-center gap-0.5 border-r pr-1">
      <UndoRedoButtons builder={builder} />
      {builder.isDirty && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          title="変更をリセット"
          aria-label="変更をリセット"
          onClick={builder.resetDraft}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
