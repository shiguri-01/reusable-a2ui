import { useId, type ReactNode } from "react";
import { useShortcutHint } from "@ui-sdk/react/shortcuts";
import { Plus, Redo2, Undo2 } from "lucide-react";
import { getByPath, type DataModel } from "@/features/a2ui/data-model";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
    <ToggleGroup
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(next) => {
        if (!next) return;
        const option = options.find(({ value }) => value === next);
        if (option) onChange(option.value);
      }}
      className={cn(
        "bg-muted inline-grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-lg p-0.5",
        className,
      )}
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          title={opt.title}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-transparent data-[state=on]:bg-background data-[state=on]:text-foreground h-auto min-w-0 rounded-md font-medium shadow-none first:rounded-md last:rounded-md data-[state=on]:shadow-xs",
            "text-xs",
            size === "xs" ? "px-2 py-1" : "px-2.5 py-1.5",
          )}
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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
}: {
  onClick: () => void;
  className?: string;
}) {
  const hint = useShortcutHint("mod+k");

  return (
    <Button type="button" size="sm" className={cn("justify-between", className)} onClick={onClick}>
      <span className="flex items-center gap-1.5">
        <Plus className="size-4" />
        ブロックを追加
      </span>
      <kbd className="bg-primary-foreground/15 text-primary-foreground rounded-xs px-1.5 py-0.5 font-sans text-[10px] font-medium">
        {hint.text}
      </kbd>
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
        onClick={builder.redo}
      >
        <Redo2 className="size-3.5" />
      </Button>
    </>
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

function groupOptions(options: DataBindingOption[]): Map<string, DataBindingOption[]> {
  const grouped = new Map<string, DataBindingOption[]>();
  for (const opt of options) {
    const list = grouped.get(opt.group) ?? [];
    list.push(opt);
    grouped.set(opt.group, list);
  }
  return grouped;
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
        {Array.from(groupOptions(options), ([group, fields]) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {fields.map(({ path, label }) => {
              const preview = getByPath(dataModel, path);
              return (
                <SelectItem key={path} value={path} className="text-xs">
                  <span>{label}</span>
                  {preview !== undefined && (
                    <span className="text-muted-foreground ml-1">（{String(preview)}）</span>
                  )}
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
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
                  ? String(getByPath(dataModel, value["@path"]) ?? "")
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
