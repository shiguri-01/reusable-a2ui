import { Check, Code2, Columns2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompareMode } from "../types";

interface PreviewCompareDockProps {
  compareMode: CompareMode;
  saving: boolean;
  onChangeCompareMode: (mode: CompareMode) => void;
  onApply: () => void;
  onOpenInEditor: () => void;
  onDiscard: () => void;
}

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
        <button
          type="button"
          onClick={onDiscard}
          className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-0.5 text-[11px]"
        >
          <X className="size-3.5" />
          閉じる
        </button>
      </div>

      <div className="bg-background grid grid-cols-3 rounded-md border p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => onChangeCompareMode("preview")}
          className={cn(
            "cursor-pointer rounded-sm px-2 py-1 font-medium transition-colors",
            compareMode === "preview"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          新しいUI
        </button>
        <button
          type="button"
          onClick={() => onChangeCompareMode("current")}
          className={cn(
            "cursor-pointer rounded-sm px-2 py-1 font-medium transition-colors",
            compareMode === "current"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          現在のUI
        </button>
        <button
          type="button"
          onClick={() => onChangeCompareMode("split")}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center gap-1 rounded-sm px-2 py-1 font-medium transition-colors",
            compareMode === "split"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Columns2 className="size-3" />
          並べて比較
        </button>
      </div>

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
