import { useMemo, useState } from "react";
import { action, useRouter } from "@void/react";
import type { UiVersion } from "@schema";
import { getByPath, type DataModel } from "@/features/a2ui/data-model";
import { a2uiMessagesSchema, type A2UIAction, type A2UIMessage } from "@/features/a2ui/types";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import {
  ALL_CATEGORY_LABEL,
  buildExpenseDataModel,
  createInitialExpenseForm,
  EXPENSE_CATEGORIES,
  getTodayIso,
  type ExpenseItem,
} from "@/features/expenses/model";
import type { DashboardSidebarTab } from "../components/dashboard-sidebar";

export interface DashboardFeedback {
  type: "error" | "success";
  message: string;
}

export interface EditorDraft {
  name: string;
  description: string;
  json: string;
  error: string | null;
}

function parseMessages(json: string): A2UIMessage[] {
  try {
    const parsed = a2uiMessagesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

interface UseDashboardControllerOptions {
  expenses: ExpenseItem[];
  uiVersions: UiVersion[];
  activeVersionId: number | null;
}

export function useDashboardController({
  expenses,
  uiVersions,
  activeVersionId,
}: UseDashboardControllerOptions) {
  const router = useRouter();
  const activeVersion =
    uiVersions.find((v) => v.id === activeVersionId) ?? uiVersions[uiVersions.length - 1];

  const [formState, setFormState] = useState<Record<string, unknown>>(() =>
    createInitialExpenseForm(),
  );
  const [filterState, setFilterState] = useState<Record<string, unknown>>({
    category: ALL_CATEGORY_LABEL,
  });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);

  const [panelTab, setPanelTab] = useState<DashboardSidebarTab>("ai");
  const [editorDraft, setEditorDraft] = useState<EditorDraft>(() => ({
    name: `v${uiVersions.length + 1}：カスタム定義`,
    description: "",
    json: activeVersion?.messagesJson ?? "[]",
    error: null,
  }));

  const [previewDraft, setPreviewDraft] = useState<AiPreviewDraft | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("preview");
  const [appliedDraftIds, setAppliedDraftIds] = useState<Record<string, boolean>>({});

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

  const updateEditorDraft = (patch: Partial<EditorDraft>) => {
    setEditorDraft((prev) => ({ ...prev, ...patch }));
  };

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

  const executeExpenseAction = async (
    act: A2UIAction,
    sourceForm: Record<string, unknown>,
  ): Promise<{ ok: boolean; message?: string }> => {
    if (act.name === "createExpense") {
      const title = String(sourceForm.title ?? "").trim();
      const amount = Number(sourceForm.amount);
      const category = String(sourceForm.category ?? EXPENSE_CATEGORIES[0]);
      const spentAt = String(sourceForm.spentAt ?? getTodayIso()) || getTodayIso();
      const note = String(sourceForm.note ?? "").trim();

      if (!title) {
        return { ok: false, message: "内容を入力してください。" };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, message: "金額は1円以上の数値で入力してください。" };
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
          return { ok: false, message: res.error.message };
        }
        return { ok: true, message: `「${title}」を記録しました。` };
      } finally {
        setPending(false);
      }
    }

    if (act.name === "deleteExpense") {
      const id = Number(act.payload?.id);
      if (!Number.isInteger(id) || id <= 0) return { ok: false };

      setPending(true);
      try {
        const res = await action("/?deleteExpense", {
          data: { id },
        });
        if (!res.ok) {
          return { ok: false, message: res.error.message };
        }
        return { ok: true, message: "支出ログを削除しました。" };
      } finally {
        setPending(false);
      }
    }

    return { ok: false };
  };

  const handleAction = async (act: A2UIAction) => {
    setFeedback(null);
    const result = await executeExpenseAction(act, formState);
    if (result.ok && act.name === "createExpense") {
      setFormState((prev) => ({
        ...prev,
        title: "",
        amount: "",
        note: "",
      }));
    }
    if (result.message) {
      setFeedback({ type: result.ok ? "success" : "error", message: result.message });
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
        updateEditorDraft({ json: next.messagesJson });
      }
      setPreviewDraft(null);
    } finally {
      setPending(false);
    }
  };

  const handleSwitchToEditor = () => {
    setEditorDraft((prev) => ({
      name: `v${uiVersions.length + 1}：カスタム定義`,
      description: "",
      json: activeVersion?.messagesJson ?? prev.json,
      error: null,
    }));
    setPanelTab("editor");
  };

  const handleSaveNewVersion = async () => {
    updateEditorDraft({ error: null });
    const name = editorDraft.name.trim() || `v${uiVersions.length + 1}：カスタム定義`;
    setPending(true);
    try {
      const res = await action("/?saveVersion", {
        data: {
          name,
          description: editorDraft.description.trim(),
          messagesJson: editorDraft.json,
        },
      });
      if (!res.ok) {
        updateEditorDraft({ error: res.error.message });
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

  const handleApplyAiVersion = async (draft: AiPreviewDraft): Promise<void> => {
    setFeedback(null);
    setPending(true);
    try {
      const res = await action("/?saveVersion", {
        data: {
          name: draft.name,
          description: draft.description,
          messagesJson: draft.messagesJson,
        },
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error.message });
        return;
      }
      updateEditorDraft({ json: draft.messagesJson });
      setAppliedDraftIds((prev) => ({ ...prev, [draft.draftId]: true }));
      setPreviewDraft(null);
      setCompareMode("preview");
    } finally {
      setPending(false);
    }
  };

  const handleOpenAiJsonInEditor = (messagesJson: string, suggestedName?: string) => {
    setEditorDraft({
      name: suggestedName || `v${uiVersions.length + 1}：AI生成`,
      description: "",
      json: messagesJson,
      error: null,
    });
    setPanelTab("editor");
  };

  const handleDataMutated = () => {
    void router.refresh();
  };

  return {
    activeVersion,
    messages,
    dataModel,
    pending,
    feedback,
    panelTab,
    setPanelTab,
    editorDraft,
    updateEditorDraft,
    previewDraft,
    compareMode,
    setCompareMode,
    appliedDraftIds,
    handleDataModelChange,
    executeExpenseAction,
    handleAction,
    handleActivateVersion,
    handleSwitchToEditor,
    handleSaveNewVersion,
    handlePreviewAiVersion,
    handleApplyAiVersion,
    handleOpenAiJsonInEditor,
    handleDiscardPreview: () => setPreviewDraft(null),
    handleDataMutated,
  };
}
