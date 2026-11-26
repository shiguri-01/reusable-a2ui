import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Columns2,
  CreditCard,
  Filter,
  FormInput,
  Gauge,
  Hash,
  LayoutGrid,
  LayoutList,
  ListChecks,
  Minus,
  MousePointerClick,
  PieChart,
  Rows3,
  Sparkles,
  SquareStack,
  Tag,
  Type,
} from "lucide-react";
import { resolveValue, type DataModel } from "@/features/a2ui/data-model";
import type { A2UIComponent, BoundValue } from "@/features/a2ui/types";
import { EXPENSE_CATEGORIES } from "@/features/expenses/model";
import {
  isContainerComponent,
  type BlockBlueprint,
  type EditableSurfaceGraph,
} from "./a2ui-builder";

interface ComponentTypeMeta {
  label: string;
  icon: LucideIcon;
}

export const COMPONENT_META: Record<A2UIComponent["component"], ComponentTypeMeta> = {
  Column: { label: "縦並び", icon: Rows3 },
  Row: { label: "横並び", icon: Columns2 },
  Grid: { label: "グリッド", icon: LayoutGrid },
  Card: { label: "カード", icon: SquareStack },
  Divider: { label: "区切り線", icon: Minus },
  Text: { label: "テキスト", icon: Type },
  Badge: { label: "バッジ", icon: Tag },
  MetricCard: { label: "KPI", icon: CreditCard },
  ProgressBar: { label: "進捗バー", icon: Gauge },
  KeyValueList: { label: "項目リスト", icon: ListChecks },
  Alert: { label: "お知らせ", icon: AlertTriangle },
  FilterChips: { label: "カテゴリ絞り込み", icon: Filter },
  TextField: { label: "文字入力", icon: FormInput },
  NumberField: { label: "数値入力", icon: Hash },
  DateField: { label: "日付入力", icon: Calendar },
  SelectField: { label: "選択欄", icon: ListChecks },
  Button: { label: "ボタン", icon: MousePointerClick },
  CategoryBreakdown: { label: "カテゴリ別内訳", icon: PieChart },
  ExpenseList: { label: "支出リスト", icon: LayoutList },
};

export interface DataBindingOption {
  path: string;
  label: string;
  group: string;
}

export const STRING_BINDING_OPTIONS: DataBindingOption[] = [
  { path: "/summary/totalFormatted", label: "支出合計", group: "集計サマリー" },
  { path: "/summary/countFormatted", label: "記録件数", group: "集計サマリー" },
  { path: "/summary/averageFormatted", label: "1回あたりの平均", group: "集計サマリー" },
  { path: "/summary/topCategory", label: "最多カテゴリ名", group: "集計サマリー" },
  { path: "/summary/topCategoryLabel", label: "最多カテゴリラベル", group: "集計サマリー" },
  { path: "/summary/periodLabel", label: "集計期間ラベル", group: "集計サマリー" },
  { path: "/budget/remainingFormatted", label: "予算残高", group: "月間予算" },
  { path: "/budget/limitLabel", label: "月間予算ラベル", group: "月間予算" },
  { path: "/budget/detailLabel", label: "予算消化の内訳", group: "月間予算" },
  { path: "/budget/statusBadge", label: "予算ステータス", group: "月間予算" },
];

export const NUMBER_BINDING_OPTIONS: DataBindingOption[] = [
  { path: "/budget/spent", label: "今月の支出額", group: "月間予算" },
  { path: "/budget/limit", label: "月間予算の上限", group: "月間予算" },
  { path: "/summary/total", label: "全期間の支出合計", group: "集計サマリー" },
  { path: "/summary/count", label: "記録件数", group: "集計サマリー" },
  { path: "/summary/average", label: "平均支出額", group: "集計サマリー" },
];

