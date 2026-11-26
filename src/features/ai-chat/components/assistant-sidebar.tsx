import { useState, type ReactNode } from "react";
import { Bot, RotateCcw, Settings, Settings2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardCustomizePanel } from "@/features/dashboard/components/dashboard-customize-panel";
import { cn } from "@/lib/utils";
import type { CodexClientStatus } from "../codex/client";
import { useAssistantSidebar } from "../context/assistant-context";
import { useCodexChat } from "../hooks/use-codex-chat";
import { A2UIChatPanel } from "./a2ui-chat-panel";
import { CodexConnectionDialog } from "./codex-connection-bar";
import { SidebarResizeHandle } from "./sidebar-resize-handle";

const statusDotClasses: Record<CodexClientStatus["state"], string> = {
  connected: "bg-emerald-500/80",
  connecting: "bg-amber-500 animate-pulse",
  error: "bg-destructive",
  disconnected: "bg-muted-foreground/40",
};

interface PanelToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function PanelToggle({ label, active, onClick, children }: PanelToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "relative rounded-full md:mr-1.5 md:w-auto md:transition-colors",
            active
              ? "md:bg-sidebar md:hover:bg-sidebar md:border-sidebar-border md:text-foreground md:-ml-px md:rounded-l-none md:rounded-r-lg md:border md:border-l-0 md:pl-[7px] md:shadow-none"
              : "md:text-muted-foreground md:hover:bg-background/70 md:hover:text-foreground md:ml-1.5 md:rounded-lg",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="hidden md:block">
        {active ? `${label}を閉じる` : label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AssistantSidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    currentPagePath,
    dashboardHost,
    activePanel,
    visiblePanel,
    togglePanel,
    closePanel,
    dataModel,
    pending,
    executeExpenseAction,
    handleDataMutated,
    handlePreviewA2UI,
  } = useAssistantSidebar();

  const customizeHost = activePanel === "customize" ? dashboardHost : null;
  const preview = dashboardHost?.preview;
  const activeVersion = dashboardHost?.activeVersion;
  const activeVersionName = preview?.draft
    ? `${preview.draft.name} (プレビュー中)`
    : (activeVersion?.name ?? (dashboardHost ? "v1" : undefined));
  const currentMessagesJson = dashboardHost
    ? (preview?.draft?.messagesJson ?? activeVersion?.messagesJson ?? "[]")
    : undefined;

  const chat = useCodexChat({
    currentPagePath,
    activeVersionName,
    currentMessagesJson,
    onDataMutated: handleDataMutated,
    onPreviewA2UI: handlePreviewA2UI,
  });

  const { codexStatus } = chat;
  const isConnected = codexStatus.state === "connected";
  const statusDotClass = statusDotClasses[codexStatus.state];
  const statusText = codexStatus.state === "connecting" ? "接続中..." : "未接続";
  const statusTitle = isConnected
    ? `接続中${codexStatus.model ? ` (${codexStatus.model})` : ""}`
    : statusText;

  const handleConnectFromDialog = async () => {
    if (await chat.connect()) {
      setSettingsOpen(false);
    }
  };

  return (
    <>
      <Sidebar
        side="right"
        collapsible="offcanvas"
        className="top-14 right-12 h-[calc(100svh-3.5rem)]"
      >
        <SidebarHeader className="h-12 shrink-0 flex-row items-center justify-between gap-2 border-b p-0 pr-2 pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {customizeHost ? "ページカスタマイズ" : "AI アシスタント"}
            </span>
            {customizeHost ? (
              activeVersion && <Badge variant="secondary">v{activeVersion.version}</Badge>
            ) : (
              <>
                <span
                  className={cn("size-2 shrink-0 rounded-full", statusDotClass)}
                  title={statusTitle}
                  aria-label={statusTitle}
                />
                {!isConnected && (
                  <span className="text-muted-foreground truncate text-[11px]">{statusText}</span>
                )}
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {!customizeHost && (
              <>
                {chat.messages.length > 0 && (
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
                  <Settings className="size-3.5" />
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="パネルを閉じる"
              aria-label="パネルを閉じる"
              onClick={closePanel}
            >
              <X className="size-4" />
            </Button>
          </div>
        </SidebarHeader>

        {/* Keep the chat input and scroll state when switching panels. */}
        <SidebarContent className={cn("gap-0 overflow-hidden", customizeHost && "hidden")}>
          <div className="min-h-0 flex-1">
            <A2UIChatPanel
              chat={chat}
              dataModel={dataModel}
              saving={pending}
              previewDraft={preview?.draft ?? null}
              compareMode={preview?.compareMode ?? "preview"}
              appliedDraftIds={preview?.appliedDraftIds ?? {}}
              onExpenseAction={executeExpenseAction}
              onPreviewA2UI={handlePreviewA2UI}
              onChangeCompareMode={preview?.onChangeCompareMode}
              onDiscardPreview={preview?.onDiscard}
              onApplyA2UI={preview?.onApply}
              onOpenInEditor={preview?.onOpenInEditor}
            />
          </div>
        </SidebarContent>
        {customizeHost && <DashboardCustomizePanel host={customizeHost} />}

        <SidebarResizeHandle />
      </Sidebar>

      <div className="hidden w-12 shrink-0 md:block" aria-hidden="true" />
      <aside
        aria-label="サイドパネル切替"
        className="bg-background md:bg-muted md:border-sidebar-border fixed right-3 bottom-4 z-30 flex items-center gap-1 rounded-full border p-1 shadow-md md:top-14 md:right-0 md:bottom-0 md:z-20 md:w-12 md:flex-col md:items-stretch md:gap-1.5 md:rounded-none md:border-0 md:border-l md:px-0 md:py-2.5 md:shadow-none"
      >
        <PanelToggle
          label="AI アシスタント"
          active={visiblePanel === "ai"}
          onClick={() => togglePanel("ai")}
        >
          <Bot className="size-4" />
          {!isConnected && (
            <span
              className={cn(
                "ring-background absolute right-1.5 bottom-1.5 size-1.5 rounded-full ring-2",
                statusDotClass,
              )}
              aria-hidden="true"
            />
          )}
        </PanelToggle>

        {dashboardHost && (
          <PanelToggle
            label="ページカスタマイズ"
            active={visiblePanel === "customize"}
            onClick={() => togglePanel("customize")}
          >
            <Settings2 className="size-4" />
          </PanelToggle>
        )}
      </aside>

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
