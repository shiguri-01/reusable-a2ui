import { useShortcut, useShortcutHint } from "@ui-sdk/react/shortcuts";
import { Layers, MousePointerClick, Plus } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import { Button } from "@/components/ui/button";
import type {
  DashboardBuilderActions,
  DashboardBuilderState,
} from "../hooks/use-dashboard-controller";
import { ComponentInspector } from "./component-inspector-form";
import { StructureOutline } from "./structure-outline";

interface VisualBuilderPanelProps {
  builder: DashboardBuilderState & DashboardBuilderActions;
  dataModel: DataModel;
}

function isEditableTextTarget(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
}

export function VisualBuilderPanel({ builder, dataModel }: VisualBuilderPanelProps) {
  const addHint = useShortcutHint("mod+k");

  useShortcut("mod+k", () => {
    builder.openPalette();
  });

  useShortcut(
    "mod+z",
    () => {
      builder.undo();
    },
    {
      when: () => builder.canUndo && !isEditableTextTarget(),
    },
  );

  useShortcut(
    "mod+shift+z",
    () => {
      builder.redo();
    },
    {
      when: () => builder.canRedo && !isEditableTextTarget(),
    },
  );

  useShortcut(
    "escape",
    () => {
      builder.setSelectedId(null);
    },
    {
      when: () => builder.selectedId !== null && !builder.paletteOpen && !builder.saveDialogOpen,
    },
  );

  useShortcut(
    "backspace",
    () => {
      if (builder.selectedId && builder.selectedId !== builder.graph.rootId) {
        builder.deleteNode(builder.selectedId);
      }
    },
    {
      when: () => Boolean(builder.selectedId && builder.selectedId !== builder.graph.rootId),
    },
  );

  useShortcut(
    "delete",
    () => {
      if (builder.selectedId && builder.selectedId !== builder.graph.rootId) {
        builder.deleteNode(builder.selectedId);
      }
    },
    {
      when: () => Boolean(builder.selectedId && builder.selectedId !== builder.graph.rootId),
    },
  );

  const selectedNode = builder.selectedId
    ? builder.graph.componentsById.get(builder.selectedId)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Primary Add Block CTA */}
      <Button
        type="button"
        variant="default"
        size="sm"
        className="w-full justify-between gap-2"
        onClick={() => builder.openPalette()}
      >
        <span className="flex items-center gap-1.5">
          <Plus className="size-4" />
          パーツ・複合ブロックを追加
        </span>
        <kbd className="bg-primary-foreground/15 text-primary-foreground rounded-xs px-1.5 py-0.5 font-sans text-[10px] font-medium">
          {addHint.text}
        </kbd>
      </Button>

      {/* Selected Component Inspector */}
      {selectedNode ? (
        <ComponentInspector
          key={`${selectedNode.id}:${builder.resetEpoch}`}
          node={selectedNode}
          graph={builder.graph}
          dataModel={dataModel}
          onSelectNode={builder.setSelectedId}
          onUpdateNode={builder.updateNode}
          onMoveToContainer={(nodeId, targetParentId) => builder.moveNode(nodeId, targetParentId)}
          onMoveRelative={builder.moveNodeRelative}
          onDuplicate={builder.duplicateNode}
          onDelete={builder.deleteNode}
          onRequestAddChild={(parentId) => builder.openPalette(parentId)}
        />
      ) : (
        <div className="bg-muted/35 text-muted-foreground flex items-start gap-2.5 rounded-xl border border-dashed px-3 py-2.5 text-xs">
          <MousePointerClick className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="leading-relaxed">
            左のキャンバスまたは下の構成ツリーからパーツをクリックすると、見出し・データ連携・カラム数などを編集できます。ドラッグで並び替えも可能です。
          </div>
        </div>
      )}

      {/* Hierarchical Layer Outline */}
      <div className="space-y-1.5">
        <div className="text-muted-foreground flex items-center justify-between px-0.5 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5" />
            レイヤー構成（ドラッグで並び替え）
          </span>
          <span>{builder.graph.components.length - 1} パーツ</span>
        </div>

        <div className="bg-card rounded-xl border p-2">
          <StructureOutline
            graph={builder.graph}
            dataModel={dataModel}
            selectedId={builder.selectedId}
            onSelect={(id) => builder.setSelectedId(id)}
            onMove={builder.moveNode}
            onDelete={builder.deleteNode}
            onRequestAdd={(parentId) => builder.openPalette(parentId)}
          />
        </div>
      </div>
    </div>
  );
}
