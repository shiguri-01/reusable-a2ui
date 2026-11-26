import { useId } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatYen, type CategoryStat, type ExpenseItem } from "@/lib/expenses";
import { cn } from "@/lib/utils";
import {
  buildSurfaceState,
  getByPath,
  resolveValue,
  setByPath,
  type DataModel,
} from "./data-model";
import type { A2UIAction, A2UIComponent, A2UIMessage } from "./types";

interface A2UISurfaceProps {
  messages: A2UIMessage[];
  dataModel: DataModel;
  onDataModelChange: (next: DataModel) => void;
  onAction: (action: A2UIAction) => void;
  pending?: boolean;
  compact?: boolean;
}

const GAP_CLASS = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const;

const COMPACT_GAP_CLASS = {
  sm: "gap-1.5",
  md: "gap-2.5",
  lg: "gap-3.5",
} as const;

const GRID_COLS_CLASS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

const COMPACT_GRID_COLS_CLASS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2",
  4: "grid-cols-2",
} as const;

export function A2UISurface({
  messages,
  dataModel,
  onDataModelChange,
  onAction,
  pending = false,
  compact = false,
}: A2UISurfaceProps) {
  const idPrefix = useId();
  const surface = buildSurfaceState(messages);

  if (!surface) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          有効な A2UI Surface 定義が見つかりませんでした。
        </CardContent>
      </Card>
    );
  }

  const mergedModel: DataModel = {
    ...surface.initialDataModel,
    ...dataModel,
  };

  const gapMap = compact ? COMPACT_GAP_CLASS : GAP_CLASS;
  const gridMap = compact ? COMPACT_GRID_COLS_CLASS : GRID_COLS_CLASS;

  const updatePath = (path: string, value: unknown) => {
    onDataModelChange(setByPath(mergedModel, path, value));
  };

  const renderNode = (id: string, depth = 0): React.ReactNode => {
    if (depth > 20) return null;
    const node = surface.componentsById.get(id);
    if (!node) {
      return (
        <div
          key={id}
          className="text-destructive border-destructive/40 rounded-md border border-dashed px-3 py-2 text-xs"
        >
          Missing component: <code>{id}</code>
        </div>
      );
    }

    return renderComponent(node, depth);
  };

  const renderComponent = (node: A2UIComponent, depth: number): React.ReactNode => {
    switch (node.component) {
      case "Column": {
        return (
          <div key={node.id} className={cn("flex flex-col", gapMap[node.gap ?? "md"])}>
            {node.children.map((childId) => renderNode(childId, depth + 1))}
          </div>
        );
      }

      case "Row": {
        const alignClass =
          node.align === "center"
            ? "items-center"
            : node.align === "end"
              ? "items-end"
              : "items-start";
        const justifyClass =
          node.justify === "between"
            ? "justify-between"
            : node.justify === "end"
              ? "justify-end"
              : "justify-start";

        return (
          <div
            key={node.id}
            className={cn(
              "flex",
              gapMap[node.gap ?? "md"],
              alignClass,
              justifyClass,
              node.wrap ? "flex-wrap" : compact ? "flex-wrap" : "flex-col sm:flex-row",
            )}
          >
            {node.children.map((childId) => renderNode(childId, depth + 1))}
          </div>
        );
      }

      case "Grid": {
        return (
          <div
            key={node.id}
            className={cn("grid", gridMap[node.columns ?? 2], gapMap[node.gap ?? "md"])}
          >
            {node.children.map((childId) => renderNode(childId, depth + 1))}
          </div>
        );
      }

      case "Card": {
        const title = resolveValue(mergedModel, node.title);
        const description = resolveValue(mergedModel, node.description);
        return (
          <Card key={node.id} className={cn(compact && "gap-3 py-3.5 shadow-none")}>
            {(title || description) && (
              <CardHeader className={cn(compact && "px-3.5")}>
                {title && (
                  <CardTitle className={cn(compact ? "text-sm" : "text-base")}>{title}</CardTitle>
                )}
                {description && (
                  <CardDescription className={cn(compact && "text-xs")}>
                    {description}
                  </CardDescription>
                )}
              </CardHeader>
            )}
            <CardContent className={cn("flex flex-col", compact ? "gap-3 px-3.5" : "gap-4")}>
              {node.children.map((childId) => renderNode(childId, depth + 1))}
            </CardContent>
          </Card>
        );
      }

      case "Divider": {
        return <Separator key={node.id} />;
      }

      case "Text": {
        const text = resolveValue(mergedModel, node.text) ?? "";
        switch (node.variant) {
          case "h1":
            return (
              <h1
                key={node.id}
                className={cn("font-bold tracking-tight", compact ? "text-lg" : "text-2xl")}
              >
                {text}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={node.id}
                className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-lg")}
              >
                {text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={node.id} className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
                {text}
              </h3>
            );
          case "metric":
            return (
              <p
                key={node.id}
                className={cn(
                  "font-bold tracking-tight tabular-nums",
                  compact ? "text-xl" : "text-3xl",
                )}
              >
                {text}
              </p>
            );
          case "muted":
            return (
              <p
                key={node.id}
                className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}
              >
                {text}
              </p>
            );
          default:
            return (
              <p key={node.id} className="text-sm">
                {text}
              </p>
            );
        }
      }

      case "Badge": {
        const text = resolveValue(mergedModel, node.text) ?? "";
        return (
          <Badge key={node.id} variant={node.variant ?? "secondary"}>
            {text}
          </Badge>
        );
      }

      case "MetricCard": {
        const value = resolveValue(mergedModel, node.value) ?? "-";
        const helper = resolveValue(mergedModel, node.helper);
        const badge = resolveValue(mergedModel, node.badge);
        return (
          <Card key={node.id} className={cn("gap-2", compact ? "py-3 shadow-none" : "py-4")}>
            <CardHeader
              className={cn(
                "flex flex-row items-center justify-between space-y-0 pb-1",
                compact && "px-3",
              )}
            >
              <CardDescription className="text-xs font-medium">{node.label}</CardDescription>
              {badge && <Badge variant="secondary">{badge}</Badge>}
            </CardHeader>
            <CardContent className={cn("space-y-1", compact && "px-3")}>
              <div
                className={cn(
                  "font-bold tracking-tight tabular-nums",
                  compact ? "text-lg" : "text-2xl",
                )}
              >
                {value}
              </div>
              {helper && <p className="text-muted-foreground text-xs">{helper}</p>}
            </CardContent>
          </Card>
        );
      }

      case "ProgressBar": {
        const rawValue = Number(resolveValue(mergedModel, node.value) ?? 0);
        const rawMax = Number(resolveValue(mergedModel, node.max) ?? 100);
        const pct = rawMax > 0 ? Math.round((rawValue / rawMax) * 100) : 0;
        const detail = resolveValue(mergedModel, node.detail);
        const isOver = pct >= 100;

        return (
          <div key={node.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{node.label}</span>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  isOver ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {detail ?? `${pct}%`}
              </span>
            </div>
            <Progress value={pct} indicatorClassName={isOver ? "bg-destructive" : undefined} />
          </div>
        );
      }

      case "CategoryBreakdown": {
        const items = (getByPath(mergedModel, node.dataPath) as CategoryStat[] | undefined) ?? [];
        if (items.length === 0) {
          return (
            <p key={node.id} className="text-muted-foreground py-4 text-center text-sm">
              {node.emptyText ?? "まだ支出データがありません"}
            </p>
          );
        }

        return (
          <div key={node.id} className={cn(compact ? "space-y-2.5" : "space-y-3")}>
            {items.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground text-xs">{item.count}件</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-semibold">{formatYen(item.total)}</span>
                    <span className="text-muted-foreground w-10 text-right text-xs">
                      {item.ratio}%
                    </span>
                  </div>
                </div>
                <Progress value={item.ratio} className="h-2" />
              </div>
            ))}
          </div>
        );
      }

      case "FilterChips": {
        const current = String(getByPath(mergedModel, node.bindPath) ?? "すべて");
        const allLabel = node.allLabel ?? "すべて";
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
            onClick={() => onAction(node.action)}
          >
            {node.label}
          </Button>
        );
      }

      case "ExpenseList": {
        const allItems = (getByPath(mergedModel, node.dataPath) as ExpenseItem[] | undefined) ?? [];
        const activeFilter = node.filterPath
          ? String(getByPath(mergedModel, node.filterPath) ?? "すべて")
          : "すべて";

        const filtered =
          activeFilter && activeFilter !== "すべて"
            ? allItems.filter((item) => item.category === activeFilter)
            : allItems;

        const visible = node.limit ? filtered.slice(0, node.limit) : filtered;

        if (visible.length === 0) {
          return (
            <div key={node.id} className="text-muted-foreground py-6 text-center text-sm">
              {node.emptyText ?? "該当する支出ログがありません"}
            </div>
          );
        }

        return (
          <div key={node.id} className="divide-y">
            {visible.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between gap-3 text-sm first:pt-0 last:pb-0",
                  compact ? "py-2" : "py-3",
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{item.title}</span>
                    {node.showCategory && <Badge variant="secondary">{item.category}</Badge>}
                  </div>
                  {(node.showDate || (node.showNote && item.note)) && (
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      {node.showDate && <span>{item.spentAt}</span>}
                      {node.showNote && item.note && <span>{item.note}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatYen(item.amount)}</span>
                  {node.allowDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8"
                      disabled={pending}
                      aria-label={`${item.title}を削除`}
                      onClick={() =>
                        onAction({
                          name: "deleteExpense",
                          payload: { id: item.id },
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "KeyValueList": {
        return (
          <dl key={node.id} className="divide-y text-sm">
            {node.items.map((item, idx) => {
              const val = resolveValue(mergedModel, item.value) ?? "-";
              const badge = resolveValue(mergedModel, item.badge);
              return (
                <div
                  key={`${item.label}-${idx}`}
                  className={cn(
                    "flex items-center justify-between gap-3 first:pt-0 last:pb-0",
                    compact ? "py-1.5" : "py-2",
                  )}
                >
                  <dt className="text-muted-foreground shrink-0 text-xs">{item.label}</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-right font-medium tabular-nums">
                    <span className="truncate">{val}</span>
                    {badge && (
                      <Badge variant="secondary" className="shrink-0">
                        {badge}
                      </Badge>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        );
      }

      case "Alert": {
        const title = resolveValue(mergedModel, node.title);
        const text = resolveValue(mergedModel, node.text) ?? "";
        const variant = node.variant ?? "info";

        const variantStyle =
          variant === "destructive"
            ? "bg-destructive/10 text-destructive"
            : variant === "warning"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : variant === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-muted/70 text-foreground";

        const Icon =
          variant === "destructive"
            ? AlertCircle
            : variant === "warning"
              ? AlertTriangle
              : variant === "success"
                ? CheckCircle2
                : Info;

        return (
          <div
            key={node.id}
            className={cn("flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs", variantStyle)}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              {title && <div className="font-semibold">{title}</div>}
              <p className="leading-relaxed">{text}</p>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div data-a2ui-surface={surface.surfaceId} data-a2ui-catalog={surface.catalogId}>
      {renderNode(surface.rootId)}
    </div>
  );
}
