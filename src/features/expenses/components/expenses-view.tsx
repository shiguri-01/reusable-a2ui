import { useState } from "react";
import { action } from "@void/react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSyncAssistantExpenses } from "@/features/ai-chat/context/assistant-context";
import { ALL_CATEGORY_LABEL, formatYen, type ExpenseItem } from "../model";
import { ExpenseCreateDialog } from "./expense-create-dialog";
import { ExpenseTable } from "./expense-table";

interface ExpensesViewProps {
  expenses: ExpenseItem[];
}

export function ExpensesView({ expenses }: ExpensesViewProps) {
  useSyncAssistantExpenses(expenses);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY_LABEL);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = expenses.filter((item) => {
    const matchCat = category === ALL_CATEGORY_LABEL || item.category === category;
    const matchQuery =
      !normalizedQuery ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.note.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery);
    return matchCat && matchQuery;
  });

  const totalAmount = filtered.reduce((sum, item) => sum + item.amount, 0);

  const handleDelete = async (id: number) => {
    setPendingId(id);
    setActionError(null);
    try {
      const res = await action("/expenses?delete", { data: { id } });
      if (!res.ok) {
        setActionError(res.error.message);
      }
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">支出一覧</h1>
        </div>
        <div className="flex items-end justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="text-muted-foreground text-xs">表示中の合計（{filtered.length}件）</p>
            <p className="text-xl font-bold tabular-nums">{formatYen(totalAmount)}</p>
          </div>
          <ExpenseCreateDialog />
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 px-3 py-2">
          <AlertCircle />
          <AlertDescription className="text-xs font-medium">{actionError}</AlertDescription>
        </Alert>
      )}

      <ExpenseTable
        expenses={filtered}
        query={query}
        category={category}
        pendingId={pendingId}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onDelete={(id) => void handleDelete(id)}
      />
    </div>
  );
}
