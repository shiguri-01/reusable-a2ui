import { useMemo, useState } from "react";
import { action, useRouter } from "@void/react";
import { Check, Code2, Eye, History, Plus, Sparkles, X } from "lucide-react";
import { getByPath, type DataModel } from "@/a2ui/data-model";
import { A2UISurface } from "@/a2ui/renderer";
import { a2uiMessagesSchema, type A2UIAction, type A2UIMessage } from "@/a2ui/types";
import {
  A2UIChatPanel,
  type AiPreviewDraft,
  type CompareMode,
} from "@/components/ai/a2ui-chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from "./layout";
import { Textarea } from "@/components/ui/textarea";
import { buildExpenseDataModel, EXPENSE_CATEGORIES, getTodayIso } from "@/lib/expenses";
import { cn } from "@/lib/utils";
import type { Props } from "./index.server";

function parseMessages(json: string): A2UIMessage[] {
  try {
    const parsed = a2uiMessagesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

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

export default function DashboardPage({ expenses, uiVersions, activeVersionId }: Props) {
  const router = useRouter();
  const activeVersion =
    uiVersions.find((v) => v.id === activeVersionId) ?? uiVersions[uiVersions.length - 1];

  const [formState, setFormState] = useState<Record<string, unknown>>({
    title: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0],
    spentAt: getTodayIso(),
    note: "",
  });
  const [filterState, setFilterState] = useState<Record<string, unknown>>({
    category: "すべて",
  });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(
    null,
  );

  // Right sidebar tab & editor state
  const [panelTab, setPanelTab] = useState<"ai" | "history" | "editor">("ai");
  const [editorJson, setEditorJson] = useState(activeVersion?.messagesJson ?? "[]");
  const [versionName, setVersionName] = useState(`v${uiVersions.length + 1}：カスタム定義`);
  const [versionDesc, setVersionDesc] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);

  // Live preview & comparison state for AI-generated A2UI
  const [previewDraft, setPreviewDraft] = useState<AiPreviewDraft | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("preview");
  const [appliedMessageIds, setAppliedMessageIds] = useState<Record<string, boolean>>({});

  const messages = useMemo(
    () => parseMessages(activeVersion?.messagesJson ?? "[]"),
    [activeVersion?.messagesJson],
  );

  const dataModel = useMemo(
    () =>
      buildExpenseDataModel(expenses, {
        existingForm: formState,
        existingFilter: filterState,
      }),
    [expenses, formState, filterState],
  );

  const handleDataModelChange = (next: DataModel) => {
    const nextForm = getByPath(next, "/form");
    if (nextForm && typeof nextForm === "object") {
      setFormState(nextForm as Record<string, unknown>);
    }
    const nextFilter = getByPath(next, "/filter");
    if (nextFilter && typeof nextFilter === "object") {
      setFilterState(nextFilter as Record<string, unknown>);
    }
  };

  const handleAction = async (act: A2UIAction) => {
    setFeedback(null);

    if (act.name === "createExpense") {
      const title = String(formState.title ?? "").trim();
      const amount = Number(formState.amount);
      const category = String(formState.category ?? EXPENSE_CATEGORIES[0]);
      const spentAt = String(formState.spentAt ?? getTodayIso()) || getTodayIso();
      const note = String(formState.note ?? "").trim();

      if (!title) {
        setFeedback({ type: "error", message: "内容を入力してください。" });
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setFeedback({ type: "error", message: "金額は1円以上の数値で入力してください。" });
        return;
      }

      setPending(true);
      try {
        const res = await action("/?createExpense", {
          data: {
            title,
            amount: Math.round(amount),
            category,
            spentAt,
            note,
          },
        });
        if (!res.ok) {
          setFeedback({ type: "error", message: res.error.message });
          return;
        }
        setFormState({
          title: "",
          amount: "",
          category,
          spentAt,
          note: "",
        });
        setFeedback({ type: "success", message: `「${title}」を記録しました。` });
      } finally {
        setPending(false);
      }
      return;
    }

    if (act.name === "deleteExpense") {
      const id = Number(act.payload?.id);
      if (!Number.isInteger(id) || id <= 0) return;

      setPending(true);
      try {
        const res = await action("/?deleteExpense", {
          data: { id },
        });
        if (!res.ok) {
          setFeedback({ type: "error", message: res.error.message });
          return;
        }
        setFeedback({ type: "success", message: "支出ログを削除しました。" });
      } finally {
        setPending(false);
      }
    }
  };

  const handleActivateVersion = async (versionId: number) => {
    setPending(true);
    setFeedback(null);
    try {
      const res = await action("/?activateVersion", {
        data: { id: versionId },
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error.message });
        return;
      }
      const next = uiVersions.find((v) => v.id === versionId);
      if (next) {
        setEditorJson(next.messagesJson);
      }
      setPreviewDraft(null);
    } finally {
      setPending(false);
    }
  };

  const handleSwitchToEditor = () => {
    if (activeVersion) {
      setEditorJson(activeVersion.messagesJson);
    }
    setVersionName(`v${uiVersions.length + 1}：カスタム定義`);
    setVersionDesc("");
    setEditorError(null);
    setPanelTab("editor");
  };

  const handleSaveNewVersion = async () => {
    setEditorError(null);
    const name = versionName.trim() || `v${uiVersions.length + 1}：カスタム定義`;
    setPending(true);
    try {
      const res = await action("/?saveVersion", {
        data: {
          name,
          description: versionDesc.trim(),
          messagesJson: editorJson,
        },
      });
      if (!res.ok) {
        setEditorError(res.error.message);
        return;
      }
      setPanelTab("history");
      setFeedback({ type: "success", message: `新しいUIバージョン「${name}」を保存しました。` });
    } finally {
      setPending(false);
    }
  };

  const handlePreviewAiVersion = (draft: AiPreviewDraft) => {
    setPreviewDraft(draft);
    setCompareMode((prev) => (prev === "current" ? "preview" : prev));
  };

  const handleApplyAiVersion = async (options: {
    messageId: string;
    name: string;
    description: string;
    messagesJson: string;
  }): Promise<void> => {
    setFeedback(null);
    setPending(true);
    try {
      const res = await action("/?saveVersion", {
        data: {
          name: options.name,
          description: options.description,
          messagesJson: options.messagesJson,
        },
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error.message });
        return;
      }
      setEditorJson(options.messagesJson);
      setAppliedMessageIds((prev) => ({ ...prev, [options.messageId]: true }));
      setPreviewDraft(null);
      setCompareMode("preview");
      setFeedback({
        type: "success",
        message: `「${options.name}」を適用しました。`,
      });
    } finally {
      setPending(false);
    }
  };

  const handleOpenAiJsonInEditor = (messagesJson: string, suggestedName?: string) => {
    setEditorJson(messagesJson);
    setVersionName(suggestedName || `v${uiVersions.length + 1}：AI生成`);
    setVersionDesc("");
    setEditorError(null);
    setPanelTab("editor");
  };

  return (
    <>
      {/* Main A2UI Dashboard Area */}
      <SidebarInset className="min-w-0 bg-transparent">
        <div
          className={cn(
            "mx-auto w-full space-y-4 px-4 py-6 sm:px-6",
            previewDraft && compareMode === "split" ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
              {activeVersion && <Badge variant="outline">v{activeVersion.version}</Badge>}
              {previewDraft && (
                <Badge variant="default" className="gap-1">
                  <Eye className="size-3" />
                  プレビュー中
                </Badge>
              )}
            </div>
          </div>

          {feedback && (
            <div
              className={
                feedback.type === "error"
                  ? "bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs font-medium"
                  : "bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-xs font-medium"
              }
            >
              {feedback.message}
            </div>
          )}

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
                <A2UISurface
                  messages={messages}
                  dataModel={dataModel}
                  onDataModelChange={handleDataModelChange}
                  onAction={handleAction}
                  pending={pending}
                />
              </div>

              <div className="border-primary/40 ring-primary/15 space-y-2.5 rounded-xl border p-4 ring-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-primary text-xs font-semibold">
                    新しいUI（{previewDraft.name}）
                  </span>
                  <Badge variant="default" className="text-[10px]">
                    After
                  </Badge>
                </div>
                <A2UISurface
                  messages={previewDraft.messages}
                  dataModel={dataModel}
                  onDataModelChange={handleDataModelChange}
                  onAction={handleAction}
                  pending={pending}
                />
              </div>
            </div>
          ) : previewDraft && compareMode === "preview" ? (
            <div className="border-primary/35 ring-primary/10 rounded-xl border p-4 ring-2">
              <A2UISurface
                messages={previewDraft.messages}
                dataModel={dataModel}
                onDataModelChange={handleDataModelChange}
                onAction={handleAction}
                pending={pending}
              />
            </div>
          ) : (
            <A2UISurface
              messages={messages}
              dataModel={dataModel}
              onDataModelChange={handleDataModelChange}
              onAction={handleAction}
              pending={pending}
            />
          )}
        </div>
      </SidebarInset>

      {/* Right Edge Docked Sidebar */}
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
                onClick={() => setPanelTab("ai")}
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
                onClick={() => setPanelTab("history")}
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
                onClick={handleSwitchToEditor}
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
                  previewDraft
                    ? `${previewDraft.name} (プレビュー中)`
                    : (activeVersion?.name ?? "v1")
                }
                currentMessagesJson={
                  previewDraft?.messagesJson ?? activeVersion?.messagesJson ?? "[]"
                }
                nextVersionNumber={uiVersions.length + 1}
                saving={pending}
                previewDraft={previewDraft}
                compareMode={compareMode}
                appliedMessageIds={appliedMessageIds}
                onDataMutated={() => {
                  void router.refresh();
                }}
                onPreviewA2UI={handlePreviewAiVersion}
                onChangeCompareMode={setCompareMode}
                onDiscardPreview={() => setPreviewDraft(null)}
                onApplyA2UI={handleApplyAiVersion}
                onOpenInEditor={handleOpenAiJsonInEditor}
              />
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4">
                {panelTab === "history" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {uiVersions.map((ver) => {
                        const isCurrent = ver.id === activeVersion?.id;
                        return (
                          <button
                            key={ver.id}
                            type="button"
                            disabled={pending}
                            onClick={() => handleActivateVersion(ver.id)}
                            className={cn(
                              "w-full cursor-pointer rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                              isCurrent
                                ? "border-primary bg-primary/5"
                                : "bg-background hover:bg-accent/60",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">{ver.name}</span>
                              {isCurrent ? (
                                <Badge variant="default" className="gap-1">
                                  <Check className="size-3" />
                                  使用中
                                </Badge>
                              ) : (
                                <Badge variant="outline">v{ver.version}</Badge>
                              )}
                            </div>
                            {ver.description && (
                              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                {ver.description}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <Separator />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleSwitchToEditor}
                    >
                      <Code2 className="size-4" />
                      現在の JSON をベースに新規作成
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="version-name" className="text-xs">
                        新しいバージョン名
                      </Label>
                      <Input
                        id="version-name"
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                        placeholder="例：v4：2カラム改善版"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="version-desc" className="text-xs">
                        変更メモ
                      </Label>
                      <Input
                        id="version-desc"
                        value={versionDesc}
                        onChange={(e) => setVersionDesc(e.target.value)}
                        placeholder="どこを改善したか"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="a2ui-json" className="text-xs">
                        A2UI Messages JSON
                      </Label>
                      <Textarea
                        id="a2ui-json"
                        value={editorJson}
                        onChange={(e) => setEditorJson(e.target.value)}
                        rows={18}
                        className="font-mono text-xs leading-relaxed"
                      />
                    </div>

                    {editorError && (
                      <p className="text-destructive text-xs font-medium">{editorError}</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SidebarContent>

        {/* Sidebar Footer for Editor */}
        {panelTab === "editor" && (
          <SidebarFooter className="flex-row items-center justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPanelTab("history")}>
              戻る
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={handleSaveNewVersion}>
              <Plus className="size-4" />
              新バージョンとして保存
            </Button>
          </SidebarFooter>
        )}

        <SidebarResizeHandle />
      </Sidebar>
    </>
  );
}
