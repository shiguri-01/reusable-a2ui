import { Check, Code2 } from "lucide-react";
import type { UiVersion } from "@schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface VersionHistoryPanelProps {
  uiVersions: UiVersion[];
  activeVersionId: number | undefined;
  pending: boolean;
  onActivateVersion: (versionId: number) => void;
  onSwitchToEditor: () => void;
}

export function VersionHistoryPanel({
  uiVersions,
  activeVersionId,
  pending,
  onActivateVersion,
  onSwitchToEditor,
}: VersionHistoryPanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {uiVersions.map((ver) => {
          const isCurrent = ver.id === activeVersionId;
          return (
            <button
              key={ver.id}
              type="button"
              disabled={pending}
              onClick={() => onActivateVersion(ver.id)}
              className={cn(
                "w-full cursor-pointer rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                isCurrent ? "border-primary bg-primary/5" : "bg-background hover:bg-accent/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{ver.name}</span>
                {isCurrent ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="size-3" />
                    使用中
                  </Badge>
                ) : (
                  <Badge variant="outline">v{ver.version}</Badge>
                )}
              </div>
              {ver.description && (
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {ver.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Separator />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onSwitchToEditor}
      >
        <Code2 className="size-4" />
        現在の JSON をベースに新規作成
      </Button>
    </div>
  );
}
