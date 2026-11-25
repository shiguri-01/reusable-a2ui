import type { DataModel } from "@/a2ui/data-model";

export const EXPENSE_CATEGORIES = ["食費", "カフェ", "日用品", "交通", "娯楽", "その他"] as const;

export const MONTHLY_BUDGET_LIMIT = 50000;

export interface ExpenseItem {
  id: number;
  title: string;
  amount: number;
  category: string;
  spentAt: string;
  note: string;
  createdAt: string;
}

export interface CategoryStat {
  category: string;
  total: number;
  count: number;
  ratio: number;
}

export function formatYen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildExpenseDataModel(
  items: ExpenseItem[],
  options?: {
    budgetLimit?: number;
    existingForm?: Record<string, unknown>;
    existingFilter?: Record<string, unknown>;
  },
): DataModel {
  const budgetLimit = options?.budgetLimit ?? MONTHLY_BUDGET_LIMIT;
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const count = items.length;
  const average = count > 0 ? Math.round(total / count) : 0;

  const byCategory = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const prev = byCategory.get(item.category) ?? { total: 0, count: 0 };
    byCategory.set(item.category, {
      total: prev.total + item.amount,
      count: prev.count + 1,
    });
  }

  const categories: CategoryStat[] = Array.from(byCategory.entries())
    .map(([category, stat]) => ({
      category,
      total: stat.total,
      count: stat.count,
      ratio: total > 0 ? Math.round((stat.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topCategory = categories[0]?.category ?? "なし";
  const remaining = budgetLimit - total;
  const pct = budgetLimit > 0 ? Math.round((total / budgetLimit) * 100) : 0;

  return {
    expenses: items,
    categories,
    summary: {
      total,
      totalFormatted: formatYen(total),
      count,
      countFormatted: `${count}件`,
      average,
      averageFormatted: `平均 ${formatYen(average)} / 回`,
      topCategory,
      topCategoryLabel: `最多：${topCategory}`,
      periodLabel: "全期間の支出合計",
    },
    budget: {
      spent: total,
      limit: budgetLimit,
      remaining,
      remainingFormatted:
        remaining >= 0 ? formatYen(remaining) : `-${formatYen(Math.abs(remaining))}`,
      limitLabel: `月間予算 ${formatYen(budgetLimit)}`,
      detailLabel: `${formatYen(total)} / ${formatYen(budgetLimit)} (${pct}%)`,
      statusBadge: remaining >= 0 ? `残り ${Math.max(0, 100 - pct)}%` : "予算超過",
    },
    filter: {
      category: "すべて",
      ...options?.existingFilter,
    },
    form: {
      title: "",
      amount: "",
      category: EXPENSE_CATEGORIES[0],
      spentAt: getTodayIso(),
      note: "",
      ...options?.existingForm,
    },
  };
}
