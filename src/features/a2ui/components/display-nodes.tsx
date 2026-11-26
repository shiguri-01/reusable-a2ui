import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { resolveValue } from "../data-model";
import type { A2UIComponent } from "../types";
import type { A2UIRenderContext } from "./render-context";

type DisplayNode = Extract<
  A2UIComponent,
  { component: "Text" | "Badge" | "MetricCard" | "ProgressBar" | "KeyValueList" | "Alert" }
>;

const ALERT_STYLES = {
  info: "bg-muted/70 text-foreground",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
} as const;

const ALERT_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
} as const;

export function renderDisplayNode(node: DisplayNode, ctx: A2UIRenderContext): ReactNode {
  const { mergedModel, compact } = ctx;

  switch (node.component) {
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
      const Icon = ALERT_ICONS[variant];

      return (
        <div
          key={node.id}
          className={cn(
            "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs",
            ALERT_STYLES[variant],
          )}
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
}
