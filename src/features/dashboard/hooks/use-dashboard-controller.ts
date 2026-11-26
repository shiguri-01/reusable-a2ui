import { useMemo, useState } from "react";
import { action } from "@void/react";
import type { UiVersion } from "@schema";
import { getByPath, type DataModel } from "@/features/a2ui/data-model";
import { a2uiMessagesSchema, type A2UIAction, type A2UIMessage } from "@/features/a2ui/types";
import type {
  AssistantSidebarTab,
  DashboardEditorDraft,
} from "@/features/ai-chat/context/assistant-context";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import { runExpenseA2UIAction, type ExpenseActionResult } from "@/features/expenses/actions";
import {
  ALL_CATEGORY_LABEL,
  buildExpenseDataModel,
  createInitialExpenseForm,
  type ExpenseItem,
} from "@/features/expenses/model";

export interface DashboardFeedback {
  type: "error" | "success";
  message: string;
}

export type EditorDraft = DashboardEditorDraft;

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

  const [panelTab, setPanelTab] = useState<AssistantSidebarTab>("ai");
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
  ): Promise<ExpenseActionResult> => {
    setPending(true);
    try {
      return await runExpenseA2UIAction(act, sourceForm, "dashboard");
    } finally {
      setPending(false);
    }
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
  };
}