export const FORM_FIELD_BIND_OPTIONS: DataBindingOption[] = [
  { path: "/form/title", label: "支出の内容", group: "記録フォーム" },
  { path: "/form/amount", label: "金額", group: "記録フォーム" },
  { path: "/form/category", label: "カテゴリ", group: "記録フォーム" },
  { path: "/form/spentAt", label: "日付", group: "記録フォーム" },
  { path: "/form/note", label: "メモ", group: "記録フォーム" },
  { path: "/filter/category", label: "絞り込みカテゴリ", group: "フィルタ" },
];

interface ComponentDisplayParts {
  primary: string;
  secondary?: string;
}

function displayName(
  label: string,
  title: string | undefined,
  fallback = label,
): ComponentDisplayParts {
  return title?.trim() ? { primary: title, secondary: label } : { primary: fallback };
}

function resolveDisplayText(dataModel: DataModel, value: BoundValue<string> | undefined) {
  const resolved = resolveValue(dataModel, value);
  return typeof resolved === "string" ? resolved : undefined;
}

export function getComponentDisplayParts(
  node: A2UIComponent,
  dataModel: DataModel,
): ComponentDisplayParts {
  const { label } = COMPONENT_META[node.component];

  switch (node.component) {
    case "Grid":
      return { primary: `${node.columns ?? 2}カラム`, secondary: label };
    case "Card":
      return displayName(label, resolveDisplayText(dataModel, node.title)?.trim());
    case "Text":
    case "Badge":
      return displayName(label, resolveDisplayText(dataModel, node.text)?.trim());
    case "Alert": {
      const title = resolveDisplayText(dataModel, node.title);
      const text = resolveDisplayText(dataModel, node.text);
      return displayName(label, (title || text)?.trim());
    }
    case "MetricCard":
      return displayName(label, node.label, "KPIカード");
    case "ProgressBar":
    case "TextField":
    case "NumberField":
    case "DateField":
    case "SelectField":
    case "Button":
      return displayName(label, node.label);
    case "KeyValueList":
      return { primary: label, secondary: `${node.items.length}行` };
    case "ExpenseList":
      return { primary: label, secondary: node.limit ? `最大${node.limit}件` : undefined };
    default:
      return { primary: label };
  }
}

interface ContainerOptionItem {
  id: string;
  label: string;
  typeLabel?: string;
  depth: number;
}

export function listContainerOptions(
  graph: EditableSurfaceGraph,
  dataModel: DataModel,
): ContainerOptionItem[] {
  const result: ContainerOptionItem[] = [];
  const visited = new Set<string>();

  const summarizeChildNames = (childIds: string[]): string | undefined => {
    const names: string[] = [];
    for (const childId of childIds) {
      const child = graph.componentsById.get(childId);
      if (!child) continue;
      const parts = getComponentDisplayParts(child, dataModel);
      const cleaned = parts.primary.replace(/（任意）$/, "");
      if (cleaned) names.push(cleaned);
      if (names.length >= 2) break;
    }
    if (names.length === 0) return undefined;
    return childIds.length > names.length ? `${names.join("・")} ほか` : names.join("・");
  };

  const visit = (id: string, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = graph.componentsById.get(id);
    if (!node || !isContainerComponent(node)) return;

    if (id === graph.rootId) {
      result.push({ id, label: "ページ全体", depth });
    } else if (node.component === "Column" || node.component === "Row") {
      const base = COMPONENT_META[node.component].label;
      const preview = summarizeChildNames(node.children);
      result.push({
        id,
        label: preview ? `${base}（${preview}）` : base,
        depth,
      });
    } else {
      const parts = getComponentDisplayParts(node, dataModel);
      result.push({
        id,
        label: parts.primary,
        typeLabel: parts.secondary,
        depth,
      });
    }

    for (const childId of node.children) {
      visit(childId, depth + 1);
    }
  };

  visit(graph.rootId, 0);
  return result;
}

interface PaletteBlueprintEntry extends BlockBlueprint {
  icon: LucideIcon;
}

