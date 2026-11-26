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
import type { AiPreviewDraft, DashboardEditBase } from "@/features/ai-chat/types";
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
import { matchesProposalBase, type DashboardProposal } from "../lib/ai-proposal";

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
  canSave: boolean;
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

interface DraftOrigin {
  label: string;
  proposal?: Pick<AiPreviewDraft, "draftId" | "description">;
}

interface DraftSnapshot {
  messages: A2UIMessage[];
  origin?: DraftOrigin;
  invalidJson?: { text: string; error: string };
}

interface DraftHistoryState {
  past: DraftSnapshot[];
  present: DraftSnapshot;
  future: DraftSnapshot[];
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
    present: { messages: activeMessages },
    future: [],
    resetEpoch: 0,
  }));
  const [rawJson, setRawJson] = useState<string>(() => canonicalActiveJson);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTargetParentId, setPaletteTargetParentId] = useState<string>("root");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveServerError, setSaveServerError] = useState<string | null>(null);

  // Sync builder baseline whenever the active version ID changes externally (e.g. version switch or save).
  if (activeVersion?.id !== syncedVersionId) {
    setSyncedVersionId(activeVersion?.id);
    setHistory((prev) => ({
      past: [],
      present: { messages: activeMessages },
      future: [],
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(canonicalActiveJson);
    setJsonError(null);
    setSelectedId(null);
  }

  const [proposal, setProposal] = useState<DashboardProposal | null>(null);
  const [appliedDraftIds, setAppliedDraftIds] = useState<Record<string, boolean>>({});

  const dataModel = useMemo(
    () =>
      buildExpenseDataModel(expenses, {
        existingForm: formState,
        existingFilter: filterState,
      }),
    [expenses, formState, filterState],
  );

  const draftMessages = history.present.messages;
  const draftGraph = useMemo(() => extractEditableSurface(draftMessages), [draftMessages]);
  const canonicalDraftJson = useMemo(() => JSON.stringify(draftMessages, null, 2), [draftMessages]);
  const isDirty = canonicalDraftJson !== canonicalActiveJson || jsonError !== null;

  const captureDraft = (snapshot: DraftSnapshot): DraftSnapshot => ({
    ...snapshot,
    invalidJson: jsonError ? { text: rawJson, error: jsonError } : undefined,
  });

  const commitBuilderMessages = (
    nextMessages: A2UIMessage[],
    options?: { bumpEpoch?: boolean; origin?: DraftOrigin | null; rawJson?: string },
  ) => {
    const nextJson = JSON.stringify(nextMessages, null, 2);
    setHistory((prev) => {
      const origin =
        options?.origin === undefined ? prev.present.origin : (options.origin ?? undefined);
      if (
        origin === prev.present.origin &&
        JSON.stringify(prev.present.messages) === JSON.stringify(nextMessages)
      ) {
        return prev;
      }
      const previous = options?.origin?.proposal ? captureDraft(prev.present) : prev.present;
      return {
        past: [...prev.past.slice(-(MAX_HISTORY_STEPS - 1)), previous],
        present: { messages: nextMessages, origin },
        future: [],
        resetEpoch: options?.bumpEpoch ? prev.resetEpoch + 1 : prev.resetEpoch,
      };
    });
    setRawJson(options?.rawJson ?? nextJson);
    setJsonError(null);
  };

  const undo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1]!;
    setHistory((prev) => ({
      past: prev.past.slice(0, -1),
      present: { messages: previous.messages, origin: previous.origin },
      future: [captureDraft(prev.present), ...prev.future],
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(previous.invalidJson?.text ?? JSON.stringify(previous.messages, null, 2));
    setJsonError(previous.invalidJson?.error ?? null);
  };

  const redo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0]!;
    setHistory((prev) => ({
      past: [...prev.past, captureDraft(prev.present)],
      present: { messages: next.messages, origin: next.origin },
      future: prev.future.slice(1),
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(next.invalidJson?.text ?? JSON.stringify(next.messages, null, 2));
    setJsonError(next.invalidJson?.error ?? null);
  };

  const resetDraft = () => {
    setHistory((prev) => ({
      past: [],
      present: { messages: activeMessages },
      future: [],
      resetEpoch: prev.resetEpoch + 1,
    }));
    setRawJson(canonicalActiveJson);
    setJsonError(null);
    setSelectedId(null);
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
      draftMessages,
      blueprint,
      placement,
    );
    commitBuilderMessages(nextMessages);
    setSelectedId(insertedId);
  };

  const updateNode = (nodeId: string, next: A2UIComponent) => {
    const nextMessages = updateComponent(draftMessages, nodeId, () => next);
    commitBuilderMessages(nextMessages);
  };

  const moveNode = (activeId: string, targetParentId: string, targetIndex?: number) => {
    const nextMessages = moveComponent(draftMessages, activeId, targetParentId, targetIndex);
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
  };

  const moveNodeRelative = (nodeId: string, direction: "up" | "down") => {
    const nextMessages = moveComponentRelative(draftMessages, nodeId, direction);
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
  };

  const duplicateNode = (nodeId: string) => {
    const { messages: nextMessages, duplicatedId } = duplicateComponent(draftMessages, nodeId);
    commitBuilderMessages(nextMessages);
    if (duplicatedId) {
      setSelectedId(duplicatedId);
    }
  };

  const deleteNode = (nodeId: string) => {
    const nextMessages = removeComponent(draftMessages, nodeId);
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
    commitBuilderMessages(validated.messages, { bumpEpoch: true, rawJson: nextJson });
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
    commitBuilderMessages(validated.messages, {
      bumpEpoch: true,
      origin: baseLabel ? { label: baseLabel } : null,
    });
    setSelectedId(null);
    setProposal(null);
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
      const text = typeof act.context?.text === "string" ? act.context.text.trim() : "";
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
      setProposal(null);
    } finally {
      setPending(false);
    }
  };

  const nextVersionNumber = uiVersions.reduce((max, v) => Math.max(max, v.version), 0) + 1;
  const origin = history.present.origin;
  const suggestedVersionName = origin?.proposal
    ? origin.label
    : origin
      ? `v${nextVersionNumber}：${origin.label.replace(/^v\d+[：:]\s*/, "")}（カスタム）`
      : `v${nextVersionNumber}：カスタムダッシュボード`;
  const suggestedDescription =
    origin?.proposal?.description ?? (origin ? `${origin.label} をベースに調整` : "");

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
    const proposalId = origin?.proposal?.draftId;

    setPending(true);
    try {
      const res = await action("/?saveVersion", {
        data: {
          name,
          description: input.description.trim(),
          messagesJson: canonicalDraftJson,
        },
      });
      if (!res.ok) {
        setSaveServerError(res.error.message);
        return false;
      }
      if (proposalId) {
        setAppliedDraftIds((prev) => ({ ...prev, [proposalId]: true }));
        setProposal((prev) => (prev?.draft.draftId === proposalId ? null : prev));
      }
      setFeedback({ type: "success", message: `「${name}」を保存しました。` });
      return true;
    } finally {
      setPending(false);
    }
  };

  const handlePreviewAiVersion = (draft: AiPreviewDraft) => {
    setProposal({ draft, mode: "split" });
  };

  const setProposalMode = (mode: DashboardProposal["mode"]) => {
    setProposal((prev) => (prev && prev.mode !== mode ? { ...prev, mode } : prev));
  };

  const adoptAiProposal = (draft: AiPreviewDraft) => {
    commitBuilderMessages(draft.messages, {
      bumpEpoch: true,
      origin: {
        label: draft.name,
        proposal: { draftId: draft.draftId, description: draft.description },
      },
    });
    setProposal(null);
    setSelectedId(
      selectedId && extractEditableSurface(draft.messages).componentsById.has(selectedId)
        ? selectedId
        : null,
    );
    setFeedback(null);
  };

  const receiveAiProposal = (draft: AiPreviewDraft, base?: DashboardEditBase) => {
    if (
      matchesProposalBase(base, { messages: draftMessages, versionId: activeVersion?.id }) &&
      !jsonError &&
      !saveDialogOpen &&
      !pending &&
      !proposal
    ) {
      adoptAiProposal(draft);
      return;
    }
    setProposal({ draft, mode: null });
    setFeedback(null);
  };

  const builder: DashboardBuilderState & DashboardBuilderActions = {
    messages: draftMessages,
    graph: draftGraph,
    rawJson,
    jsonError,
    selectedId,
    canvasMode,
    isDirty,
    canSave: isDirty && !jsonError && !pending,
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
    proposal,
    setProposalMode,
    appliedDraftIds,
    editingDraftId: origin?.proposal?.draftId ?? null,
    handleDataModelChange,
    executeExpenseAction,
    handleAction,
    handleActivateVersion,
    handlePreviewAiVersion,
    adoptAiProposal,
    receiveAiProposal,
    handleDiscardPreview: () => setProposal(null),
  };
}
