import { useShortcut } from "@ui-sdk/react/shortcuts";
import type { DashboardBuilderActions, DashboardBuilderState } from "./use-dashboard-controller";

function isEditableTextTarget(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
}

export function useDashboardShortcuts(
  builder: DashboardBuilderState & DashboardBuilderActions,
  enabled: boolean,
) {
  const canUseShortcut = () =>
    enabled && !builder.paletteOpen && !builder.saveDialogOpen && !isEditableTextTarget();
  const selectedId = builder.selectedId;
  const canDelete = () =>
    canUseShortcut() && Boolean(selectedId && selectedId !== builder.graph.rootId);
  const deleteSelection = () => {
    if (selectedId) builder.deleteNode(selectedId);
  };

  useShortcut("mod+k", () => builder.openPalette(), { when: canUseShortcut });
  useShortcut("mod+z", builder.undo, { when: () => canUseShortcut() && builder.canUndo });
  useShortcut("mod+shift+z", builder.redo, { when: () => canUseShortcut() && builder.canRedo });
  useShortcut("escape", () => builder.setSelectedId(null), {
    when: () => canUseShortcut() && selectedId !== null,
  });
  useShortcut("backspace", deleteSelection, { when: canDelete });
  useShortcut("delete", deleteSelection, { when: canDelete });
}
