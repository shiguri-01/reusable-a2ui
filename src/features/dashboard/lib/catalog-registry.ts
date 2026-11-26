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
import type { A2UIComponent } from "@/features/a2ui/types";
import { EXPENSE_CATEGORIES } from "@/features/expenses/model";
import type { BlockBlueprint } from "./a2ui-builder";

export interface ComponentTypeMeta {
  label: string;
  shortLabel: string;
  category: "layout" | "display" | "form" | "expense";
  icon: LucideIcon;
  isContainer: boolean;
}

export const COMPONENT_META: Record<A2UIComponent["component"], ComponentTypeMeta> = {
  Column: {
    label: "縦並びグループ (Column)",
    shortLabel: "縦並び",
    category: "layout",
    icon: Rows3,
    isContainer: true,
  },
  Row: {
    label: "横並びグループ (Row)",
    shortLabel: "横並び",
    category: "layout",
    icon: Columns2,
    isContainer: true,
  },
  Grid: {
    label: "グリッド (Grid)",
    shortLabel: "Grid",
    category: "layout",
    icon: LayoutGrid,
    isContainer: true,
  },
  Card: {
    label: "カード枠 (Card)",
    shortLabel: "Card",
    category: "layout",
    icon: SquareStack,
    isContainer: true,
  },
  Divider: {
    label: "区切り線 (Divider)",
    shortLabel: "区切り線",
    category: "layout",
    icon: Minus,
    isContainer: false,
  },
  Text: {
    label: "テキスト・見出し (Text)",
    shortLabel: "テキスト",
    category: "display",
    icon: Type,
    isContainer: false,
  },
  Badge: {
    label: "バッジ (Badge)",
    shortLabel: "バッジ",
    category: "display",
    icon: Tag,
    isContainer: false,
  },
  MetricCard: {
    label: "KPIカード (MetricCard)",
    shortLabel: "KPIカード",
    category: "display",
    icon: CreditCard,
    isContainer: false,
  },
  ProgressBar: {
    label: "進捗バー (ProgressBar)",
    shortLabel: "進捗バー",
    category: "display",
    icon: Gauge,
    isContainer: false,
  },
  KeyValueList: {
    label: "項目・値リスト (KeyValueList)",
    shortLabel: "項目リスト",
    category: "display",
    icon: ListChecks,
    isContainer: false,
  },
  Alert: {
    label: "お知らせ・アラート (Alert)",
    shortLabel: "アラート",
    category: "display",
    icon: AlertTriangle,
    isContainer: false,
  },
  FilterChips: {
    label: "カテゴリ絞り込み (FilterChips)",
    shortLabel: "絞り込み",
    category: "form",
    icon: Filter,
    isContainer: false,
  },
  TextField: {
    label: "テキスト入力 (TextField)",
    shortLabel: "文字入力",
    category: "form",
    icon: FormInput,
    isContainer: false,
  },
  NumberField: {
    label: "数値・金額入力 (NumberField)",
    shortLabel: "数値入力",
    category: "form",
    icon: Hash,
    isContainer: false,
  },
  DateField: {
    label: "日付入力 (DateField)",
    shortLabel: "日付入力",
    category: "form",
    icon: Calendar,
    isContainer: false,
  },
  SelectField: {
    label: "セレクト選択 (SelectField)",
    shortLabel: "選択欄",
    category: "form",
    icon: ListChecks,
    isContainer: false,
  },
  Button: {
    label: "アクションボタン (Button)",
    shortLabel: "ボタン",
    category: "form",
    icon: MousePointerClick,
    isContainer: false,
  },
  CategoryBreakdown: {
    label: "カテゴリ別内訳 (CategoryBreakdown)",
    shortLabel: "カテゴリ内訳",
    category: "expense",
    icon: PieChart,
    isContainer: false,
  },
  ExpenseList: {
    label: "支出リスト (ExpenseList)",
    shortLabel: "支出リスト",
    category: "expense",
    icon: LayoutList,
    isContainer: false,
  },
};

export interface DataBindingOption {
  path: string;
  label: string;
  group: string;
}

export const STRING_BINDING_OPTIONS: DataBindingOption[] = [
  { path: "/summary/totalFormatted", label: "支出合計（¥表記）", group: "集計サマリー" },
  { path: "/summary/countFormatted", label: "記録件数（〇件）", group: "集計サマリー" },
  {
    path: "/summary/averageFormatted",
    label: "1回あたり平均（平均 ¥〇 / 回）",
    group: "集計サマリー",
  },
  { path: "/summary/topCategory", label: "最多カテゴリ名", group: "集計サマリー" },
  { path: "/summary/topCategoryLabel", label: "最多カテゴリ（最多：〇）", group: "集計サマリー" },
  { path: "/summary/periodLabel", label: "集計期間ラベル", group: "集計サマリー" },
  { path: "/budget/remainingFormatted", label: "予算残高（¥表記）", group: "月間予算" },
  { path: "/budget/limitLabel", label: "月間予算ラベル", group: "月間予算" },
  { path: "/budget/detailLabel", label: "予算消化詳細（¥〇 / ¥〇 (%)）", group: "月間予算" },
  { path: "/budget/statusBadge", label: "予算ステータス（残り〇% / 超過）", group: "月間予算" },
];

