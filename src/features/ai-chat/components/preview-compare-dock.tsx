import { Check, Code2, Columns2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CompareMode } from "../types";

interface PreviewCompareDockProps {
  compareMode: CompareMode;
  saving: boolean;
  onChangeCompareMode: (mode: CompareMode) => void;
  onApply: () => void;
  onOpenInEditor: () => void;
  onDiscard: () => void;
}

const compareItemClass =
  "text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-auto rounded-sm px-2 py-1 text-[11px] font-medium first:rounded-sm last:rounded-sm";

export function PreviewCompareDock({
  compareMode,
  saving,
  onChangeCompareMode,
  onApply,
  onOpenInEditor,
  onDiscard,
}: PreviewCompareDockProps) {
  return (
    <div className="bg-muted/40 shrink-0 space-y-2 border-t px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Eye className="text-primary size-3.5 shrink-0" />
          <span className="truncate text-xs font-semibold">プレビュー比較</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="text-muted-foreground hover:text-foreground h-6 gap-0.5 px-1.5 text-[11px]"
        >
          <X className="size-3.5" />
          閉じる
        </Button>
      </div>

      <ToggleGroup
        type="single"
        value={compareMode}
        onValueChange={(value) => {
          if (value) {
            onChangeCompareMode(value as CompareMode);
          }
        }}
        aria-label="プレビュー比較モード"
        className="bg-background grid w-full grid-cols-3 rounded-md border p-0.5"
      >
        <ToggleGroupItem value="preview" className={compareItemClass}>
          新しいUI
        </ToggleGroupItem>
        <ToggleGroupItem value="current" className={compareItemClass}>
          現在のUI
        </ToggleGroupItem>
        <ToggleGroupItem value="split" className={`${compareItemClass} gap-1`}>
          <Columns2 className="size-3" />
          並べて比較
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-7 flex-1 text-xs"
          disabled={saving}
          onClick={onApply}
        >
          <Check className="size-3.5" />
          新しいUIを適用
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          title="JSON編集"
          aria-label="JSON編集"
          onClick={onOpenInEditor}
        >
          <Code2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
