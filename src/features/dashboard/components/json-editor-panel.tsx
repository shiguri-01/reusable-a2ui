import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EditorDraft } from "../hooks/use-dashboard-controller";

interface JsonEditorPanelProps {
  draft: EditorDraft;
  onChange: (patch: Partial<EditorDraft>) => void;
}

export function JsonEditorPanel({ draft, onChange }: JsonEditorPanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="version-name" className="text-xs">
          新しいバージョン名
        </Label>
        <Input
          id="version-name"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="例：v4：2カラム改善版"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="version-desc" className="text-xs">
          変更メモ
        </Label>
        <Input
          id="version-desc"
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="どこを改善したか"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a2ui-json" className="text-xs">
          A2UI Messages JSON
        </Label>
        <Textarea
          id="a2ui-json"
          value={draft.json}
          onChange={(e) => onChange({ json: e.target.value })}
          rows={18}
          className="font-mono text-xs leading-relaxed"
        />
      </div>

      {draft.error && <p className="text-destructive text-xs font-medium">{draft.error}</p>}
    </div>
  );
}