export const NUMBER_BINDING_OPTIONS: DataBindingOption[] = [
  { path: "/budget/spent", label: "今月の支出合計（数値）", group: "月間予算" },
  { path: "/budget/limit", label: "月間予算上限（数値）", group: "月間予算" },
  { path: "/summary/total", label: "全期間の支出合計（数値）", group: "集計サマリー" },
  { path: "/summary/count", label: "記録件数（数値）", group: "集計サマリー" },
  { path: "/summary/average", label: "平均支出額（数値）", group: "集計サマリー" },
];

export const FORM_FIELD_BIND_OPTIONS: DataBindingOption[] = [
  { path: "/form/title", label: "支出の内容 (/form/title)", group: "記録フォーム" },
  { path: "/form/amount", label: "金額 (/form/amount)", group: "記録フォーム" },
  { path: "/form/category", label: "カテゴリ (/form/category)", group: "記録フォーム" },
  { path: "/form/spentAt", label: "日付 (/form/spentAt)", group: "記録フォーム" },
  { path: "/form/note", label: "メモ (/form/note)", group: "記録フォーム" },
  { path: "/filter/category", label: "絞り込みカテゴリ (/filter/category)", group: "フィルタ" },
];

export function summarizeComponent(node: A2UIComponent, dataModel?: DataModel): string {
  switch (node.component) {
    case "Column":
      return `${node.children.length}要素・余白 ${node.gap ?? "md"}`;
    case "Row":
      return `${node.children.length}要素・横並び`;
    case "Grid":
      return `${node.columns ?? 2}カラム・${node.children.length}要素`;
    case "Card": {
      const title = dataModel ? resolveValue(dataModel, node.title) : undefined;
      const fallback = typeof node.title === "string" ? node.title : title;
      return fallback ? `${fallback}` : `タイトルなし (${node.children.length}要素)`;
    }
    case "Divider":
      return "水平セパレーター";
    case "Text": {
      const text = dataModel ? resolveValue(dataModel, node.text) : undefined;
      const raw = typeof node.text === "string" ? node.text : text;
      return raw ? `${raw}` : (node.variant ?? "body");
    }
    case "Badge": {
      const text = dataModel ? resolveValue(dataModel, node.text) : undefined;
      return (typeof node.text === "string" ? node.text : text) || "バッジ";
    }
    case "MetricCard":
      return node.label || "KPIカード";
    case "ProgressBar":
      return node.label || "進捗バー";
    case "KeyValueList":
      return `${node.items.length}項目`;
    case "Alert": {
      const title = dataModel ? resolveValue(dataModel, node.title) : undefined;
      const text = dataModel ? resolveValue(dataModel, node.text) : undefined;
      return (typeof node.title === "string" ? node.title : title) || text || "お知らせ";
    }
    case "FilterChips":
      return `${node.options.length}カテゴリ`;
    case "TextField":
    case "NumberField":
    case "DateField":
    case "SelectField":
      return `${node.label}`;
    case "Button":
      return `${node.label}`;
    case "CategoryBreakdown":
      return "カテゴリ構成比";
    case "ExpenseList":
      return node.limit ? `最大${node.limit}件` : "全件表示";
  }
}

export interface PaletteBlueprintEntry extends BlockBlueprint {
  icon: LucideIcon;
}

