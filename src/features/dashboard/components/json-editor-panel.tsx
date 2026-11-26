import { useState } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JsonEditorPanelProps {
  rawJson: string;
  jsonError: string | null;
  onChange: (nextJson: string) => void;
  onFormat: () => void;
}

export function JsonEditorPanel({ rawJson, jsonError, onChange, onFormat }: JsonEditorPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures in restricted environments.
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="a2ui-json" className="text-xs font-semibold">
            A2UI v0.9 JSON
          </Label>
          {jsonError ? (
            <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[10px]">
              <AlertCircle className="size-3" />
              構文エラー
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
              ビルダーと同期中
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={Boolean(jsonError)}
            onClick={onFormat}
          >
            <Wand2 className="size-3" />
            整形
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => void handleCopy()}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "コピー済" : "コピー"}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        ビジュアルビルダーでの変更は自動的にここへ反映されます。JSONを直接書き換えてもリアルタイムでプレビューされます。
      </p>

      {jsonError && (
        <Alert
          variant="destructive"
          className="bg-destructive/10 border-destructive/20 px-3 py-2 text-xs"
        >
          <AlertCircle />
          <AlertDescription className="text-xs leading-relaxed">{jsonError}</AlertDescription>
        </Alert>
      )}

      <Textarea
        id="a2ui-json"
        value={rawJson}
        onChange={(e) => onChange(e.target.value)}
        rows={22}
        spellCheck={false}
        className="font-mono text-xs leading-relaxed"
      />
    </div>
  );
}
