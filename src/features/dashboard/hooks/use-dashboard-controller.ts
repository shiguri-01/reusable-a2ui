import { useMemo, useState } from "react";
import { action } from "@void/react";
import type { UiVersion } from "@schema";
import { getByPath, type DataModel } from "@/features/a2ui/data-model";
import {
  a2uiMessagesSchema,
  type A2UIAction,
  type A2UIComponent,
  type A2UIMessage,
} from "@/features/a2ui/types";
import type { AiPreviewDraft, CompareMode } from "@/features/ai-chat/types";
import { runExpenseA2UIAction, type ExpenseActionResult } from "@/features/expenses/actions";
import {
  ALL_CATEGORY_LABEL,
  buildExpenseDataModel,
  createInitialExpenseForm,
  type ExpenseItem,
} from "@/features/expenses/model";
import {
  createEmptyDashboardMessages,
  duplicateComponent,
  extractEditableSurface,
  insertBlock as insertBlockIntoMessages,
  isContainerComponent,
  moveComponent,
  moveComponentRelative,
  parseAndValidateDashboardJson,
  removeComponent,
  updateComponent,
  type BlockBlueprint,
  type EditableSurfaceGraph,
} from "../lib/a2ui-builder";

export interface DashboardFeedback {
  type: "error" | "success";
  message: string;
}

export type CustomizePanelTab = "builder" | "json" | "history";
export type BuilderCanvasMode = "edit" | "preview" | "split";

export interface DashboardBuilderState {
  messages: A2UIMessage[];
  graph: EditableSurfaceGraph;
  rawJson: string;
  jsonError: string | null;
  selectedId: string | null;
  canvasMode: BuilderCanvasMode;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  resetEpoch: number;
  paletteOpen: boolean;
  paletteTargetParentId: string;
  saveDialogOpen: boolean;
  saveServerError: string | null;
  suggestedVersionName: string;
  suggestedDescription: string;
}

export interface DashboardBuilderActions {
  setSelectedId: (id: string | null) => void;
  setCanvasMode: (mode: BuilderCanvasMode) => void;
  undo: () => void;
  redo: () => void;
  resetDraft: () => void;
  openPalette: (parentId?: string) => void;
  setPaletteOpen: (open: boolean) => void;
  insertBlock: (blueprint: BlockBlueprint, parentId?: string) => void;
  updateNode: (nodeId: string, next: A2UIComponent) => void;
  moveNode: (activeId: string, targetParentId: string, targetIndex?: number) => void;
  moveNodeRelative: (nodeId: string, direction: "up" | "down") => void;
  duplicateNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  updateRawJson: (json: string) => void;
  formatRawJson: () => void;
  loadFromMessagesJson: (messagesJson: string, baseLabel?: string) => void;
  setSaveDialogOpen: (open: boolean) => void;
  saveAsNewVersion: (input: { name: string; description: string }) => Promise<boolean>;
}

interface DraftHistoryState {
  past: A2UIMessage[][];
  present: A2UIMessage[];
  future: A2UIMessage[][];
  resetEpoch: number;
}

const MAX_HISTORY_STEPS = 40;

function parseMessages(json: string): A2UIMessage[] {
  try {
    const parsed = a2uiMessagesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : createEmptyDashboardMessages();
  } catch {
    return createEmptyDashboardMessages();
  }
}

interface UseDashboardControllerOptions {
  expenses: ExpenseItem[];
  uiVersions: UiVersion[];
  activeVersionId: number | null;
  onSendPromptToAssistant?: (text: string) => void;
}

