import { useId, type ReactNode } from "react";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import { useShortcutHint } from "@ui-sdk/react/shortcuts";
import { Plus, Redo2, Save, Undo2 } from "lucide-react";
import { getByPath, toPrimitiveString, type DataModel } from "@/features/a2ui/data-model";
import type { BoundValue } from "@/features/a2ui/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  BuilderCanvasMode,
  DashboardBuilderActions,
  DashboardBuilderState,
} from "../hooks/use-dashboard-controller";
import {
  NUMBER_BINDING_OPTIONS,
  STRING_BINDING_OPTIONS,
  type DataBindingOption,
} from "../lib/catalog-registry";

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

interface BuilderSegmentedControlProps<T extends string = string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "xs";
}

export function BuilderSegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  size = "sm",
}: BuilderSegmentedControlProps<T>) {
  return (
    <SegmentedControl
      value={value}
      aria-label={ariaLabel}
      onValueChange={(next) => {
        if (!next) return;
        const option = options.find((opt) => opt.value === next);
        if (option) onChange(option.value);
      }}
      className={cn(
        "bg-muted relative isolate inline-grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-lg p-0.5",
        className,
      )}
    >
      <SegmentedControlIndicator className="bg-background pointer-events-none absolute top-(--segmented-control-indicator-top) left-(--segmented-control-indicator-left) -z-10 h-(--segmented-control-indicator-height) w-(--segmented-control-indicator-width) rounded-md shadow-xs transition-[top,left,width,height] duration-150 motion-reduce:transition-none data-[activation-direction=none]:transition-none" />
      {options.map((opt) => (
        <SegmentedControlItem
          key={opt.value}
          value={opt.value}
          title={opt.title}
          className={cn(
            "text-muted-foreground hover:text-foreground data-checked:text-foreground focus-visible:ring-ring/50 inline-flex min-w-0 cursor-pointer items-center justify-center rounded-md text-xs font-medium outline-none transition-colors focus-visible:ring-2",
            size === "xs" ? "px-2 py-1" : "px-2.5 py-1.5",
          )}
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

export function CanvasModeControl({
  value,
  onChange,
  className,
}: {
  value: BuilderCanvasMode;
  onChange: (mode: BuilderCanvasMode) => void;
  className?: string;
}) {
  return (
    <BuilderSegmentedControl
      size="xs"
      value={value}
      ariaLabel="表示モード"
      options={[
        { value: "edit", label: "編集" },
        { value: "preview", label: "プレビュー" },
        { value: "split", label: "並べて比較" },
      ]}
      onChange={onChange}
      className={className}
    />
  );
}

export function AddBlockButton({
  onClick,
  className,
  compact = false,
}: {
  onClick: () => void;
  className?: string;
  compact?: boolean;
}) {
  const hint = useShortcutHint("mod+k");

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("justify-start", className)}
      title={`ブロックを追加（${hint.text}）`}
      aria-keyshortcuts={hint.ariaKeyshortcuts}
      onClick={onClick}
    >
      <Plus className="size-4" />
      <span className={cn(compact && "@max-[26rem]:sr-only")}>ブロックを追加</span>
      {!compact && (
        <kbd
          aria-hidden="true"
          className="bg-muted text-muted-foreground ml-auto rounded-xs px-1.5 py-0.5 font-sans text-[10px] font-medium"
        >
          {hint.text}
        </kbd>
      )}
    </Button>
  );
}

export function UndoRedoButtons({
  builder,
}: {
  builder: Pick<DashboardBuilderState, "canUndo" | "canRedo"> &
    Pick<DashboardBuilderActions, "undo" | "redo">;
}) {
  const undoHint = useShortcutHint("mod+z");
  const redoHint = useShortcutHint("mod+shift+z");

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!builder.canUndo}
        title={`元に戻す（${undoHint.text}）`}
        aria-label="元に戻す"
        aria-keyshortcuts={undoHint.ariaKeyshortcuts}
        onClick={builder.undo}
      >
        <Undo2 className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!builder.canRedo}
        title={`やり直す（${redoHint.text}）`}
        aria-label="やり直す"
        aria-keyshortcuts={redoHint.ariaKeyshortcuts}
        onClick={builder.redo}
      >
        <Redo2 className="size-3.5" />
      </Button>
    </>
  );
}

export function SaveVersionButton({
  disabled,
  onClick,
  className,
}: {
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button type="button" size="sm" className={className} disabled={disabled} onClick={onClick}>
      <Save className="size-4" />
      保存
    </Button>
  );
}

