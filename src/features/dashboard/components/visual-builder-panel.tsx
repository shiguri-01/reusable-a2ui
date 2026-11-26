import { useState } from "react";
import { useShortcut, useShortcutHint } from "@ui-sdk/react/shortcuts";
import { ChevronDown, Plus } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

function BuilderSectionTrigger({ label }: { label: string }) {
  return (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className="group bg-sidebar hover:bg-sidebar-accent sticky top-0 z-10 flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-xs font-semibold transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=closed]:-rotate-90" />
      </button>
    </CollapsibleTrigger>
  );
}

function isEditableTextTarget(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
}

export function VisualBuilderPanel({ builder, dataModel }: VisualBuilderPanelProps) {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
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
    <div className="divide-y">
      {/* Add Block Button */}
      <div className="px-4 py-3">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="w-full justify-between gap-2"
          onClick={() => builder.openPalette()}
        >
          <span className="flex items-center gap-1.5">
            <Plus className="size-4" />
            ブロックを追加
          </span>
          <kbd className="bg-primary-foreground/15 text-primary-foreground rounded-xs px-1.5 py-0.5 font-sans text-[10px] font-medium">
            {addHint.text}
          </kbd>
        </Button>
      </div>

      {/* Collapsible Section: Selected Block Settings */}
      <Collapsible open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <BuilderSectionTrigger label="プロパティ" />
        <CollapsibleContent className="px-4 pt-1 pb-4">
          {selectedNode ? (
            <ComponentInspector
              key={`${selectedNode.id}:${builder.resetEpoch}`}
              node={selectedNode}
              graph={builder.graph}
              dataModel={dataModel}
              onSelectNode={builder.setSelectedId}
              onUpdateNode={builder.updateNode}
              onMoveRelative={builder.moveNodeRelative}
              onDuplicate={builder.duplicateNode}
              onDelete={builder.deleteNode}
              onRequestAddChild={(parentId) => builder.openPalette(parentId)}
            />
          ) : (
            <p className="text-muted-foreground py-1 text-sm">
              ブロックを選択すると設定を編集できます
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Collapsible Section: Layer Outline */}
      <Collapsible open={layersOpen} onOpenChange={setLayersOpen}>
        <BuilderSectionTrigger label="レイヤー" />
        <CollapsibleContent className="px-2.5 pt-0.5 pb-4">
          <StructureOutline
            graph={builder.graph}
            dataModel={dataModel}
            selectedId={builder.selectedId}
            onSelect={(id) => {
              builder.setSelectedId(id);
              setInspectorOpen(true);
            }}
            onMove={builder.moveNode}
            onDelete={builder.deleteNode}
            onRequestAdd={(parentId) => builder.openPalette(parentId)}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
