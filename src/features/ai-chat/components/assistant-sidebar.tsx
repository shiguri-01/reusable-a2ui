import { useState } from "react";
import { Code2, History, Plus, RotateCcw, Settings2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { JsonEditorPanel } from "@/features/dashboard/components/json-editor-panel";
import { VersionHistoryPanel } from "@/features/dashboard/components/version-history-panel";
import { cn } from "@/lib/utils";
import { useAssistantSidebar } from "../context/assistant-context";
import { useCodexChat } from "../hooks/use-codex-chat";
import { A2UIChatPanel } from "./a2ui-chat-panel";
import { CodexConnectionDialog } from "./codex-connection-bar";
import { SidebarResizeHandle } from "./sidebar-resize-handle";

function MobileSidebarCloseButton() {
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 md:hidden"
      aria-label="サイドバーを閉じる"
      onClick={() => setOpenMobile(false)}
    >
      <X className="size-4" />
    </Button>
  );
}

export function AssistantSidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    currentPagePath,
    dashboardHost,
    dataModel,
    pending,
    executeExpenseAction,
    handleDataMutated,
    handlePreviewA2UI,
  } = useAssistantSidebar();

  const activeTab = dashboardHost ? dashboardHost.panelTab : "ai";
  const activeVersionName = dashboardHost
    ? dashboardHost.preview.draft
      ? `${dashboardHost.preview.draft.name} (プレビュー中)`
      : (dashboardHost.activeVersion?.name ?? "v1")
    : undefined;
  const currentMessagesJson = dashboardHost
    ? (dashboardHost.preview.draft?.messagesJson ??
      dashboardHost.activeVersion?.messagesJson ??
      "[]")
    : undefined;

  const chat = useCodexChat({
    currentPagePath,
    activeVersionName,
    currentMessagesJson,
    onDataMutated: handleDataMutated,
    onPreviewA2UI: handlePreviewA2UI,
  });

  const { codexStatus } = chat;
  const statusDotClass =
    codexStatus.state === "connected"
      ? "bg-emerald-500/80"
      : codexStatus.state === "connecting"
        ? "bg-amber-500 animate-pulse"
        : codexStatus.state === "error"
          ? "bg-destructive"
          : "bg-muted-foreground/40";

  const statusTitle =
    codexStatus.state === "connected"
      ? `接続中${codexStatus.model ? ` (${codexStatus.model})` : ""}`
      : codexStatus.state === "connecting"
        ? "接続中..."
        : "未接続";

  const handleConnectFromDialog = async () => {
    const ok = await chat.connect();
    if (ok) {
      setSettingsOpen(false);
    }
  };

  return (
    <>
      <Sidebar side="right" collapsible="offcanvas" className="top-14 h-[calc(100svh-3.5rem)]">
        {/* Sidebar Header */}
        <SidebarHeader className="gap-0 p-0">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b pr-2 pl-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold">AI アシスタント</span>
              <span
                className={cn("size-2 shrink-0 rounded-full", statusDotClass)}
                title={statusTitle}
                aria-label={statusTitle}
              />
              {codexStatus.state !== "connected" && (
                <span className="text-muted-foreground truncate text-[11px]">
                  {codexStatus.state === "connecting" ? "接続中..." : "未接続"}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              {activeTab === "ai" && chat.messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="会話をリセット"
                  aria-label="会話をリセット"
                  onClick={chat.resetChat}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                title="接続設定"
                aria-label="接続設定"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="size-3.5" />
              </Button>
              <MobileSidebarCloseButton />
            </div>
          </div>

          {/* Dashboard-only customization tabs */}
          {dashboardHost && (
            <div className="shrink-0 px-4 pt-3 pb-1">
              <div className="bg-muted grid grid-cols-3 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => dashboardHost.onSelectTab("ai")}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "ai"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  AI
                </button>
                <button
                  type="button"
                  onClick={() => dashboardHost.onSelectTab("history")}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "history"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <History className="size-3.5" />
                  履歴 ({dashboardHost.uiVersions.length})
                </button>
                <button
                  type="button"
                  onClick={dashboardHost.onSwitchToEditor}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "editor"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Code2 className="size-3.5" />
                  JSON
                </button>
              </div>
            </div>
          )}
        </SidebarHeader>

        {/* Sidebar Body */}
        <SidebarContent className="gap-0 overflow-hidden">
          {/* Keep AI chat mounted across tab switches and page navigations */}
          <div className={cn("min-h-0 flex-1", activeTab !== "ai" && "hidden")}>
            <A2UIChatPanel
              chat={chat}
              dataModel={dataModel}
              saving={pending}
              previewDraft={dashboardHost?.preview.draft ?? null}
              compareMode={dashboardHost?.preview.compareMode ?? "preview"}
              appliedDraftIds={dashboardHost?.preview.appliedDraftIds ?? {}}
              onExpenseAction={executeExpenseAction}
              onPreviewA2UI={handlePreviewA2UI}
              onChangeCompareMode={dashboardHost?.preview.onChangeCompareMode}
              onDiscardPreview={dashboardHost?.preview.onDiscard}
              onApplyA2UI={dashboardHost?.preview.onApply}
              onOpenInEditor={dashboardHost?.preview.onOpenInEditor}
            />
          </div>

          {dashboardHost && activeTab !== "ai" && (
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                {activeTab === "history" ? (
                  <VersionHistoryPanel
                    uiVersions={dashboardHost.uiVersions}
                    activeVersionId={dashboardHost.activeVersion?.id}
                    pending={dashboardHost.pending}
                    onActivateVersion={dashboardHost.onActivateVersion}
                    onSwitchToEditor={dashboardHost.onSwitchToEditor}
                  />
                ) : (
                  <JsonEditorPanel
                    draft={dashboardHost.editorDraft}
                    onChange={dashboardHost.onEditorDraftChange}
                  />
                )}
              </div>
            </ScrollArea>
          )}
        </SidebarContent>

        {/* Sidebar Footer for Editor */}
        {dashboardHost && activeTab === "editor" && (
          <SidebarFooter className="flex-row items-center justify-end gap-2 border-t px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => dashboardHost.onSelectTab("history")}
            >
              戻る
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={dashboardHost.pending}
              onClick={dashboardHost.onSaveNewVersion}
            >
              <Plus className="size-4" />
              新バージョンとして保存
            </Button>
          </SidebarFooter>
        )}

        <SidebarResizeHandle />
      </Sidebar>

      <CodexConnectionDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        status={codexStatus}
        wsUrlInput={chat.wsUrlInput}
        onWsUrlChange={chat.setWsUrlInput}
        onConnect={() => void handleConnectFromDialog()}
      />
    </>
  );
}
