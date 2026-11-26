import { useEffect, useLayoutEffect, useRef } from "react";
import type { UiVersion } from "@schema";
import {
  useAssistantSidebar,
  useSyncAssistantExpenses,
} from "@/features/ai-chat/context/assistant-context";
import type { ExpenseItem } from "@/features/expenses/model";
import { useDashboardController } from "../hooks/use-dashboard-controller";
import { DashboardCanvas } from "./dashboard-canvas";

interface DashboardViewProps {
  expenses: ExpenseItem[];
  uiVersions: UiVersion[];
  activeVersionId: number | null;
}

export function DashboardView({ expenses, uiVersions, activeVersionId }: DashboardViewProps) {
  const controller = useDashboardController({ expenses, uiVersions, activeVersionId });
  const { setDashboardHost, consumePendingPreviewDraft, visiblePanel, openPanel } =
    useAssistantSidebar();
  const controllerRef = useRef(controller);

  // Keep sidebar callbacks tied to the latest committed controller state.
  useLayoutEffect(() => {
    controllerRef.current = controller;
  });

  useSyncAssistantExpenses(expenses);

  useEffect(() => {
    const pendingDraft = consumePendingPreviewDraft();
    if (pendingDraft) {
      controllerRef.current.handlePreviewAiVersion(pendingDraft);
    }
  }, [consumePendingPreviewDraft]);

  useEffect(() => {
    setDashboardHost({
      customizeTab: controller.customizeTab,
      uiVersions,
      activeVersion: controller.activeVersion,
      dataModel: controller.dataModel,
      pending: controller.pending,
      editorDraft: controller.editorDraft,
      preview: {
        draft: controller.previewDraft,
        compareMode: controller.compareMode,
        appliedDraftIds: controller.appliedDraftIds,
        onPreview: (draft) => controllerRef.current.handlePreviewAiVersion(draft),
        onChangeCompareMode: (mode) => controllerRef.current.setCompareMode(mode),
        onDiscard: () => controllerRef.current.handleDiscardPreview(),
        onApply: (draft) => controllerRef.current.handleApplyAiVersion(draft),
        onOpenInEditor: (json, name) => {
          controllerRef.current.handleOpenAiJsonInEditor(json, name);
          openPanel("customize");
        },
      },
      onShowHistory: () => controllerRef.current.setCustomizeTab("history"),
      onSwitchToEditor: () => controllerRef.current.handleSwitchToEditor(),
      onActivateVersion: (id) => void controllerRef.current.handleActivateVersion(id),
      onEditorDraftChange: (patch) => controllerRef.current.updateEditorDraft(patch),
      onSaveNewVersion: () => void controllerRef.current.handleSaveNewVersion(),
      onExpenseAction: (act, form) => controllerRef.current.executeExpenseAction(act, form),
    });
  }, [
    controller.customizeTab,
    controller.activeVersion,
    controller.dataModel,
    controller.pending,
    controller.editorDraft,
    controller.previewDraft,
    controller.compareMode,
    controller.appliedDraftIds,
    uiVersions,
    setDashboardHost,
    openPanel,
  ]);

  useEffect(() => {
    return () => {
      setDashboardHost(null);
    };
  }, [setDashboardHost]);

  return (
    <DashboardCanvas
      activeVersion={controller.activeVersion}
      messages={controller.messages}
      dataModel={controller.dataModel}
      pending={controller.pending}
      feedback={controller.feedback}
      previewDraft={controller.previewDraft}
      compareMode={controller.compareMode}
      isCustomizeOpen={visiblePanel === "customize"}
      onOpenCustomize={() => openPanel("customize")}
      onDataModelChange={controller.handleDataModelChange}
      onAction={(act) => void controller.handleAction(act)}
    />
  );
}
