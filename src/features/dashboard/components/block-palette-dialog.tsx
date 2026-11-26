import { Fragment, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemIcon,
  CommandItemText,
  CommandList,
  CommandSeparator,
} from "@ui-sdk/react/command";
import { Search } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BlockBlueprint, EditableSurfaceGraph } from "../lib/a2ui-builder";
import { BLOCK_BLUEPRINTS, listContainerOptions } from "../lib/catalog-registry";

const PALETTE_GROUPS = (
  [
    { category: "preset", label: "セット" },
    { category: "layout", label: "レイアウト" },
    { category: "display", label: "表示・集計" },
    { category: "form", label: "入力・操作" },
  ] as const
).map(({ category, label }) => ({
  category,
  label,
  items: BLOCK_BLUEPRINTS.filter((blueprint) => blueprint.category === category),
}));

interface BlockPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graph: EditableSurfaceGraph;
  dataModel: DataModel;
  defaultParentId: string;
  onInsertBlock: (blueprint: BlockBlueprint, parentId: string) => void;
}

export function BlockPaletteDialog({
  open,
  onOpenChange,
  graph,
  dataModel,
  defaultParentId,
  onInsertBlock,
}: BlockPaletteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <BlockPaletteBody
          graph={graph}
          dataModel={dataModel}
          defaultParentId={defaultParentId}
          onInsertBlock={(blueprint, parentId) => {
            onInsertBlock(blueprint, parentId);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function BlockPaletteBody({
  graph,
  dataModel,
  defaultParentId,
  onInsertBlock,
}: {
  graph: EditableSurfaceGraph;
  dataModel: DataModel;
  defaultParentId: string;
  onInsertBlock: (blueprint: BlockBlueprint, parentId: string) => void;
}) {
  const [selectedParentId, setSelectedParentId] = useState(defaultParentId);
  const containerOptions = listContainerOptions(graph, dataModel);
  const targetParentId = graph.componentsById.has(selectedParentId)
    ? selectedParentId
    : graph.rootId;

  const handleAction = (blueprintId: string) => {
    const found = BLOCK_BLUEPRINTS.find((bp) => bp.id === blueprintId);
    if (!found) return;
    onInsertBlock(found, targetParentId);
  };

  return (
    <>
      <DialogHeader className="border-b px-5 py-4">
        <DialogTitle className="pr-6 text-base">ブロックを追加</DialogTitle>
      </DialogHeader>

      <div className="bg-muted/50 flex items-center gap-3 border-b px-5 py-2.5">
        <Label
          htmlFor="palette-target-container"
          className="text-foreground shrink-0 text-sm font-medium"
        >
          追加先
        </Label>
        <Select value={targetParentId} onValueChange={setSelectedParentId}>
          <SelectTrigger
            id="palette-target-container"
            className="bg-background h-9 flex-1 text-sm font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {containerOptions.map((opt) => (
              <SelectItem
                key={opt.id}
                value={opt.id}
                style={{ paddingLeft: `${0.5 + opt.depth * 0.875}rem` }}
                className="text-sm"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span>{opt.label}</span>
                  {opt.typeLabel && <span className="text-muted-foreground">{opt.typeLabel}</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Command
        filter="contains"
        autoHighlight
        loop
        onAction={handleAction}
        className="flex flex-col"
      >
        <div className="flex items-center gap-2.5 border-b px-4 py-3">
          <Search aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
          <CommandInput
            aria-label="ブロックを検索"
            placeholder="名前やキーワードで検索…"
            autoFocus
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-hidden"
          />
        </div>

        <CommandEmpty className="text-muted-foreground hidden py-10 text-center text-sm data-empty:block">
          一致するブロックが見つかりませんでした
        </CommandEmpty>

        <CommandList className="shadcn-scrollbar max-h-[380px] overflow-y-auto p-2">
          {PALETTE_GROUPS.map(({ category, label, items }, groupIndex) => (
            <Fragment key={category}>
              {groupIndex > 0 && <CommandSeparator className="bg-border mx-2 my-2 h-px" />}
              <CommandGroup className="mb-1 last:mb-0">
                <CommandGroupLabel className="text-muted-foreground px-3 py-1.5 text-xs font-medium">
                  {label}
                </CommandGroupLabel>
                <div className="space-y-0.5">
                  {items.map((bp) => {
                    const Icon = bp.icon;
                    return (
                      <CommandItem
                        key={bp.id}
                        value={bp.id}
                        label={bp.label}
                        keywords={[...bp.keywords, bp.description]}
                        className="hover:bg-accent/50 data-highlighted:bg-accent data-highlighted:text-accent-foreground flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors select-none"
                      >
                        <CommandItemIcon className="bg-muted text-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                          <Icon className="size-4" />
                        </CommandItemIcon>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-sm font-medium">
                            <CommandItemText className="[&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-xs">
                              {bp.label}
                            </CommandItemText>
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {bp.description}
                          </p>
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </Fragment>
          ))}
        </CommandList>
      </Command>
    </>
  );
}
