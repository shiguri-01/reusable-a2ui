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

  useShortcut(enabled ? "mod+k" : null, () => builder.openPalette(), {
    when: canUseShortcut,
    description: "ブロックを追加",
  });
  useShortcut(enabled ? "mod+z" : null, builder.undo, {
    when: () => canUseShortcut() && builder.canUndo,
    description: "元に戻す",
  });
  useShortcut(enabled ? "mod+shift+z" : null, builder.redo, {
    when: () => canUseShortcut() && builder.canRedo,
    description: "やり直す",
  });
  useShortcut(enabled ? "escape" : null, () => builder.setSelectedId(null), {
    when: () => canUseShortcut() && selectedId !== null,
    description: "ブロックの選択を解除",
  });
  useShortcut(enabled ? "backspace" : null, deleteSelection, {
    when: canDelete,
    description: "選択中のブロックを削除",
  });
  useShortcut(enabled ? "delete" : null, deleteSelection, {
    when: canDelete,
    description: "選択中のブロックを削除",
  });
}