export const BLOCK_BLUEPRINTS: PaletteBlueprintEntry[] = [
  // --- Pre-assembled Sets ---
  {
    id: "preset-kpi-trio",
    label: "3連 KPI サマリー",
    description: "支出合計・予算残高・最多カテゴリが並ぶ3カラム構成",
    category: "preset",
    icon: Activity,
    keywords: ["kpi", "summary", "metric", "合計", "予算", "サマリー"],
    buildNodes: () => [
      {
        id: "kpi-grid",
        component: "Grid",
        columns: 3,
        gap: "md",
        children: ["metric-total", "metric-remaining", "metric-top-cat"],
      },
      {
        id: "metric-total",
        component: "MetricCard",
        label: "支出合計",
        value: { "@path": "/summary/totalFormatted" },
        helper: { "@path": "/summary/countFormatted" },
      },
      {
        id: "metric-remaining",
        component: "MetricCard",
        label: "予算残高",
        value: { "@path": "/budget/remainingFormatted" },
        helper: { "@path": "/budget/limitLabel" },
        badge: { "@path": "/budget/statusBadge" },
      },
      {
        id: "metric-top-cat",
        component: "MetricCard",
        label: "最多カテゴリ",
        value: { "@path": "/summary/topCategory" },
        helper: { "@path": "/summary/averageFormatted" },
      },
    ],
  },
  {
    id: "preset-budget-card",
    label: "月間予算トラッカー",
    description: "今月の予算消化率を進捗バー付きカードで表示",
    category: "preset",
    icon: Gauge,
    keywords: ["budget", "progress", "予算", "ゲージ", "トラッカー"],
    buildNodes: () => [
      {
        id: "budget-card",
        component: "Card",
        title: "月間予算トラッカー",
        children: ["budget-progress"],
      },
      {
        id: "budget-progress",
        component: "ProgressBar",
        label: "今月の予算消化率",
        value: { "@path": "/budget/spent" },
        max: { "@path": "/budget/limit" },
        detail: { "@path": "/budget/detailLabel" },
      },
    ],
  },
  {
    id: "preset-quick-expense-form",
    label: "クイック支出入力",
    description: "内容・金額・カテゴリを横並びで素早く記録できるカード",
    category: "preset",
    icon: FormInput,
    keywords: ["form", "input", "quick", "入力", "フォーム", "記録"],
    buildNodes: () => [
      {
        id: "quick-form-card",
        component: "Card",
        title: "クイック支出記録",
        children: ["quick-form-row", "quick-submit-btn"],
      },
      {
        id: "quick-form-row",
        component: "Row",
        gap: "md",
        children: ["quick-title", "quick-amount", "quick-category"],
      },
      {
        id: "quick-title",
        component: "TextField",
        label: "内容",
        bindPath: "/form/title",
        placeholder: "例：ランチ、カフェ",
        required: true,
      },
      {
        id: "quick-amount",
        component: "NumberField",
        label: "金額",
        bindPath: "/form/amount",
        placeholder: "850",
        min: 1,
        suffix: "円",
      },
      {
        id: "quick-category",
        component: "SelectField",
        label: "カテゴリ",
        bindPath: "/form/category",
        options: [...EXPENSE_CATEGORIES],
      },
      {
        id: "quick-submit-btn",
        component: "Button",
        label: "記録する",
        fullWidth: true,
        action: { name: "createExpense" },
      },
    ],
  },
  {
    id: "preset-full-expense-form",
    label: "詳細支出入力フォーム",
    description: "日付やメモも含めて記録できるカード",
    category: "preset",
    icon: SquareStack,
    keywords: ["form", "full", "date", "note", "詳細", "フォーム", "記録"],
    buildNodes: () => [
      {
        id: "form-card",
        component: "Card",
        title: "支出を記録",
        children: ["title-field", "amount-cat-row", "date-note-row", "submit-btn"],
      },
      {
        id: "title-field",
        component: "TextField",
        label: "内容",
        bindPath: "/form/title",
        placeholder: "例：コーヒー豆、電車賃",
        required: true,
      },
      {
        id: "amount-cat-row",
        component: "Row",
        gap: "md",
        children: ["amount-field", "category-field"],
      },
      {
        id: "amount-field",
        component: "NumberField",
        label: "金額",
        bindPath: "/form/amount",
        placeholder: "1200",
        min: 1,
        suffix: "円",
      },
      {
        id: "category-field",
        component: "SelectField",
        label: "カテゴリ",
        bindPath: "/form/category",
        options: [...EXPENSE_CATEGORIES],
      },
      {
        id: "date-note-row",
        component: "Row",
        gap: "md",
        children: ["date-field", "note-field"],
      },
      {
        id: "date-field",
        component: "DateField",
        label: "日付",
        bindPath: "/form/spentAt",
      },
      {
        id: "note-field",
        component: "TextField",
        label: "メモ（任意）",
        bindPath: "/form/note",
        placeholder: "例：お店の名前",
      },
      {
        id: "submit-btn",
        component: "Button",
        label: "支出を記録する",
        fullWidth: true,
        action: { name: "createExpense" },
      },
    ],
  },
  {
    id: "preset-filterable-expenses",
    label: "絞り込み付き支出ログ",
    description: "カテゴリ絞り込みと削除ボタン付きの支出一覧カード",
    category: "preset",
    icon: LayoutList,
    keywords: ["list", "history", "filter", "一覧", "ログ", "明細"],
    buildNodes: () => [
      {
        id: "expenses-card",
        component: "Card",
        title: "支出ログ",
        children: ["filter-chips", "expense-list"],
      },
      {
        id: "filter-chips",
        component: "FilterChips",
        bindPath: "/filter/category",
        options: [...EXPENSE_CATEGORIES],
        allLabel: "すべて",
      },
      {
        id: "expense-list",
        component: "ExpenseList",
        dataPath: "/expenses",
        filterPath: "/filter/category",
        showCategory: true,
        showDate: true,
        showNote: true,
        allowDelete: true,
        limit: 12,
      },
    ],
  },
  {
    id: "preset-ai-shortcut-card",
    label: "AI アシスタント相談バー",
    description: "ワンクリックでAIに振り返りや節約相談を送れるカード",
    category: "preset",
    icon: Sparkles,
    keywords: ["ai", "assistant", "prompt", "相談", "分析", "アドバイス"],
    buildNodes: () => [
      {
        id: "ai-helper-card",
        component: "Card",
        title: "AI 家計アシスタント",
        children: ["ai-helper-row"],
      },
      {
        id: "ai-helper-row",
        component: "Row",
        gap: "sm",
        wrap: true,
        children: ["ai-btn-review", "ai-btn-saving"],
      },
      {
        id: "ai-btn-review",
        component: "Button",
        label: "今月の支出傾向を分析",
        variant: "secondary",
        action: {
          name: "sendPrompt",
          payload: { text: "今月の支出傾向と予算状況をコンパクトに振り返って" },
        },
      },
      {
        id: "ai-btn-saving",
        component: "Button",
        label: "節約ポイントを相談",
        variant: "outline",
        action: {
          name: "sendPrompt",
          payload: { text: "最近の支出から無理なく節約できそうなポイントを提案して" },
        },
      },
    ],
  },

  // --- Layout Blocks ---
  {
    id: "layout-grid-2",
    label: "2カラム グリッド",
    description: "左右2列にブロックを並べるレイアウト枠",
    category: "layout",
    icon: LayoutGrid,
    keywords: ["grid", "2", "columns", "2カラム", "2列", "グリッド"],
    buildNodes: () => [
      {
        id: "grid-2col",
        component: "Grid",
        columns: 2,
        gap: "lg",
        children: [],
      },
    ],
  },
  {
    id: "layout-grid-3",
    label: "3カラム グリッド",
    description: "3列にブロックを並べるレイアウト枠",
    category: "layout",
    icon: LayoutGrid,
    keywords: ["grid", "3", "columns", "3カラム", "3列", "グリッド"],
    buildNodes: () => [
      {
        id: "grid-3col",
        component: "Grid",
        columns: 3,
        gap: "md",
        children: [],
      },
    ],
  },
  {
    id: "layout-card",
    label: "カード",
    description: "中にブロックを入れられる見出し付きの枠",
    category: "layout",
    icon: SquareStack,
    keywords: ["card", "box", "カード", "枠"],
    buildNodes: () => [
      {
        id: "custom-card",
        component: "Card",
        title: "見出し",
        children: [],
      },
    ],
  },
  {
    id: "layout-row",
    label: "横並び",
    description: "ブロックを横方向に並べる枠",
    category: "layout",
    icon: Columns2,
    keywords: ["row", "horizontal", "flex", "横並び"],
    buildNodes: () => [
      {
        id: "row-group",
        component: "Row",
        gap: "md",
        align: "center",
        children: [],
      },
    ],
  },
  {
    id: "layout-column",
    label: "縦並び",
    description: "ブロックを縦方向に積む枠",
    category: "layout",
    icon: Rows3,
    keywords: ["column", "vertical", "stack", "縦並び"],
    buildNodes: () => [
      {
        id: "col-group",
        component: "Column",
        gap: "md",
        children: [],
      },
    ],
  },
  {
    id: "layout-divider",
    label: "区切り線",
    description: "上下のブロックを区切る水平ライン",
    category: "layout",
    icon: Minus,
    keywords: ["divider", "separator", "hr", "区切り線"],
    buildNodes: () => [
      {
        id: "divider",
        component: "Divider",
      },
    ],
  },

  // --- Display Blocks ---
  {
    id: "display-metric",
    label: "KPIカード",
    description: "合計金額・件数・平均値などの指標を1枚表示",
    category: "display",
    icon: CreditCard,
    keywords: ["metric", "kpi", "stat", "数値", "指標"],
    buildNodes: () => [
      {
        id: "metric-card",
        component: "MetricCard",
        label: "支出合計",
        value: { "@path": "/summary/totalFormatted" },
        helper: { "@path": "/summary/periodLabel" },
      },
    ],
  },
  {
    id: "display-progress",
    label: "進捗バー",
    description: "上限に対する消化率や達成率を表示",
    category: "display",
    icon: Gauge,
    keywords: ["progress", "bar", "進捗", "バー"],
    buildNodes: () => [
      {
        id: "progress-bar",
        component: "ProgressBar",
        label: "予算消化率",
        value: { "@path": "/budget/spent" },
        max: { "@path": "/budget/limit" },
        detail: { "@path": "/budget/detailLabel" },
      },
    ],
  },
  {
    id: "display-category-breakdown",
    label: "カテゴリ別内訳",
    description: "カテゴリごとの支出額と割合バーを表示",
    category: "display",
    icon: PieChart,
    keywords: ["category", "breakdown", "chart", "カテゴリ", "内訳", "分析"],
    buildNodes: () => [
      {
        id: "category-breakdown",
        component: "CategoryBreakdown",
        dataPath: "/categories",
      },
    ],
  },
  {
    id: "display-expense-list",
    label: "支出リスト",
    description: "登録済みの支出明細を一覧表示",
    category: "display",
    icon: LayoutList,
    keywords: ["expense", "list", "明細", "リスト"],
    buildNodes: () => [
      {
        id: "expense-list",
        component: "ExpenseList",
        dataPath: "/expenses",
        showCategory: true,
        showDate: true,
        allowDelete: true,
        limit: 8,
      },
    ],
  },
  {
    id: "display-kv-list",
    label: "項目リスト",
    description: "ラベルと値を縦に並べる集計表",
    category: "display",
    icon: ListChecks,
    keywords: ["key", "value", "table", "summary", "項目", "リスト"],
    buildNodes: () => [
      {
        id: "summary-kv",
        component: "KeyValueList",
        items: [
          { label: "支出合計", value: { "@path": "/summary/totalFormatted" } },
          {
            label: "予算残高",
            value: { "@path": "/budget/remainingFormatted" },
            badge: { "@path": "/budget/statusBadge" },
          },
          { label: "最多カテゴリ", value: { "@path": "/summary/topCategory" } },
        ],
      },
    ],
  },
  {
    id: "display-alert",
    label: "お知らせ",
    description: "マイルールやメモを目立たせて表示",
    category: "display",
    icon: AlertTriangle,
    keywords: ["alert", "banner", "notice", "お知らせ", "注意", "メモ"],
    buildNodes: () => [
      {
        id: "alert-banner",
        component: "Alert",
        variant: "info",
        title: "今月のマイルール",
        text: "カフェ・外食は週3回までに抑えて予算残高をキープしましょう。",
      },
    ],
  },
  {
    id: "display-text",
    label: "見出し・テキスト",
    description: "見出しや補足文を表示",
    category: "display",
    icon: Type,
    keywords: ["text", "heading", "title", "テキスト", "見出し"],
    buildNodes: () => [
      {
        id: "heading-text",
        component: "Text",
        variant: "h2",
        text: "見出し",
      },
    ],
  },
  {
    id: "display-badge",
    label: "バッジ",
    description: "データ連携または固定文字の小さなラベル",
    category: "display",
    icon: Tag,
    keywords: ["badge", "tag", "status", "バッジ"],
    buildNodes: () => [
      {
        id: "status-badge",
        component: "Badge",
        variant: "secondary",
        text: { "@path": "/budget/statusBadge" },
      },
    ],
  },

  // --- Form & Action Blocks ---
  {
    id: "form-filter-chips",
    label: "カテゴリ絞り込み",
    description: "支出リストの表示カテゴリを切り替えるボタン群",
    category: "form",
    icon: Filter,
    keywords: ["filter", "chips", "category", "絞り込み", "フィルタ"],
    buildNodes: () => [
      {
        id: "filter-chips",
        component: "FilterChips",
        bindPath: "/filter/category",
        options: [...EXPENSE_CATEGORIES],
        allLabel: "すべて",
      },
    ],
  },
  {
    id: "form-text-field",
    label: "テキスト入力",
    description: "内容やメモを入力する欄",
    category: "form",
    icon: FormInput,
    keywords: ["text", "input", "field", "入力"],
    buildNodes: () => [
      {
        id: "text-field",
        component: "TextField",
        label: "内容",
        bindPath: "/form/title",
        placeholder: "例：カフェラテ",
        required: true,
      },
    ],
  },
  {
    id: "form-number-field",
    label: "数値入力",
    description: "金額などの数値を入力する欄",
    category: "form",
    icon: Hash,
    keywords: ["number", "amount", "yen", "金額", "数値"],
    buildNodes: () => [
      {
        id: "amount-field",
        component: "NumberField",
        label: "金額",
        bindPath: "/form/amount",
        placeholder: "1000",
        min: 1,
        suffix: "円",
      },
    ],
  },
  {
    id: "form-select-field",
    label: "セレクト選択",
    description: "ドロップダウンからカテゴリ等を選ぶ欄",
    category: "form",
    icon: ListChecks,
    keywords: ["select", "dropdown", "category", "選択", "カテゴリ"],
    buildNodes: () => [
      {
        id: "category-field",
        component: "SelectField",
        label: "カテゴリ",
        bindPath: "/form/category",
        options: [...EXPENSE_CATEGORIES],
      },
    ],
  },
  {
    id: "form-date-field",
    label: "日付入力",
    description: "カレンダーから日付を選ぶ欄",
    category: "form",
    icon: Calendar,
    keywords: ["date", "calendar", "日付"],
    buildNodes: () => [
      {
        id: "date-field",
        component: "DateField",
        label: "日付",
        bindPath: "/form/spentAt",
      },
    ],
  },
  {
    id: "form-action-button",
    label: "ボタン",
    description: "支出の登録やAIへの質問を実行するボタン",
    category: "form",
    icon: MousePointerClick,
    keywords: ["button", "submit", "action", "ボタン", "送信"],
    buildNodes: () => [
      {
        id: "action-btn",
        component: "Button",
        label: "支出を記録する",
        variant: "default",
        fullWidth: true,
        action: { name: "createExpense" },
      },
    ],
  },
];
