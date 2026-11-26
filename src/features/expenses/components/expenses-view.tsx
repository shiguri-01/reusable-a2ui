import { useMemo, useState } from "react";
import { action } from "@void/react";
import { ALL_CATEGORY_LABEL, formatYen, type ExpenseItem } from "../model";
import { ExpenseCreateDialog } from "./expense-create-dialog";
import { ExpenseTable } from "./expense-table";

interface ExpensesViewProps {
  expenses: ExpenseItem[];
}

export function ExpensesView({ expenses }: ExpensesViewProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY_LABEL);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((item) => {
      const matchCat = category === ALL_CATEGORY_LABEL || item.category === category;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [expenses, query, category]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, item) => sum + item.amount, 0),
    [filtered],
  );

  const handleDelete = async (id: number) => {
    setPendingId(id);
    try {
      await action("/expenses?delete", { data: { id } });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
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
