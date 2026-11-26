import type { UiVersion } from "@schema";
import type { ExpenseItem } from "@/features/expenses/model";
import { useDashboardController } from "../hooks/use-dashboard-controller";
import { DashboardCanvas } from "./dashboard-canvas";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardViewProps {
  expenses: ExpenseItem[];
  uiVersions: UiVersion[];
  activeVersionId: number | null;
}

export function DashboardView({ expenses, uiVersions, activeVersionId }: DashboardViewProps) {
  const controller = useDashboardController({ expenses, uiVersions, activeVersionId });

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
        onDataModelChange={controller.handleDataModelChange}
        onAction={(act) => void controller.handleAction(act)}
      />

      <DashboardSidebar
        panelTab={controller.panelTab}
        uiVersions={uiVersions}
        activeVersion={controller.activeVersion}
        dataModel={controller.dataModel}
        pending={controller.pending}
        editorDraft={controller.editorDraft}
        preview={{
          draft: controller.previewDraft,
          compareMode: controller.compareMode,
          appliedDraftIds: controller.appliedDraftIds,
          onPreview: controller.handlePreviewAiVersion,
          onChangeCompareMode: controller.setCompareMode,
          onDiscard: controller.handleDiscardPreview,
          onApply: controller.handleApplyAiVersion,
          onOpenInEditor: controller.handleOpenAiJsonInEditor,
        }}
        onSelectTab={controller.setPanelTab}
        onSwitchToEditor={controller.handleSwitchToEditor}
        onActivateVersion={(id) => void controller.handleActivateVersion(id)}
        onEditorDraftChange={controller.updateEditorDraft}
        onSaveNewVersion={() => void controller.handleSaveNewVersion()}
        onDataMutated={controller.handleDataMutated}
        onExpenseAction={controller.executeExpenseAction}
      />
    </>
  );
}
