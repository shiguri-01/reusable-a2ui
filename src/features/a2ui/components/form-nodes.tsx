import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_CATEGORY_LABEL } from "@/features/expenses/model";
import { cn } from "@/lib/utils";
import { getByPath, resolveContextRecord, resolveValue } from "../data-model";
import type { A2UIComponent } from "../types";
import type { A2UIRenderContext } from "./render-context";

type FormNode = Extract<
  A2UIComponent,
  {
    component: "FilterChips" | "TextField" | "NumberField" | "DateField" | "SelectField" | "Button";
  }
>;

export function renderFormNode(node: FormNode, ctx: A2UIRenderContext): ReactNode {
  const { surfaceId, idPrefix, mergedModel, pending, compact, updatePath, onAction } = ctx;

  switch (node.component) {
    case "FilterChips": {
      const allLabel = node.allLabel ?? ALL_CATEGORY_LABEL;
      const current = String(getByPath(mergedModel, node.bindPath) ?? allLabel);
      const options = [allLabel, ...node.options];

      return (
        <div key={node.id} className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const selected = current === opt;
            return (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => updatePath(node.bindPath, opt)}
              >
                {opt}
              </Button>
            );
          })}
        </div>
      );
    }

    case "TextField": {
      const value = String(getByPath(mergedModel, node.bindPath) ?? "");
      const fieldId = `${idPrefix}-${node.id}`;
      return (
        <div key={node.id} className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={fieldId}>{node.label}</Label>
          <Input
            id={fieldId}
            value={value}
            placeholder={node.placeholder}
            required={node.required}
            onChange={(e) => updatePath(node.bindPath, e.target.value)}
          />
        </div>
      );
    }

    case "NumberField": {
      const raw = getByPath(mergedModel, node.bindPath);
      const value = raw === undefined || raw === null ? "" : String(raw);
      const fieldId = `${idPrefix}-${node.id}`;
      return (
        <div key={node.id} className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={fieldId}>{node.label}</Label>
          <div className="relative">
            <Input
              id={fieldId}
              type="number"
              inputMode="numeric"
              min={node.min ?? 0}
              value={value}
              placeholder={node.placeholder}
              className={cn("text-right tabular-nums", node.suffix && "pr-8")}
              onChange={(e) => updatePath(node.bindPath, e.target.value)}
            />
            {node.suffix && (
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                {node.suffix}
              </span>
            )}
          </div>
        </div>
      );
    }

    case "DateField": {
      const value = String(getByPath(mergedModel, node.bindPath) ?? "");
      const fieldId = `${idPrefix}-${node.id}`;
      return (
        <div key={node.id} className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={fieldId}>{node.label}</Label>
          <Input
            id={fieldId}
            type="date"
            value={value}
            onChange={(e) => updatePath(node.bindPath, e.target.value)}
          />
        </div>
      );
    }

    case "SelectField": {
      const value = String(getByPath(mergedModel, node.bindPath) ?? node.options[0] ?? "");
      const fieldId = `${idPrefix}-${node.id}`;
      return (
        <div key={node.id} className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor={fieldId}>{node.label}</Label>
          <Select value={value} onValueChange={(next) => updatePath(node.bindPath, next)}>
            <SelectTrigger id={fieldId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {node.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "Button": {
      return (
        <Button
          key={node.id}
          type="button"
          size={compact ? "sm" : "default"}
          variant={node.variant ?? "default"}
          disabled={pending}
          className={cn(node.fullWidth && "w-full")}
          onClick={() => {
            const { event } = node.action;
            const userMessage = resolveValue(mergedModel, event.userMessage);
            onAction({
              name: event.name,
              surfaceId,
              sourceComponentId: node.id,
              timestamp: new Date().toISOString(),
              ...(userMessage !== undefined ? { userMessage } : {}),
              context: resolveContextRecord(mergedModel, event.context),
            });
          }}
        >
          {node.label}
        </Button>
      );
    }
  }
}
