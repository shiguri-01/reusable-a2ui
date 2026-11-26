import { useState } from "react";
import { Bot, ChevronDown } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  DashboardBuilderActions,
  DashboardBuilderState,
} from "../hooks/use-dashboard-controller";
import { AddBlockButton } from "./builder-controls";
import { ComponentInspector } from "./component-inspector-form";
import { StructureOutline } from "./structure-outline";

interface VisualBuilderPanelProps {
  builder: DashboardBuilderState & DashboardBuilderActions;
  dataModel: DataModel;
  onAskAssistant: () => void;
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

export function VisualBuilderPanel({
  builder,
  dataModel,
  onAskAssistant,
}: VisualBuilderPanelProps) {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);

  const selectedNode = builder.selectedId
    ? builder.graph.componentsById.get(builder.selectedId)
    : undefined;

  return (
    <div className="divide-y">
      <div className="px-4 py-3 md:hidden">
        <AddBlockButton className="w-full" onClick={() => builder.openPalette()} />
      </div>

      {/* Collapsible Section: Selected Block Settings */}
      <Collapsible open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <BuilderSectionTrigger label="プロパティ" />
        <CollapsibleContent className="px-4 pt-1 pb-4">
          {selectedNode ? (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onAskAssistant}
              >
                <Bot className="size-3.5" />
                このブロックの変更をAIに頼む
              </Button>
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
            </div>
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
