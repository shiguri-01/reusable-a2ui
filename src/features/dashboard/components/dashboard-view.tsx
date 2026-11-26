import { useEffect, useLayoutEffect, useRef } from "react";
import type { UiVersion } from "@schema";
import {
  useAssistantSidebar,
  useSyncAssistantExpenses,
} from "@/features/ai-chat/context/assistant-context";
import type { ExpenseItem } from "@/features/expenses/model";
import { useDashboardController, type CustomizePanelTab } from "../hooks/use-dashboard-controller";
import { BlockPaletteDialog } from "./block-palette-dialog";
import { DashboardCanvas } from "./dashboard-canvas";
import { SaveVersionDialog } from "./save-version-dialog";

interface DashboardViewProps {
  expenses: ExpenseItem[];
  uiVersions: UiVersion[];
  activeVersionId: number | null;
}

export function DashboardView({ expenses, uiVersions, activeVersionId }: DashboardViewProps) {
  const {
    setDashboardHost,
    consumePendingPreviewDraft,
    requestAssistantPrompt,
    visiblePanel,
    openPanel,
  } = useAssistantSidebar();

  const controller = useDashboardController({
    expenses,
    uiVersions,
    activeVersionId,
    onSendPromptToAssistant: requestAssistantPrompt,
  });
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
      onChangeCustomizeTab: (tab) => controllerRef.current.setCustomizeTab(tab),
      uiVersions,
      activeVersion: controller.activeVersion,
      dataModel: controller.dataModel,
      pending: controller.pending,
      builder: controller.builder,
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
      onActivateVersion: (id) => void controllerRef.current.handleActivateVersion(id),
      onExpenseAction: (act, form) => controllerRef.current.executeExpenseAction(act, form),
    });
  }, [
    controller.customizeTab,
    controller.activeVersion,
    controller.dataModel,
    controller.pending,
    controller.builder,
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

  const handleOpenCustomize = (tab?: CustomizePanelTab) => {
    if (tab) {
      controller.setCustomizeTab(tab);
    }
    openPanel("customize");
  };

  return (
    <>
      <DashboardCanvas
        activeVersion={controller.activeVersion}
        messages={controller.messages}
        dataModel={controller.dataModel}
        pending={controller.pending}
        feedback={controller.feedback}
        previewDraft={controller.previewDraft}
        compareMode={controller.compareMode}
        isCustomizeOpen={visiblePanel === "customize"}
        customizeTab={controller.customizeTab}
        builder={controller.builder}
        onOpenCustomize={handleOpenCustomize}
        onDataModelChange={controller.handleDataModelChange}
        onAction={(act) => void controller.handleAction(act)}
      />

      <BlockPaletteDialog
        open={controller.builder.paletteOpen}
        onOpenChange={controller.builder.setPaletteOpen}
        graph={controller.builder.graph}
        dataModel={controller.dataModel}
        defaultParentId={controller.builder.paletteTargetParentId}
        onInsertBlock={(blueprint, parentId) => controller.builder.insertBlock(blueprint, parentId)}
      />

      <SaveVersionDialog
        open={controller.builder.saveDialogOpen}
        onOpenChange={controller.builder.setSaveDialogOpen}
        defaultName={controller.builder.suggestedVersionName}
        defaultDescription={controller.builder.suggestedDescription}
        pending={controller.pending}
        serverError={controller.builder.saveServerError}
        onSubmit={controller.builder.saveAsNewVersion}
      />
    </>
  );
}
