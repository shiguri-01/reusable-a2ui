import type { ReactNode } from "react";
import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { getByPath, type DataModel } from "@/features/a2ui/data-model";
import type { BoundValue } from "@/features/a2ui/types";
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
import { cn } from "@/lib/utils";
import {
  NUMBER_BINDING_OPTIONS,
  STRING_BINDING_OPTIONS,
  type DataBindingOption,
} from "../lib/catalog-registry";

export interface SegmentedOption<T extends string = string> {
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
        if (next !== null) {
          onChange(next as T);
        }
      }}
      className={cn(
        "bg-muted/80 inline-grid w-full auto-cols-fr grid-flow-col items-center gap-0.5 rounded-lg border p-0.5",
        className,
      )}
    >
      {options.map((opt) => (
        <SegmentedControlItem
          key={opt.value}
          value={opt.value}
          title={opt.title}
          className={(state) =>
            cn(
              "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-md font-medium transition-colors select-none focus-visible:ring-2 focus-visible:outline-hidden",
              size === "xs" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
              state.checked
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

interface BuilderSwitchRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function BuilderSwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: BuilderSwitchRowProps) {
  return (
    <label className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors">
      <div className="min-w-0 space-y-0.5">
        <div className="text-xs font-medium">{label}</div>
        {description && <div className="text-muted-foreground text-[11px]">{description}</div>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        className={(state) =>
          cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
            state.checked ? "bg-primary" : "bg-input",
          )
        }
      >
        <SwitchThumb
          className={(state) =>
            cn(
              "bg-background pointer-events-none block size-4 rounded-full shadow-xs transition-transform",
              state.checked ? "translate-x-4" : "translate-x-0",
            )
          }
        />
      </Switch>
    </label>
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
  const grouped = groupOptions(STRING_BINDING_OPTIONS);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
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
        <Select value={currentPath} onValueChange={(nextPath) => onChange({ "@path": nextPath })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from(grouped.entries()).map(([group, opts]) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-[11px]">{group}</SelectLabel>
                {opts.map((opt) => {
                  const previewVal = getByPath(dataModel, opt.path);
                  return (
                    <SelectItem key={opt.path} value={opt.path} className="text-xs">
                      <span>{opt.label}</span>
                      {previewVal !== undefined && (
                        <span className="text-muted-foreground ml-1.5 text-[11px]">
                          ({String(previewVal)})
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={currentLiteral}
          placeholder={placeholder}
          className="h-8 text-xs"
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
  const grouped = groupOptions(NUMBER_BINDING_OPTIONS);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
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
        <Select value={currentPath} onValueChange={(nextPath) => onChange({ "@path": nextPath })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from(grouped.entries()).map(([group, opts]) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-[11px]">{group}</SelectLabel>
                {opts.map((opt) => {
                  const previewVal = getByPath(dataModel, opt.path);
                  return (
                    <SelectItem key={opt.path} value={opt.path} className="text-xs">
                      <span>{opt.label}</span>
                      {previewVal !== undefined && (
                        <span className="text-muted-foreground ml-1.5 text-[11px]">
                          ({String(previewVal)})
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type="number"
          value={String(currentNumber)}
          className="h-8 text-xs tabular-nums"
          onChange={(e) => {
            const parsed = Number(e.target.value);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
        />
      )}
    </div>
  );
}
