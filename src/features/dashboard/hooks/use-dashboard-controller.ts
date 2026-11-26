import { useMemo, useState } from "react";
import { action } from "@void/react";
import type { UiVersion } from "@schema";
import { getByPath, type DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction, A2UIComponent, A2UIMessage } from "@/features/a2ui/types";
import type { AiPreviewDraft, DashboardEditBase } from "@/features/ai-chat/types";
import { runExpenseA2UIAction, type ExpenseActionResult } from "@/features/expenses/actions";
import {
  ALL_CATEGORY_LABEL,
  buildExpenseDataModel,
  createInitialExpenseForm,
  type ExpenseItem,
} from "@/features/expenses/model";
import {
  extractEditableSurface,
  parseAndValidateDashboardJson,
  type BlockBlueprint,
  type EditableSurfaceGraph,
} from "../lib/a2ui-builder";
import { matchesProposalBase, type DashboardProposal } from "../lib/ai-proposal";
import { useDashboardDraft, type BuilderCanvasMode } from "./use-dashboard-draft";

export type { BuilderCanvasMode } from "./use-dashboard-draft";

export interface DashboardFeedback {
  type: "error" | "success";
  message: string;
}

export type CustomizePanelTab = "builder" | "json" | "history";

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
  const activeVersion = uiVersions.find((v) => v.id === activeVersionId) ?? uiVersions.at(-1);

  const draft = useDashboardDraft({
    activeVersionId: activeVersion?.id,
    activeMessagesJson: activeVersion?.messagesJson,
  });

  const [formState, setFormState] = useState<Record<string, unknown>>(() =>
    createInitialExpenseForm(),
  );
  const [filterState, setFilterState] = useState<Record<string, unknown>>({
    category: ALL_CATEGORY_LABEL,
  });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<DashboardFeedback | null>(null);

  const [customizeTab, setCustomizeTab] = useState<CustomizePanelTab>("builder");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveServerError, setSaveServerError] = useState<string | null>(null);

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

  const loadFromMessagesJson = (messagesJson: string, baseLabel?: string) => {
    const validated = parseAndValidateDashboardJson(messagesJson);
    if (!validated.ok) {
      setFeedback({ type: "error", message: validated.error });
      return;
    }
    draft.commitBuilderMessages(validated.messages, {
      bumpEpoch: true,
      origin: baseLabel ? { label: baseLabel } : null,
    });
    draft.setSelectedId(null);
    setProposal(null);
    draft.setCanvasMode("edit");
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
  const { origin } = draft;
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
    if (draft.jsonError) {
      setSaveServerError(draft.jsonError);
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
          messagesJson: draft.canonicalDraftJson,
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

  const handlePreviewAiVersion = (previewDraft: AiPreviewDraft) => {
    setProposal({ draft: previewDraft, mode: "split" });
  };

  const setProposalMode = (mode: DashboardProposal["mode"]) => {
    setProposal((prev) => (prev && prev.mode !== mode ? { ...prev, mode } : prev));
  };

  const adoptAiProposal = (proposalDraft: AiPreviewDraft) => {
    draft.commitBuilderMessages(proposalDraft.messages, {
      bumpEpoch: true,
      origin: {
        label: proposalDraft.name,
        proposal: { draftId: proposalDraft.draftId, description: proposalDraft.description },
      },
    });
    setProposal(null);
    draft.setSelectedId(
      draft.selectedId &&
        extractEditableSurface(proposalDraft.messages).componentsById.has(draft.selectedId)
        ? draft.selectedId
        : null,
    );
    setFeedback(null);
  };

  const receiveAiProposal = (proposalDraft: AiPreviewDraft, base?: DashboardEditBase) => {
    if (
      matchesProposalBase(base, {
        messages: draft.draftMessages,
        versionId: activeVersion?.id,
      }) &&
      !draft.jsonError &&
      !saveDialogOpen &&
      !pending &&
      !proposal
    ) {
      adoptAiProposal(proposalDraft);
      return;
    }
    setProposal({ draft: proposalDraft, mode: null });
    setFeedback(null);
  };

  const builder: DashboardBuilderState & DashboardBuilderActions = {
    messages: draft.draftMessages,
    graph: draft.draftGraph,
    rawJson: draft.rawJson,
    jsonError: draft.jsonError,
    selectedId: draft.selectedId,
    canvasMode: draft.canvasMode,
    isDirty: draft.isDirty,
    canSave: draft.isDirty && !draft.jsonError && !pending,
    canUndo: draft.canUndo,
    canRedo: draft.canRedo,
    resetEpoch: draft.resetEpoch,
    paletteOpen: draft.paletteOpen,
    paletteTargetParentId: draft.paletteTargetParentId,
    saveDialogOpen,
    saveServerError,
    suggestedVersionName,
    suggestedDescription,
    setSelectedId: draft.setSelectedId,
    setCanvasMode: draft.setCanvasMode,
    undo: draft.undo,
    redo: draft.redo,
    resetDraft: draft.resetDraft,
    openPalette: draft.openPalette,
    setPaletteOpen: draft.setPaletteOpen,
    insertBlock: draft.insertBlock,
    updateNode: draft.updateNode,
    moveNode: draft.moveNode,
    moveNodeRelative: draft.moveNodeRelative,
    duplicateNode: draft.duplicateNode,
    deleteNode: draft.deleteNode,
    updateRawJson: draft.updateRawJson,
    formatRawJson: draft.formatRawJson,
    loadFromMessagesJson,
    setSaveDialogOpen: (open) => {
      if (open) setSaveServerError(null);
      setSaveDialogOpen(open);
    },
    saveAsNewVersion,
  };

  return {
    activeVersion,
    messages: draft.activeMessages,
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
