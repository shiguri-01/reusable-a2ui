import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JsonEditorPanelProps {
  versionName: string;
  versionDesc: string;
  editorJson: string;
  editorError: string | null;
  onVersionNameChange: (value: string) => void;
  onVersionDescChange: (value: string) => void;
  onEditorJsonChange: (value: string) => void;
}

export function JsonEditorPanel({
  versionName,
  versionDesc,
  editorJson,
  editorError,
  onVersionNameChange,
  onVersionDescChange,
  onEditorJsonChange,
}: JsonEditorPanelProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="version-name" className="text-xs">
          新しいバージョン名
        </Label>
        <Input
          id="version-name"
          value={versionName}
          onChange={(e) => onVersionNameChange(e.target.value)}
          placeholder="例：v4：2カラム改善版"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="version-desc" className="text-xs">
          変更メモ
        </Label>
        <Input
          id="version-desc"
          value={versionDesc}
          onChange={(e) => onVersionDescChange(e.target.value)}
          placeholder="どこを改善したか"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="a2ui-json" className="text-xs">
          A2UI Messages JSON
        </Label>
        <Textarea
          id="a2ui-json"
          value={editorJson}
          onChange={(e) => onEditorJsonChange(e.target.value)}
          rows={18}
          className="font-mono text-xs leading-relaxed"
        />
      </div>

      {editorError && <p className="text-destructive text-xs font-medium">{editorError}</p>}
    </div>
  );
}
