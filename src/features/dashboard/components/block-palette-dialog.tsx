import { useEffect, useState } from "react";
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
} from "@ui-sdk/react/command";
import { Plus, Search } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  isContainerComponent,
  type BlockBlueprint,
  type EditableSurfaceGraph,
} from "../lib/a2ui-builder";
import {
  BLOCK_BLUEPRINTS,
  COMPONENT_META,
  summarizeComponent,
  type PaletteBlueprintEntry,
} from "../lib/catalog-registry";

const CATEGORY_LABELS: Record<BlockBlueprint["category"], string> = {
  preset: "すぐ使える複合ブロック（おすすめ）",
  layout: "レイアウト枠・コンテナ",
  display: "表示・分析ウィジェット",
  form: "入力フォーム部品",
};

const CATEGORY_ORDER: BlockBlueprint["category"][] = ["preset", "layout", "display", "form"];

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
  const [targetParentId, setTargetParentId] = useState(defaultParentId);

  useEffect(() => {
    if (open) {
      setTargetParentId(defaultParentId);
    }
  }, [open, defaultParentId]);

  const containers = graph.components.filter(isContainerComponent);

  const grouped = new Map<BlockBlueprint["category"], PaletteBlueprintEntry[]>();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(
      cat,
      BLOCK_BLUEPRINTS.filter((bp) => bp.category === cat),
    );
  }

  const handleAction = (blueprintId: string) => {
    const found = BLOCK_BLUEPRINTS.find((bp) => bp.id === blueprintId);
    if (!found) return;
    onInsertBlock(found, targetParentId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 pt-5 pb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-base">パーツ・ブロックを追加</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                複合ブロックや個別ウィジェットを検索してダッシュボードへ追加できます
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Label
              htmlFor="palette-target-container"
              className="text-muted-foreground shrink-0 text-xs"
            >
              追加先:
            </Label>
            <Select value={targetParentId} onValueChange={setTargetParentId}>
              <SelectTrigger id="palette-target-container" className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {containers.map((container) => {
                  const meta = COMPONENT_META[container.component];
                  const isRoot = container.id === graph.rootId;
                  const summary = summarizeComponent(container, dataModel);
                  return (
                    <SelectItem key={container.id} value={container.id} className="text-xs">
                      {isRoot
                        ? "ページ最上位 (root)"
                        : `${meta.shortLabel} (${container.id}) · ${summary}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <Command
          filter="contains"
          autoHighlight
          loop
          onAction={handleAction}
          className="flex flex-col"
        >
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <CommandInput
              aria-label="追加するパーツを検索"
              placeholder="キーワードで検索（例：KPI、予算、フォーム、2カラム、リスト...）"
              autoFocus
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-hidden"
            />
          </div>

          <CommandList className="shadcn-scrollbar max-h-[380px] overflow-y-auto p-2">
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped.get(cat) ?? [];
              return (
                <CommandGroup key={cat} className="mb-2 last:mb-0">
                  <CommandGroupLabel className="text-muted-foreground px-2.5 py-1.5 text-[11px] font-semibold">
                    {CATEGORY_LABELS[cat]}
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
                          className={(state) =>
                            cn(
                              "flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors select-none",
                              state.highlighted
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50",
                            )
                          }
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <CommandItemIcon className="bg-primary/10 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
                              <Icon className="size-3.5" />
                            </CommandItemIcon>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                <CommandItemText className="[&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded-xs">
                                  {bp.label}
                                </CommandItemText>
                                {bp.category === "preset" && (
                                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                    セット
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-[11px] leading-snug">
                                {bp.description}
                              </p>
                            </div>
                          </div>
                          <span className="text-muted-foreground mt-1 flex shrink-0 items-center gap-0.5 text-[11px]">
                            <Plus className="size-3.5" />
                            追加
                          </span>
                        </CommandItem>
                      );
                    })}
                  </div>
                </CommandGroup>
              );
            })}
          </CommandList>

          <CommandEmpty className="text-muted-foreground py-10 text-center text-xs">
            一致するパーツが見つかりませんでした。別のキーワードをお試しください。
          </CommandEmpty>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