interface BuilderSwitchRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function BuilderSwitchRow({ label, checked, onCheckedChange }: BuilderSwitchRowProps) {
  const switchId = useId();
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label htmlFor={switchId} className="min-w-0 cursor-pointer text-xs font-medium">
        {label}
      </Label>
      <Switch id={switchId} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function BindingPathSelect({
  id,
  value,
  options,
  dataModel,
  onChange,
}: {
  id: string;
  value: string;
  options: DataBindingOption[];
  dataModel: DataModel;
  onChange: (path: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-9 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from(
          Map.groupBy(options, (opt) => opt.group),
          ([group, fields]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {fields.map(({ path, label }) => {
                const previewText = toPrimitiveString(getByPath(dataModel, path));
                return (
                  <SelectItem key={path} value={path} className="text-xs">
                    <span>{label}</span>
                    {previewText !== "" && (
                      <span className="text-muted-foreground ml-1">（{previewText}）</span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ),
        )}
      </SelectContent>
    </Select>
  );
}

function isBoundPath<T>(val: BoundValue<T> | undefined): val is { "@path": string } {
  return typeof val === "object" && val !== null && "@path" in val;
}

interface BoundStringControlProps {
  label: string;
  value: BoundValue<string> | undefined;
  dataModel: DataModel;
  placeholder?: string;
  allowEmpty?: boolean;
  onChange: (next: BoundValue<string> | undefined) => void;
}

export function BoundStringControl({
  label,
  value,
  dataModel,
  placeholder,
  allowEmpty = false,
  onChange,
}: BoundStringControlProps) {
  const mode: "literal" | "path" = isBoundPath(value) ? "path" : "literal";
  const currentPath = isBoundPath(value) ? value["@path"] : STRING_BINDING_OPTIONS[0]!.path;
  const currentLiteral = typeof value === "string" ? value : "";
  const fieldId = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={fieldId} className="text-xs">
          {label}
        </Label>
        <div className="w-36">
          <BuilderSegmentedControl
            size="xs"
            value={mode}
            ariaLabel={`${label}の入力方式`}
            options={[
              { value: "literal", label: "テキスト" },
              { value: "path", label: "データ連携" },
            ]}
            onChange={(nextMode) => {
              if (nextMode === "path") {
                onChange({ "@path": currentPath });
              } else {
                const resolved = isBoundPath(value)
                  ? toPrimitiveString(getByPath(dataModel, value["@path"]))
                  : currentLiteral;
                onChange(allowEmpty && !resolved ? undefined : resolved);
              }
            }}
          />
        </div>
      </div>

      {mode === "path" ? (
        <BindingPathSelect
          id={fieldId}
          value={currentPath}
          options={STRING_BINDING_OPTIONS}
          dataModel={dataModel}
          onChange={(path) => onChange({ "@path": path })}
        />
      ) : (
        <Input
          id={fieldId}
          value={currentLiteral}
          placeholder={placeholder}
          className="h-9 text-xs"
          onChange={(e) => {
            const next = e.target.value;
            onChange(allowEmpty && next === "" ? undefined : next);
          }}
        />
      )}
    </div>
  );
}

interface BoundNumberControlProps {
  label: string;
  value: BoundValue<number> | undefined;
  dataModel: DataModel;
  fallbackNumber?: number;
  onChange: (next: BoundValue<number>) => void;
}

export function BoundNumberControl({
  label,
  value,
  dataModel,
  fallbackNumber = 100,
  onChange,
}: BoundNumberControlProps) {
  const mode: "literal" | "path" = isBoundPath(value) ? "path" : "literal";
  const currentPath = isBoundPath(value) ? value["@path"] : NUMBER_BINDING_OPTIONS[0]!.path;
  const currentNumber = typeof value === "number" ? value : fallbackNumber;
  const fieldId = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={fieldId} className="text-xs">
          {label}
        </Label>
        <div className="w-36">
          <BuilderSegmentedControl
            size="xs"
            value={mode}
            ariaLabel={`${label}の入力方式`}
            options={[
              { value: "path", label: "データ連携" },
              { value: "literal", label: "固定数値" },
            ]}
            onChange={(nextMode) => {
              if (nextMode === "path") {
                onChange({ "@path": currentPath });
              } else {
                const resolved = isBoundPath(value)
                  ? Number(getByPath(dataModel, value["@path"]) ?? fallbackNumber)
                  : currentNumber;
                onChange(Number.isFinite(resolved) ? resolved : fallbackNumber);
              }
            }}
          />
        </div>
      </div>

      {mode === "path" ? (
        <BindingPathSelect
          id={fieldId}
          value={currentPath}
          options={NUMBER_BINDING_OPTIONS}
          dataModel={dataModel}
          onChange={(path) => onChange({ "@path": path })}
        />
      ) : (
        <Input
          id={fieldId}
          type="number"
          value={String(currentNumber)}
          className="h-9 text-xs tabular-nums"
          onChange={(e) => {
            const parsed = Number(e.target.value);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
        />
      )}
    </div>
  );
}
