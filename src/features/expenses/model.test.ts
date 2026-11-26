import { describe, expect, it } from "vite-plus/test";
import {
  ALL_CATEGORY_LABEL,
  buildExpenseDataModel,
  formatYen,
  summarizeExpenses,
  type ExpenseItem,
} from "./model";

const sampleExpenses: ExpenseItem[] = [
  {
    id: 1,
    title: "ランチ",
    amount: 1200,
    category: "食費",
    spentAt: "2026-11-25",
    note: "",
    createdAt: "2026-11-25 12:00:00",
  },
  {
    id: 2,
    title: "カフェラテ",
    amount: 600,
    category: "カフェ",
    spentAt: "2026-11-25",
    note: "",
    createdAt: "2026-11-25 15:00:00",
  },
  {
    id: 3,
    title: "夕食",
    amount: 3200,
    category: "食費",
    spentAt: "2026-11-24",
    note: "",
    createdAt: "2026-11-24 20:00:00",
  },
];

describe("summarizeExpenses", () => {
  it("calculates totals, category ratios sorted by spend, and budget status", () => {
    const summary = summarizeExpenses(sampleExpenses, 10000);

    expect(summary.total).toBe(5000);
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(1667);
    expect(summary.topCategory).toBe("食費");
    expect(summary.categories).toEqual([
      { category: "食費", total: 4400, count: 2, ratio: 88 },
      { category: "カフェ", total: 600, count: 1, ratio: 12 },
    ]);
    expect(summary.budget).toEqual({
      limit: 10000,
      spent: 5000,
      remaining: 5000,
      usagePercent: 50,
      isOverBudget: false,
    });
  });

  it("handles empty lists and over-budget states cleanly", () => {
    const empty = summarizeExpenses([], 50000);
    expect(empty.total).toBe(0);
    expect(empty.average).toBe(0);
    expect(empty.topCategory).toBe("なし");
    expect(empty.categories).toEqual([]);

    const over = summarizeExpenses(sampleExpenses, 4000);
    expect(over.budget.remaining).toBe(-1000);
    expect(over.budget.isOverBudget).toBe(true);
    expect(over.budget.usagePercent).toBe(125);
  });
});

describe("buildExpenseDataModel", () => {
  it("formats display fields and preserves default filter", () => {
    const model = buildExpenseDataModel(sampleExpenses, { budgetLimit: 4000 });
    expect(model.summary).toMatchObject({
      total: 5000,
      totalFormatted: formatYen(5000),
      count: 3,
      countFormatted: "3件",
      topCategory: "食費",
    });
    expect(model.budget).toMatchObject({
      remainingFormatted: "-¥1,000",
      statusBadge: "予算超過",
    });
    expect(model.filter).toEqual({ category: ALL_CATEGORY_LABEL });
  });
});
