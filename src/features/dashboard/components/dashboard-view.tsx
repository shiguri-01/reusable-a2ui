import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { UiVersion } from "@schema";
import {
  useAssistantSidebar,
  useSyncAssistantExpenses,
} from "@/features/ai-chat/context/assistant-context";
import type { ExpenseItem } from "@/features/expenses/model";
import {
  useDashboardController,
  type BuilderCanvasMode,
  type CustomizePanelTab,
} from "../hooks/use-dashboard-controller";
import { useDashboardShortcuts } from "../hooks/use-dashboard-shortcuts";
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
    closePanel,
  } = useAssistantSidebar();
  const [editing, setEditing] = useState(false);
  const isEditing = editing || visiblePanel === "customize";

  const controller = useDashboardController({
    expenses,
    uiVersions,
    activeVersionId,
    onSendPromptToAssistant: requestAssistantPrompt,
  });
  const controllerRef = useRef(controller);
  const isReviewingProposal = Boolean(controller.proposal?.mode);
  useDashboardShortcuts(controller.builder, isEditing && !isReviewingProposal);

  useEffect(() => {
    if (visiblePanel === "customize") setEditing(true);
  }, [visiblePanel]);

  // Keep sidebar callbacks tied to the latest committed controller state.
  useLayoutEffect(() => {
    controllerRef.current = controller;
  });

  useSyncAssistantExpenses(expenses);

  useEffect(() => {
    const pendingDraft = consumePendingPreviewDraft();
    if (pendingDraft) {
      controllerRef.current.handlePreviewAiVersion(pendingDraft);
      setEditing(true);
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
      isEditing,
      preview: {
        hasProposal: controller.proposal !== null,
        activePreviewDraftId: controller.proposal?.mode ? controller.proposal.draft.draftId : null,
        appliedDraftIds: controller.appliedDraftIds,
        editingDraftId: controller.editingDraftId,
        onPreview: (draft) => {
          controllerRef.current.handlePreviewAiVersion(draft);
          setEditing(true);
        },
        onReceive: (draft, base) => {
          controllerRef.current.receiveAiProposal(draft, base);
          setEditing(true);
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
    controller.proposal,
    controller.appliedDraftIds,
    controller.editingDraftId,
    isEditing,
    uiVersions,
    setDashboardHost,
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
    setEditing(true);
    openPanel("customize");
  };

  const handleChangeProposalMode = (mode: BuilderCanvasMode) => {
    if (mode === "edit") {
      controller.setProposalMode(null);
      controller.builder.setCanvasMode("edit");
    } else {
      controller.setProposalMode(mode);
    }
  };

  return (
    <>
      <DashboardCanvas
        messages={controller.messages}
        dataModel={controller.dataModel}
        pending={controller.pending}
        feedback={controller.feedback}
        proposal={controller.proposal}
        isEditing={isEditing}
        isAssistantOpen={visiblePanel === "ai"}
        builder={controller.builder}
        onChangeProposalMode={handleChangeProposalMode}
        onCompareProposal={() => controller.setProposalMode("split")}
        onAdoptProposal={() => {
          if (!controller.proposal) return;
          controller.adoptAiProposal(controller.proposal.draft);
          controller.builder.setCanvasMode("edit");
        }}
        onDiscardProposal={controller.handleDiscardPreview}
        onAskAssistant={() => openPanel("ai")}
        onFinishEditing={() => {
          setEditing(false);
          controller.setProposalMode(null);
          if (visiblePanel === "customize") closePanel();
        }}
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