export function useDashboardController({
  expenses,
  uiVersions,
  activeVersionId,
  onSendPromptToAssistant,
}: UseDashboardControllerOptions) {
  const activeVersion =
    uiVersions.find((v) => v.id === activeVersionId) ?? uiVersions[uiVersions.length - 1];

  const activeMessages = useMemo(
    () => parseMessages(activeVersion?.messagesJson ?? "[]"),
    [activeVersion?.messagesJson],
  );
  const canonicalActiveJson = useMemo(
    () => JSON.stringify(activeMessages, null, 2),
    [activeMessages],
  );

  const [formState, setFormState] = useState<Record<string, unknown>>(() =>
    createInitialExpenseForm(),
  );
  const [filterState, setFilterState] = useState<Record<string, unknown>>({
    category: ALL_CATEGORY_LABEL,
  });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);

  const [customizeTab, setCustomizeTab] = useState<CustomizePanelTab>("builder");
  const [canvasMode, setCanvasMode] = useState<BuilderCanvasMode>("edit");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [syncedVersionId, setSyncedVersionId] = useState<number | undefined>(activeVersion?.id);
  const [history, setHistory] = useState<DraftHistoryState>(() => ({
    past: [],
    present: activeMessages,
    future: [],
    resetEpoch: 0,
  }));
  const [rawJson, setRawJson] = useState<string>(() => canonicalActiveJson);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTargetParentId, setPaletteTargetParentId] = useState<string>("root");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveServerError, setSaveServerError] = useState<string | null>(null);
  const [baseOriginLabel, setBaseOriginLabel] = useState<string | null>(null);

  // Sync builder baseline whenever the active version ID changes externally (e.g. version switch or save).
  if (activeVersion?.id !== syncedVersionId) {
    setSyncedVersionId(activeVersion?.id);
    setHistory((prev) => ({
      past: [],
      present: activeMessages,
      future: [],
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(canonicalActiveJson);
    setJsonError(null);
    setSelectedId(null);
    setBaseOriginLabel(null);
  }

  const [previewDraft, setPreviewDraft] = useState<AiPreviewDraft | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("preview");
  const [appliedDraftIds, setAppliedDraftIds] = useState<Record<string, boolean>>({});

  const dataModel = useMemo(
    () =>
      buildExpenseDataModel(expenses, {
        existingForm: formState,
        existingFilter: filterState,
      }),
    [expenses, formState, filterState],
  );

  const draftGraph = useMemo(() => extractEditableSurface(history.present), [history.present]);
  const canonicalDraftJson = useMemo(
    () => JSON.stringify(history.present, null, 2),
    [history.present],
  );
  const isDirty = canonicalDraftJson !== canonicalActiveJson || jsonError !== null;

  const commitBuilderMessages = (
    nextMessages: A2UIMessage[],
    options?: { bumpEpoch?: boolean },
  ) => {
    const nextJson = JSON.stringify(nextMessages, null, 2);
    setHistory((prev) => {
      if (JSON.stringify(prev.present) === JSON.stringify(nextMessages)) {
        return prev;
      }
      return {
        past: [...prev.past.slice(-(MAX_HISTORY_STEPS - 1)), prev.present],
        present: nextMessages,
        future: [],
        resetEpoch: options?.bumpEpoch ? prev.resetEpoch + 1 : prev.resetEpoch,
      };
    });
    setRawJson(nextJson);
    setJsonError(null);
  };

  const undo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1]!;
    setHistory((prev) => ({
      past: prev.past.slice(0, -1),
      present: previous,
      future: [prev.present, ...prev.future],
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(JSON.stringify(previous, null, 2));
    setJsonError(null);
  };

  const redo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0]!;
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: next,
      future: prev.future.slice(1),
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(JSON.stringify(next, null, 2));
    setJsonError(null);
  };

  const resetDraft = () => {
    setHistory((prev) => ({
      past: [],
      present: activeMessages,
      future: [],
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(canonicalActiveJson);
    setJsonError(null);
    setSelectedId(null);
    setBaseOriginLabel(null);
  };

  const resolveDefaultInsertPlacement = (explicitParentId?: string) => {
    if (explicitParentId && draftGraph.componentsById.has(explicitParentId)) {
      return { parentId: explicitParentId };
    }
    if (selectedId) {
      const selectedComp = draftGraph.componentsById.get(selectedId);
      if (selectedComp && isContainerComponent(selectedComp)) {
        return { parentId: selectedComp.id };
      }
      const parentId = draftGraph.parentById.get(selectedId);
      const parentComp = parentId ? draftGraph.componentsById.get(parentId) : undefined;
      if (parentComp && isContainerComponent(parentComp)) {
        const idx = parentComp.children.indexOf(selectedId);
        return { parentId: parentComp.id, index: idx + 1 };
      }
    }
    return { parentId: draftGraph.rootId };
  };

  const openPalette = (parentId?: string) => {
    const placement = resolveDefaultInsertPlacement(parentId);
    setPaletteTargetParentId(placement.parentId);
    setPaletteOpen(true);
  };

  const insertBlock = (blueprint: BlockBlueprint, parentId?: string) => {
    const placement = parentId
      ? { parentId }
      : resolveDefaultInsertPlacement(paletteTargetParentId);
    const { messages: nextMessages, insertedId } = insertBlockIntoMessages(
      history.present,
      blueprint,
      placement,
    );
    commitBuilderMessages(nextMessages);
    setSelectedId(insertedId);
  };

  const updateNode = (nodeId: string, next: A2UIComponent) => {
    const nextMessages = updateComponent(history.present, nodeId, () => next);
    commitBuilderMessages(nextMessages);
  };

  const moveNode = (activeId: string, targetParentId: string, targetIndex?: number) => {
    const nextMessages = moveComponent(history.present, activeId, targetParentId, targetIndex);
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
  };

  const moveNodeRelative = (nodeId: string, direction: "up" | "down") => {
    const nextMessages = moveComponentRelative(history.present, nodeId, direction);
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
  };

  const duplicateNode = (nodeId: string) => {
    const { messages: nextMessages, duplicatedId } = duplicateComponent(history.present, nodeId);
    commitBuilderMessages(nextMessages);
    if (duplicatedId) {
      setSelectedId(duplicatedId);
    }
  };

  const deleteNode = (nodeId: string) => {
    const nextMessages = removeComponent(history.present, nodeId);
    commitBuilderMessages(nextMessages);
    if (selectedId === nodeId) {
      setSelectedId(null);
    }
  };

  const updateRawJson = (nextJson: string) => {
    setRawJson(nextJson);
    const validated = parseAndValidateDashboardJson(nextJson);
    if (!validated.ok) {
      setJsonError(validated.error);
      return;
    }
    setJsonError(null);
    setHistory((prev) => {
      if (JSON.stringify(prev.present) === JSON.stringify(validated.messages)) {
        return prev;
      }
      return {
        past: [...prev.past.slice(-(MAX_HISTORY_STEPS - 1)), prev.present],
        present: validated.messages,
        future: [],
        resetEpoch: prev.resetEpoch + 1,
      };
    });
  };

  const formatRawJson = () => {
    const validated = parseAndValidateDashboardJson(rawJson);
    if (validated.ok) {
      setRawJson(JSON.stringify(validated.messages, null, 2));
      setJsonError(null);
    }
  };

  const loadFromMessagesJson = (messagesJson: string, baseLabel?: string) => {
    const validated = parseAndValidateDashboardJson(messagesJson);
    if (!validated.ok) {
      setFeedback({ type: "error", message: validated.error });
      return;
    }
    commitBuilderMessages(validated.messages, { bumpEpoch: true });
    setSelectedId(null);
    setBaseOriginLabel(baseLabel ?? null);
    setPreviewDraft(null);
    setCanvasMode("edit");
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
    if (act.name === "sendPrompt") {
      const text = typeof act.payload?.text === "string" ? act.payload.text.trim() : "";
      if (text && onSendPromptToAssistant) {
        onSendPromptToAssistant(text);
      }
      return;
    }

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
      setPreviewDraft(null);
    } finally {
      setPending(false);
    }
  };

  const nextVersionNumber = uiVersions.reduce((max, v) => Math.max(max, v.version), 0) + 1;
  const suggestedVersionName = baseOriginLabel
    ? `v${nextVersionNumber}：${baseOriginLabel.replace(/^v\d+[：:]\s*/, "")}（カスタム）`
    : `v${nextVersionNumber}：カスタムダッシュボード`;
  const suggestedDescription = baseOriginLabel ? `${baseOriginLabel} をベースに調整` : "";

  const saveAsNewVersion = async (input: {
    name: string;
    description: string;
  }): Promise<boolean> => {
    setSaveServerError(null);
    if (jsonError) {
      setSaveServerError(jsonError);
      return false;
    }
    const name = input.name.trim() || suggestedVersionName;
    const messagesJson = JSON.stringify(history.present, null, 2);

    setPending(true);
    try {
      const res = await action("/?saveVersion", {
        data: {
          name,
          description: input.description.trim(),
          messagesJson,
        },
      });
      if (!res.ok) {
        setSaveServerError(res.error.message);
        return false;
      }
      setFeedback({ type: "success", message: `新しいUIバージョン「${name}」を保存しました。` });
      return true;
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
      setAppliedDraftIds((prev) => ({ ...prev, [draft.draftId]: true }));
      setPreviewDraft(null);
      setCompareMode("preview");
    } finally {
      setPending(false);
    }
  };

  const handleOpenAiJsonInEditor = (messagesJson: string, suggestedName?: string) => {
    loadFromMessagesJson(messagesJson, suggestedName || "AI提案レイアウト");
    setCustomizeTab("builder");
  };

  const builder: DashboardBuilderState & DashboardBuilderActions = {
    messages: history.present,
    graph: draftGraph,
    rawJson,
    jsonError,
    selectedId,
    canvasMode,
    isDirty,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    resetEpoch: history.resetEpoch,
    paletteOpen,
    paletteTargetParentId,
    saveDialogOpen,
    saveServerError,
    suggestedVersionName,
    suggestedDescription,
    setSelectedId,
    setCanvasMode,
    undo,
    redo,
    resetDraft,
    openPalette,
    setPaletteOpen,
    insertBlock,
    updateNode,
    moveNode,
    moveNodeRelative,
    duplicateNode,
    deleteNode,
    updateRawJson,
    formatRawJson,
    loadFromMessagesJson,
    setSaveDialogOpen: (open) => {
      if (open) setSaveServerError(null);
      setSaveDialogOpen(open);
    },
    saveAsNewVersion,
  };

  return {
    activeVersion,
    messages: activeMessages,
    dataModel,
    pending,
    feedback,
    customizeTab,
    setCustomizeTab,
    builder,
    previewDraft,
    compareMode,
    setCompareMode,
    appliedDraftIds,
    handleDataModelChange,
    executeExpenseAction,
    handleAction,
    handleActivateVersion,
    handlePreviewAiVersion,
    handleApplyAiVersion,
    handleOpenAiJsonInEditor,
    handleDiscardPreview: () => setPreviewDraft(null),
  };
}
