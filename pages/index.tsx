import { useMemo, useState } from "react";
import { action } from "@void/react";
import { Check, Code2, History, Plus, Sparkles } from "lucide-react";
import { getByPath, type DataModel } from "@/a2ui/data-model";
import { A2UISurface } from "@/a2ui/renderer";
import { a2uiMessagesSchema, type A2UIAction, type A2UIMessage } from "@/a2ui/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildExpenseDataModel, EXPENSE_CATEGORIES, getTodayIso } from "@/lib/expenses";
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

  // JSON inspector / editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editorJson, setEditorJson] = useState(activeVersion?.messagesJson ?? "[]");
  const [versionName, setVersionName] = useState("");
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

  const handleOpenEditor = () => {
    if (!showEditor && activeVersion) {
      setEditorJson(activeVersion.messagesJson);
      setVersionName(`v${uiVersions.length + 1}: カスタム定義`);
      setVersionDesc("");
      setEditorError(null);
    }
    setShowEditor((prev) => !prev);
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
      setShowEditor(false);
      setFeedback({ type: "success", message: `新しいUIバージョン「${name}」を保存しました。` });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* A2UI Version Bar */}
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="text-primary size-4" />
              <CardTitle className="text-base">A2UI ダッシュボード</CardTitle>
              {activeVersion && <Badge variant="outline">v{activeVersion.version}</Badge>}
            </div>
            <CardDescription>
              {activeVersion?.description ||
                "JSON定義からレンダリングされたUIです。同じ支出データのままUIバージョンを切り替えられます。"}
            </CardDescription>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleOpenEditor}>
            <Code2 className="size-4" />
            {showEditor ? "JSONエディタを閉じる" : "A2UI JSONを編集"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-1 inline-flex items-center gap-1 text-xs font-medium">
              <History className="size-3.5" />
              UI履歴:
            </span>
            {uiVersions.map((ver) => {
              const isCurrent = ver.id === activeVersion?.id;
              return (
                <Button
                  key={ver.id}
                  type="button"
                  size="sm"
                  variant={isCurrent ? "default" : "secondary"}
                  disabled={pending}
                  onClick={() => handleActivateVersion(ver.id)}
                >
                  {isCurrent && <Check className="size-3.5" />}
                  {ver.name}
                </Button>
              );
            })}
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
        </CardContent>
      </Card>

      {/* JSON Editor Panel */}
      {showEditor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">A2UI JSON 定義エディタ</CardTitle>
            <CardDescription>
              A2UI メッセージ配列（createSurface /
              updateComponents）を編集し、新しいバージョンとして履歴に保存できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="version-name">新しいバージョン名</Label>
                <Input
                  id="version-name"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="例: v4: 2カラム改善版"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="version-desc">変更メモ</Label>
                <Input
                  id="version-desc"
                  value={versionDesc}
                  onChange={(e) => setVersionDesc(e.target.value)}
                  placeholder="どこを改善したか"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="a2ui-json">A2UI Messages JSON</Label>
              <Textarea
                id="a2ui-json"
                value={editorJson}
                onChange={(e) => setEditorJson(e.target.value)}
                rows={14}
                className="font-mono text-xs leading-relaxed"
              />
            </div>

            {editorError && <p className="text-destructive text-xs font-medium">{editorError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowEditor(false)}>
                キャンセル
              </Button>
              <Button type="button" disabled={pending} onClick={handleSaveNewVersion}>
                <Plus className="size-4" />
                新バージョンとして保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* A2UI Rendered Dashboard */}
      <A2UISurface
        messages={messages}
        dataModel={dataModel}
        onDataModelChange={handleDataModelChange}
        onAction={handleAction}
        pending={pending}
      />
    </div>
  );
}
