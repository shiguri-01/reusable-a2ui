import { useMemo, useState } from "react";
import { action } from "@void/react";
import {
  Check,
  Code2,
  History,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import { getByPath, type DataModel } from "@/a2ui/data-model";
import { A2UISurface } from "@/a2ui/renderer";
import { a2uiMessagesSchema, type A2UIAction, type A2UIMessage } from "@/a2ui/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

export default function DashboardPage({ expenses, uiVersions, activeVersionId }: Props) {
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

  // Right sidebar state (open by default)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<"history" | "editor">("history");
  const [editorJson, setEditorJson] = useState(activeVersion?.messagesJson ?? "[]");
  const [versionName, setVersionName] = useState(`v${uiVersions.length + 1}: カスタム定義`);
  const [versionDesc, setVersionDesc] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);

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
    } finally {
      setPending(false);
    }
  };

  const handleSwitchToEditor = () => {
    if (activeVersion) {
      setEditorJson(activeVersion.messagesJson);
    }
    setVersionName(`v${uiVersions.length + 1}: カスタム定義`);
    setVersionDesc("");
    setEditorError(null);
    setPanelTab("editor");
  };

  const handleSaveNewVersion = async () => {
    setEditorError(null);
    const name = versionName.trim() || `v${uiVersions.length + 1}: カスタム定義`;
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

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* Main A2UI Dashboard Area */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight">ダッシュボード</h1>
              {activeVersion && <Badge variant="outline">v{activeVersion.version}</Badge>}
            </div>

            {!sidebarOpen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelRightOpen className="size-4" />
                UI調整
              </Button>
            )}
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

          <A2UISurface
            messages={messages}
            dataModel={dataModel}
            onDataModelChange={handleDataModelChange}
            onAction={handleAction}
            pending={pending}
          />
        </div>
      </div>

      {/* Right Edge Docked Sidebar */}
      {sidebarOpen ? (
        <aside className="bg-background flex w-full shrink-0 flex-col border-t lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-96 lg:border-t-0 lg:border-l">
          {/* Sidebar Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary size-4" />
              <span className="text-sm font-semibold">UI 調整</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="サイドバーを折りたたむ"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelRightClose className="size-4" />
            </Button>
          </div>

          {/* Sidebar Tabs */}
          <div className="shrink-0 px-4 pt-3 pb-1">
            <div className="bg-muted grid grid-cols-2 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPanelTab("history")}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  panelTab === "history"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <History className="size-3.5" />
                UI履歴 ({uiVersions.length})
              </button>
              <button
                type="button"
                onClick={handleSwitchToEditor}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  panelTab === "editor"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Code2 className="size-3.5" />
                JSON編集
              </button>
            </div>
          </div>

          {/* Sidebar Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {panelTab === "history" ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  同じ支出データのまま、保存済みの A2UI バージョンを切り替えられます。
                </p>

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
                <p className="text-muted-foreground text-xs">
                  A2UI メッセージ配列を編集して新しいバージョンとして保存します。
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="version-name" className="text-xs">
                    新しいバージョン名
                  </Label>
                  <Input
                    id="version-name"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="例: v4: 2カラム改善版"
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

          {/* Sidebar Footer for Editor */}
          {panelTab === "editor" && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPanelTab("history")}
              >
                戻る
              </Button>
              <Button type="button" size="sm" disabled={pending} onClick={handleSaveNewVersion}>
                <Plus className="size-4" />
                新バージョンとして保存
              </Button>
            </div>
          )}
        </aside>
      ) : (
        <aside className="bg-background hidden shrink-0 flex-col items-center border-l lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:w-12">
          <div className="flex h-12 w-full items-center justify-center border-b">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              title="UI 調整サイドバーを開く"
              aria-label="UI 調整サイドバーを開く"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelRightOpen className="size-4" />
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground flex flex-1 cursor-pointer flex-col items-center gap-2 py-4 transition-colors"
            aria-label="UI 調整サイドバーを開く"
          >
            <Sparkles className="size-4" />
            <span className="text-xs font-medium [writing-mode:vertical-rl]">UI 調整</span>
          </button>
        </aside>
      )}
    </div>
  );
}