export const BLOCK_BLUEPRINTS: PaletteBlueprintEntry[] = [
  // --- Smart Preset Blocks (複合ブロック) ---
  {
    id: "preset-kpi-trio",
    label: "3連 KPI サマリー行",
    description: "支出合計・予算残高・最多カテゴリが並ぶ定番の3カラムKPIセット",
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
    label: "月間予算トラッカーカード",
    description: "今月の予算消化率をプログレスバーでひと目で確認できるカード",
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
    label: "クイック支出入力カード",
    description: "内容・金額・カテゴリだけを素早く入力して登録できるコンパクトなフォーム",
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
    label: "詳細支出入力フォームカード",
    description: "日付やメモも含めてしっかり記録できるフル項目フォーム",
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
        placeholder: "お店の名前など",
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
    id: "preset-category-card",
    label: "カテゴリ別内訳カード",
    description: "どのカテゴリにいくら使っているかを割合バー付きで表示する分析カード",
    category: "preset",
    icon: PieChart,
    keywords: ["category", "breakdown", "chart", "カテゴリ", "内訳", "分析"],
    buildNodes: () => [
      {
        id: "breakdown-card",
        component: "Card",
        title: "カテゴリ別内訳",
        children: ["category-breakdown"],
      },
      {
        id: "category-breakdown",
        component: "CategoryBreakdown",
        dataPath: "/categories",
      },
    ],
  },
  {
    id: "preset-filterable-expenses",
    label: "フィルタ付き支出ログカード",
    description: "カテゴリチップで絞り込み＆個別削除ができる支出一覧カード",
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
    description: "ワンクリックでAIに今月の振り返りや節約アドバイスを聞けるショートカット",
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

  // --- Layout Primitives ---
  {
    id: "layout-grid-2",
    label: "2カラム グリッド (Grid)",
    description: "左右2列にカードやパーツを並べるレイアウト枠",
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
    label: "3カラム グリッド (Grid)",
    description: "KPIカードなどを3列に並べるレイアウト枠",
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
    label: "空のカード枠 (Card)",
    description: "タイトル付きのカードコンテナ（中に自由なパーツを追加可能）",
    category: "layout",
    icon: SquareStack,
    keywords: ["card", "box", "section", "カード", "枠"],
    buildNodes: () => [
      {
        id: "custom-card",
        component: "Card",
        title: "新しいセクション",
        children: [],
      },
    ],
  },
  {
    id: "layout-row",
    label: "横並びグループ (Row)",
    description: "入力欄やボタンを横に並べるコンテナ",
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
    label: "縦並びグループ (Column)",
    description: "複数のカードや要素を縦に積むコンテナ",
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
    label: "区切り線 (Divider)",
    description: "セクション間を視覚的に区切る水平ライン",
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

  // --- Display Primitives ---
  {
    id: "display-metric",
    label: "単体 KPI カード (MetricCard)",
    description: "合計金額・件数・平均値などの指標を1枚表示するカード",
    category: "display",
    icon: CreditCard,
    keywords: ["metric", "kpi", "stat", "数値", "指標"],
    buildNodes: () => [
      {
        id: "metric-card",
        component: "MetricCard",
        label: "合計支出",
        value: { "@path": "/summary/totalFormatted" },
        helper: { "@path": "/summary/periodLabel" },
      },
    ],
  },
  {
    id: "display-progress",
    label: "進捗バー (ProgressBar)",
    description: "目標や上限に対する達成率・消化率を表示するバー",
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
    id: "display-kv-list",
    label: "項目・値リスト (KeyValueList)",
    description: "ラベルと数値をすっきり縦に並べるサマリー表",
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
    id: "display-category-breakdown",
    label: "カテゴリ別内訳単体 (CategoryBreakdown)",
    description: "カード内の好きな場所に配置できるカテゴリ構成比ウィジェット",
    category: "display",
    icon: PieChart,
    keywords: ["category", "breakdown", "内訳"],
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
    label: "支出リスト単体 (ExpenseList)",
    description: "カード内に配置できる支出明細リスト",
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
    id: "display-alert",
    label: "お知らせ・メモバナー (Alert)",
    description: "家計のルールや注意事項を目立たせて表示するアラート",
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
    label: "見出し・テキスト (Text)",
    description: "セクション見出しや補足説明テキストを追加",
    category: "display",
    icon: Type,
    keywords: ["text", "heading", "title", "テキスト", "見出し"],
    buildNodes: () => [
      {
        id: "heading-text",
        component: "Text",
        variant: "h2",
        text: "セクション見出し",
      },
    ],
  },
  {
    id: "display-badge",
    label: "ステータスバッジ (Badge)",
    description: "データ連動または固定ラベルの小さなバッジ",
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

  // --- Form Primitives ---
  {
    id: "form-filter-chips",
    label: "カテゴリ絞り込みチップ (FilterChips)",
    description: "支出リストと連動するカテゴリ切り替えボタン群",
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
    label: "テキスト入力欄 (TextField)",
    description: "内容やメモを入力するテキストフィールド",
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
    label: "金額・数値入力欄 (NumberField)",
    description: "単位サフィックス付きの数値入力フィールド",
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
    label: "セレクト選択欄 (SelectField)",
    description: "カテゴリなどをドロップダウンから選ぶフィールド",
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
    label: "日付入力欄 (DateField)",
    description: "支出日を選択するカレンダー入力フィールド",
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
    label: "アクションボタン (Button)",
    description: "支出の登録またはAIへの質問を実行するボタン",
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
