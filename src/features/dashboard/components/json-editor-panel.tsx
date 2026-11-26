import { useState } from "react";
import { AlertCircle, Check, Copy, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="a2ui-json" className="text-xs font-semibold">
          A2UI JSON
        </Label>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs"
            disabled={Boolean(jsonError)}
            onClick={onFormat}
          >
            <Wand2 className="size-3.5" />
            整形
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs"
            onClick={() => void handleCopy()}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "コピー済" : "コピー"}
          </Button>
        </div>
      </div>

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
        rows={24}
        spellCheck={false}
        className="font-mono text-xs leading-relaxed"
      />
    </div>
  );
}
