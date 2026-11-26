import { Check, ShieldAlert, Trash2, X } from "lucide-react";
import type { DataModel } from "@/a2ui/data-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { McpElicitationRequest } from "@/lib/codex/client";
import { formatYen, type ExpenseItem } from "@/lib/expenses";

interface McpApprovalCardProps {
  request: McpElicitationRequest;
  fallbackToolName?: string;
  fallbackToolParams?: Record<string, unknown>;
  dataModel: DataModel;
  onApprove: () => void;
  onApproveSession: () => void;
  onDecline: () => void;
}

function extractNumericIds(params?: Record<string, unknown>): number[] {
  if (!params) return [];
  const raw = params.ids;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is number => typeof v === "number" && Number.isInteger(v) && v > 0);
}

function getExpensesFromDataModel(dataModel: DataModel): ExpenseItem[] {
  const raw = dataModel.expenses;
  if (!Array.isArray(raw)) return [];
  return raw as ExpenseItem[];
}

export function McpApprovalCard({
  request,
  fallbackToolName,
  fallbackToolParams,
  dataModel,
  onApprove,
  onApproveSession,
  onDecline,
}: McpApprovalCardProps) {
  const effectiveToolName = request.toolName ?? fallbackToolName;
  const effectiveParams = request.toolParams ?? fallbackToolParams;
  const isDeleteExpenses =
    effectiveToolName === "delete_expenses" ||
    request.message.includes("delete_expenses") ||
    extractNumericIds(effectiveParams).length > 0;

  const targetIds = isDeleteExpenses ? extractNumericIds(effectiveParams) : [];
  const expenses = targetIds.length > 0 ? getExpensesFromDataModel(dataModel) : [];
  const expenseMap = new Map(expenses.map((item) => [item.id, item]));
  const matchedExpenses = targetIds
    .map((id) => ({ id, item: expenseMap.get(id) ?? null }))
    .filter((entry) => entry.id > 0);

  const totalDeleteAmount = matchedExpenses.reduce(
    (sum, entry) => sum + (entry.item?.amount ?? 0),
    0,
  );
  const allMatched = matchedExpenses.length > 0 && matchedExpenses.every((entry) => entry.item);

  const heading = isDeleteExpenses
    ? "支出の削除を許可しますか？"
    : request.toolTitle || "MCP ツールの実行許可";

  return (
    <div
      role="alertdialog"
      aria-label={heading}
      className="border-destructive/30 bg-destructive/5 w-full space-y-3 rounded-lg border p-3.5 text-sm shadow-xs"
    >
      <div className="flex items-start gap-2.5">
        <div className="bg-destructive/15 text-destructive mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
          {isDeleteExpenses ? <Trash2 className="size-4" /> : <ShieldAlert className="size-4" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold leading-snug">{heading}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {request.serverName}
            </Badge>
          </div>
          {!isDeleteExpenses && request.message && (
            <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
              {request.message}
            </p>
          )}
          {isDeleteExpenses && matchedExpenses.length === 0 && request.message && (
            <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
              {request.message}
            </p>
          )}
        </div>
      </div>

      {matchedExpenses.length > 0 && (
        <div className="bg-background/90 space-y-1.5 rounded-md border p-2.5 text-xs">
          <div className="text-muted-foreground flex items-center justify-between text-[11px]">
            <span>削除対象（{matchedExpenses.length}件）</span>
            {allMatched && (
              <span className="text-foreground font-semibold tabular-nums">
                合計 {formatYen(totalDeleteAmount)}
              </span>
            )}
          </div>
          <ul className="divide-y">
            {matchedExpenses.map(({ id, item }) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
              >
                {item ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                        <span>{item.spentAt}</span>
                        <span>·</span>
                        <span>{item.category}</span>
                      </div>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatYen(item.amount)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground font-mono">支出 ID #{id}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isDeleteExpenses && effectiveParams && Object.keys(effectiveParams).length > 0 && (
        <pre className="bg-background/90 text-muted-foreground max-h-28 overflow-auto rounded-md border p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {JSON.stringify(effectiveParams, null, 2)}
        </pre>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={isDeleteExpenses ? "destructive" : "default"}
          className="h-7 gap-1 px-2.5 text-xs"
          onClick={onApprove}
        >
          <Check className="size-3.5" />
          {isDeleteExpenses ? "削除を許可" : "許可する"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 px-2.5 text-xs"
          onClick={onApproveSession}
        >
          この会話中は自動許可
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2.5 text-xs"
          onClick={onDecline}
        >
          <X className="size-3.5" />
          キャンセル
        </Button>
      </div>
    </div>
  );
}
