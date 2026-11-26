import { useShortcutHint } from "@ui-sdk/react/shortcuts";
import { Code2, History, Redo2, RotateCcw, Save, SlidersHorizontal, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardSidebarHost } from "@/features/ai-chat/context/assistant-context";
import type { CustomizePanelTab } from "../hooks/use-dashboard-controller";
import { JsonEditorPanel } from "./json-editor-panel";
import { BuilderSegmentedControl } from "./ui-sdk-controls";
import { VersionHistoryPanel } from "./version-history-panel";
import { VisualBuilderPanel } from "./visual-builder-panel";

export function DashboardCustomizePanel({ host }: { host: DashboardSidebarHost }) {
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

  const undoHint = useShortcutHint("mod+z");
  const redoHint = useShortcutHint("mod+shift+z");
  const isEditingSurface = customizeTab === "builder" || customizeTab === "json";

  return (
    <Tabs
      value={customizeTab}
      onValueChange={(value) => onChangeCustomizeTab(value as CustomizePanelTab)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="shrink-0 space-y-2 border-b px-4 pt-3 pb-2.5">
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
            履歴 ({uiVersions.length})
          </TabsTrigger>
        </TabsList>

        {isEditingSurface && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <BuilderSegmentedControl
                size="xs"
                value={builder.canvasMode}
                ariaLabel="キャンバス表示モード"
                options={[
                  { value: "edit", label: "選択・移動" },
                  { value: "preview", label: "操作テスト" },
                  { value: "split", label: "前後比較" },
                ]}
                onChange={builder.setCanvasMode}
              />
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!builder.canUndo}
                title={`元に戻す (${undoHint.text})`}
                aria-label="元に戻す"
                onClick={builder.undo}
              >
                <Undo2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={!builder.canRedo}
                title={`やり直す (${redoHint.text})`}
                aria-label="やり直す"
                onClick={builder.redo}
              >
                <Redo2 className="size-3.5" />
              </Button>
              {builder.isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-7"
                  title="現在のバージョンに戻す"
                  aria-label="現在のバージョンに戻す"
                  onClick={builder.resetDraft}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            <TabsContent value="builder" className="mt-0">
              <VisualBuilderPanel builder={builder} dataModel={dataModel} />
            </TabsContent>
            <TabsContent value="json" className="mt-0">
              <JsonEditorPanel
                rawJson={builder.rawJson}
                jsonError={builder.jsonError}
                onChange={builder.updateRawJson}
                onFormat={builder.formatRawJson}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-0">
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
          </div>
        </ScrollArea>
      </SidebarContent>

      {isEditingSurface && (
        <SidebarFooter className="flex-row items-center justify-between gap-2 border-t px-4 py-2.5">
          <div className="min-w-0">
            {builder.jsonError ? (
              <Badge variant="destructive" className="text-[10px]">
                JSONエラーあり
              </Badge>
            ) : builder.isDirty ? (
              <Badge variant="secondary" className="text-[10px]">
                未保存の変更あり
              </Badge>
            ) : (
              <span className="text-muted-foreground text-[11px]">変更なし</span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            disabled={pending || Boolean(builder.jsonError) || !builder.isDirty}
            onClick={() => builder.setSaveDialogOpen(true)}
          >
            <Save className="size-3.5" />
            新バージョンとして保存
          </Button>
        </SidebarFooter>
      )}
    </Tabs>
  );
}
