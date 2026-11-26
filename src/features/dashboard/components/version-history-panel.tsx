import { Check, CopyPlus, Sparkles } from "lucide-react";
import type { UiVersion } from "@schema";
import { PRESET_UI_VERSIONS } from "@/features/a2ui/presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createEmptyDashboardMessages } from "../lib/a2ui-builder";

interface VersionHistoryPanelProps {
  uiVersions: UiVersion[];
  activeVersionId: number | undefined;
  pending: boolean;
  onActivateVersion: (versionId: number) => void;
  onLoadIntoBuilder: (messagesJson: string, label?: string) => void;
}

export function VersionHistoryPanel({
  uiVersions,
  activeVersionId,
  pending,
  onActivateVersion,
  onLoadIntoBuilder,
}: VersionHistoryPanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-muted-foreground px-0.5 text-[11px] font-semibold">
          保存済みバージョン ({uiVersions.length})
        </div>
        {uiVersions.map((ver) => {
          const isCurrent = ver.id === activeVersionId;
          return (
            <div
              key={ver.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                isCurrent ? "border-primary bg-primary/5" : "bg-background hover:bg-accent/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  disabled={pending || isCurrent}
                  onClick={() => onActivateVersion(ver.id)}
                  className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{ver.name}</span>
                  </div>
                  {ver.description && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {ver.description}
                    </p>
                  )}
                </button>

                {isCurrent ? (
                  <Badge variant="default" className="shrink-0 gap-1">
                    <Check className="size-3" />
                    使用中
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    v{ver.version}
                  </Badge>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-end gap-1.5">
                {!isCurrent && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={pending}
                    onClick={() => onActivateVersion(ver.id)}
                  >
                    このバージョンに切替
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-xs"
                  disabled={pending}
                  onClick={() => onLoadIntoBuilder(ver.messagesJson, ver.name)}
                >
                  <CopyPlus className="size-3.5" />
                  ベースにして編集
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-1.5 px-0.5 text-[11px] font-semibold">
          <Sparkles className="size-3.5" />
          テンプレートから新しく組む
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto justify-start px-3 py-2 text-left text-xs"
            onClick={() =>
              onLoadIntoBuilder(
                JSON.stringify(createEmptyDashboardMessages(), null, 2),
                "白紙キャンバス",
              )
            }
          >
            <div>
              <div className="font-semibold">白紙から自由に作成</div>
              <div className="text-muted-foreground text-[11px] font-normal">
                空のページにお好みのブロックを1つずつ追加します
              </div>
            </div>
          </Button>
          {PRESET_UI_VERSIONS.map((preset) => (
            <Button
              key={preset.version}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto justify-start px-3 py-2 text-left text-xs"
              onClick={() =>
                onLoadIntoBuilder(JSON.stringify(preset.messages, null, 2), preset.name)
              }
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{preset.name} テンプレート</div>
                <div className="text-muted-foreground line-clamp-1 text-[11px] font-normal">
                  {preset.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
