import { useMemo, useState } from "react";
import { a2uiMessagesSchema, type A2UIComponent, type A2UIMessage } from "@/features/a2ui/types";
import type { AiPreviewDraft } from "@/features/ai-chat/types";
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

export type BuilderCanvasMode = "edit" | "preview" | "split";

export interface DraftOrigin {
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

export function useDashboardDraft({
  activeVersionId,
  activeMessagesJson,
}: {
  activeVersionId: number | undefined;
  activeMessagesJson: string | undefined;
}) {
  const activeMessages = useMemo(
    () => parseMessages(activeMessagesJson ?? "[]"),
    [activeMessagesJson],
  );
  const canonicalActiveJson = useMemo(
    () => JSON.stringify(activeMessages, null, 2),
    [activeMessages],
  );

  const [canvasMode, setCanvasMode] = useState<BuilderCanvasMode>("edit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTargetParentId, setPaletteTargetParentId] = useState<string>("root");

  const [syncedVersionId, setSyncedVersionId] = useState<number | undefined>(activeVersionId);
  const [history, setHistory] = useState<DraftHistoryState>(() => ({
    past: [],
    present: { messages: activeMessages },
    future: [],
    resetEpoch: 0,
  }));
  const [rawJson, setRawJson] = useState<string>(() => canonicalActiveJson);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync builder baseline whenever the active version ID changes externally (e.g. version switch or save).
  if (activeVersionId !== syncedVersionId) {
    setSyncedVersionId(activeVersionId);
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

  const draftMessages = history.present.messages;
  const draftGraph: EditableSurfaceGraph = useMemo(
    () => extractEditableSurface(draftMessages),
    [draftMessages],
  );
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
        JSON.stringify(prev.present.messages, null, 2) === nextJson
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
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
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
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
    if (duplicatedId) {
      setSelectedId(duplicatedId);
    }
  };

  const deleteNode = (nodeId: string) => {
    const nextMessages = removeComponent(draftMessages, nodeId);
    commitBuilderMessages(nextMessages, { bumpEpoch: true });
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

  return {
    activeMessages,
    draftMessages,
    draftGraph,
    canonicalDraftJson,
    rawJson,
    jsonError,
    selectedId,
    setSelectedId,
    canvasMode,
    setCanvasMode,
    isDirty,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    resetEpoch: history.resetEpoch,
    origin: history.present.origin,
    paletteOpen,
    setPaletteOpen,
    paletteTargetParentId,
    commitBuilderMessages,
    undo,
    redo,
    resetDraft,
    openPalette,
    insertBlock,
    updateNode,
    moveNode,
    moveNodeRelative,
    duplicateNode,
    deleteNode,
    updateRawJson,
    formatRawJson,
  };
}
