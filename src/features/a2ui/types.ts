import { z } from "zod";

export const A2UI_PROTOCOL_VERSION = "1.0" as const;
export const A2UI_ROOT_ID = "root" as const;

const boundStringSchema = z.union([z.string(), z.object({ "@path": z.string() })]);
const boundNumberSchema = z.union([z.number(), z.object({ "@path": z.string() })]);

export type BoundValue<T> = T | { "@path": string };

/**
 * A2UI v1.0 Action definition on components (`common_types.json#/$defs/Action`).
 */
const a2uiComponentActionSchema = z.object({
  event: z.object({
    name: z.string().min(1),
    userMessage: boundStringSchema.optional(),
    context: z.record(z.string(), z.unknown()).optional(),
  }),
});

/**
 * Outbound renderer-to-agent action event (`renderer_to_agent.json#/properties/action`).
 */
export interface A2UIAction {
  name: string;
  surfaceId?: string;
  sourceComponentId?: string;
  timestamp?: string;
  userMessage?: string;
  context?: Record<string, unknown>;
}

const componentCommonFields = {
  id: z.string().min(1),
  "@catalogId": z.string().min(1).optional(),
};

export const a2uiComponentSchemas = {
  Column: z.object({
    ...componentCommonFields,
    component: z.literal("Column"),
    children: z.array(z.string()),
    gap: z.enum(["sm", "md", "lg"]).optional(),
  }),
  Row: z.object({
    ...componentCommonFields,
    component: z.literal("Row"),
    children: z.array(z.string()),
    gap: z.enum(["sm", "md", "lg"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
    justify: z.enum(["start", "between", "end"]).optional(),
    wrap: z.boolean().optional(),
  }),
  Grid: z.object({
    ...componentCommonFields,
    component: z.literal("Grid"),
    children: z.array(z.string()),
    columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    gap: z.enum(["sm", "md", "lg"]).optional(),
  }),
  Card: z.object({
    ...componentCommonFields,
    component: z.literal("Card"),
    title: boundStringSchema.optional(),
    description: boundStringSchema.optional(),
    children: z.array(z.string()),
  }),
  Divider: z.object({
    ...componentCommonFields,
    component: z.literal("Divider"),
  }),
  Text: z.object({
    ...componentCommonFields,
    component: z.literal("Text"),
    text: boundStringSchema,
    variant: z.enum(["title", "subtitle", "body", "caption", "metric"]).optional(),
  }),
  Badge: z.object({
    ...componentCommonFields,
    component: z.literal("Badge"),
    text: boundStringSchema,
    variant: z.enum(["default", "secondary", "outline", "destructive"]).optional(),
  }),
  MetricCard: z.object({
    ...componentCommonFields,
    component: z.literal("MetricCard"),
    label: z.string(),
    value: boundStringSchema,
    helper: boundStringSchema.optional(),
    badge: boundStringSchema.optional(),
  }),
  ProgressBar: z.object({
    ...componentCommonFields,
    component: z.literal("ProgressBar"),
    label: z.string(),
    value: boundNumberSchema,
    max: boundNumberSchema.optional(),
    detail: boundStringSchema.optional(),
  }),
  CategoryBreakdown: z
    .object({
      ...componentCommonFields,
      component: z.literal("CategoryBreakdown"),
      dataPath: z.string(),
      emptyText: z.string().optional(),
      detailsPeriod: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("集計の年月・日付範囲・「全期間」。指定するとチャット内の各行から明細を開ける。"),
    })
    .describe("カテゴリ別の支出額と構成比を金額順の横棒で比較する。"),
  FilterChips: z.object({
    ...componentCommonFields,
    component: z.literal("FilterChips"),
    bindPath: z.string(),
    options: z.array(z.string()),
    allLabel: z.string().optional(),
  }),
  TextField: z.object({
    ...componentCommonFields,
    component: z.literal("TextField"),
    label: z.string(),
    bindPath: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
  }),
  NumberField: z.object({
    ...componentCommonFields,
    component: z.literal("NumberField"),
    label: z.string(),
    bindPath: z.string(),
    placeholder: z.string().optional(),
    min: z.number().optional(),
    suffix: z.string().optional(),
  }),
  DateField: z.object({
    ...componentCommonFields,
    component: z.literal("DateField"),
    label: z.string(),
    bindPath: z.string(),
  }),
  SelectField: z.object({
    ...componentCommonFields,
    component: z.literal("SelectField"),
    label: z.string(),
    bindPath: z.string(),
    options: z.array(z.string()),
  }),
  Button: z.object({
    ...componentCommonFields,
    component: z.literal("Button"),
    label: z.string(),
    variant: z.enum(["default", "secondary", "outline", "destructive", "ghost"]).optional(),
    action: a2uiComponentActionSchema.describe(
      "event.name が createExpense ならフォームの支出を登録。sendPrompt なら event.context.text をチャットに送る。",
    ),
    fullWidth: z.boolean().optional(),
  }),
  ExpenseList: z.object({
    ...componentCommonFields,
    component: z.literal("ExpenseList"),
    dataPath: z.string(),
    filterPath: z.string().optional(),
    showCategory: z.boolean().optional(),
    showDate: z.boolean().optional(),
    showNote: z.boolean().optional(),
    allowDelete: z
      .boolean()
      .optional()
      .describe("削除が依頼の目的に含まれる場合に、各明細に削除ボタンを表示する。"),
    emptyText: z.string().optional(),
    limit: z.number().int().positive().optional(),
  }),
  KeyValueList: z.object({
    ...componentCommonFields,
    component: z.literal("KeyValueList"),
    items: z.array(
      z.object({
        label: z.string(),
        value: boundStringSchema,
        badge: boundStringSchema.optional(),
      }),
    ),
  }),
  Alert: z.object({
    ...componentCommonFields,
    component: z.literal("Alert"),
    title: boundStringSchema.optional(),
    text: boundStringSchema,
    variant: z.enum(["info", "success", "warning", "destructive"]).optional(),
  }),
} as const;

export const a2uiComponentSchema = z.discriminatedUnion("component", [
  a2uiComponentSchemas.Column,
  a2uiComponentSchemas.Row,
  a2uiComponentSchemas.Grid,
  a2uiComponentSchemas.Card,
  a2uiComponentSchemas.Divider,
  a2uiComponentSchemas.Text,
  a2uiComponentSchemas.Badge,
  a2uiComponentSchemas.MetricCard,
  a2uiComponentSchemas.ProgressBar,
  a2uiComponentSchemas.CategoryBreakdown,
  a2uiComponentSchemas.FilterChips,
  a2uiComponentSchemas.TextField,
  a2uiComponentSchemas.NumberField,
  a2uiComponentSchemas.DateField,
  a2uiComponentSchemas.SelectField,
  a2uiComponentSchemas.Button,
  a2uiComponentSchemas.ExpenseList,
  a2uiComponentSchemas.KeyValueList,
  a2uiComponentSchemas.Alert,
]);

export type A2UIComponent = z.infer<typeof a2uiComponentSchema>;

/**
 * A2UI v1.0 Agent-to-Renderer messages (`specification/v1_0/json/agent_to_renderer.json`).
 */
const a2uiMessageSchema = z.union([
  z.strictObject({
    version: z.literal(A2UI_PROTOCOL_VERSION),
    createSurface: z
      .object({
        surfaceId: z.string().min(1),
        catalogId: z.string().min(1).optional(),
        sendDataModel: z.boolean().optional(),
        components: z.array(a2uiComponentSchema).min(1).optional(),
        dataModel: z.record(z.string(), z.unknown()).optional(),
        metadata: z
          .strictObject({
            extensions: z
              .record(z.string().regex(/^[\p{XID_Start}_]\p{XID_Continue}*$/u), z.unknown())
              .optional(),
          })
          .optional(),
      })
      .strict(),
  }),
  z.strictObject({
    version: z.literal(A2UI_PROTOCOL_VERSION),
    updateComponents: z
      .object({
        surfaceId: z.string().min(1),
        components: z.array(a2uiComponentSchema).min(1),
      })
      .strict(),
  }),
  z.strictObject({
    version: z.literal(A2UI_PROTOCOL_VERSION),
    updateDataModel: z
      .object({
        surfaceId: z.string().min(1),
        path: z.string().optional(),
        value: z.unknown(),
      })
      .strict()
      .refine((data) => "value" in data && data.value !== undefined, {
        message: "updateDataModel.value は必須です（削除する場合は null を指定）",
        path: ["value"],
      }),
  }),
  z.strictObject({
    version: z.literal(A2UI_PROTOCOL_VERSION),
    deleteSurface: z
      .object({
        surfaceId: z.string().min(1),
      })
      .strict(),
  }),
]);

export type A2UIMessage = z.infer<typeof a2uiMessageSchema>;

export const a2uiMessagesSchema = z.array(a2uiMessageSchema).min(1);

export const EXPENSE_CATALOG_ID = "reusable-a2ui.local:expense-shadcn-v1";
export const DASHBOARD_SURFACE_ID = "expense-dashboard";
export const CHAT_INLINE_SURFACE_ID = "chat-inline";
