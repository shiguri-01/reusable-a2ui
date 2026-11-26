import { z } from "zod";

export const boundStringSchema = z.union([z.string(), z.object({ "@path": z.string() })]);
export const boundNumberSchema = z.union([z.number(), z.object({ "@path": z.string() })]);

export type BoundValue<T> = T | { "@path": string };

export const a2uiActionSchema = z.object({
  name: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type A2UIAction = z.infer<typeof a2uiActionSchema>;

export const a2uiComponentSchema = z.discriminatedUnion("component", [
  z.object({
    id: z.string().min(1),
    component: z.literal("Column"),
    children: z.array(z.string()),
    gap: z.enum(["sm", "md", "lg"]).optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Row"),
    children: z.array(z.string()),
    gap: z.enum(["sm", "md", "lg"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
    justify: z.enum(["start", "between", "end"]).optional(),
    wrap: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Grid"),
    children: z.array(z.string()),
    columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    gap: z.enum(["sm", "md", "lg"]).optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Card"),
    title: boundStringSchema.optional(),
    description: boundStringSchema.optional(),
    children: z.array(z.string()),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Divider"),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Text"),
    text: boundStringSchema,
    variant: z.enum(["h1", "h2", "h3", "body", "muted", "metric"]).optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Badge"),
    text: boundStringSchema,
    variant: z.enum(["default", "secondary", "outline", "destructive"]).optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("MetricCard"),
    label: z.string(),
    value: boundStringSchema,
    helper: boundStringSchema.optional(),
    badge: boundStringSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("ProgressBar"),
    label: z.string(),
    value: boundNumberSchema,
    max: boundNumberSchema.optional(),
    detail: boundStringSchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("CategoryBreakdown"),
    dataPath: z.string(),
    emptyText: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("FilterChips"),
    bindPath: z.string(),
    options: z.array(z.string()),
    allLabel: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("TextField"),
    label: z.string(),
    bindPath: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("NumberField"),
    label: z.string(),
    bindPath: z.string(),
    placeholder: z.string().optional(),
    min: z.number().optional(),
    suffix: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("DateField"),
    label: z.string(),
    bindPath: z.string(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("SelectField"),
    label: z.string(),
    bindPath: z.string(),
    options: z.array(z.string()),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Button"),
    label: z.string(),
    variant: z.enum(["default", "secondary", "outline", "destructive", "ghost"]).optional(),
    action: a2uiActionSchema,
    fullWidth: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("ExpenseList"),
    dataPath: z.string(),
    filterPath: z.string().optional(),
    showCategory: z.boolean().optional(),
    showDate: z.boolean().optional(),
    showNote: z.boolean().optional(),
    allowDelete: z.boolean().optional(),
    emptyText: z.string().optional(),
    limit: z.number().int().positive().optional(),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("KeyValueList"),
    items: z.array(
      z.object({
        label: z.string(),
        value: boundStringSchema,
        badge: boundStringSchema.optional(),
      }),
    ),
  }),
  z.object({
    id: z.string().min(1),
    component: z.literal("Alert"),
    title: boundStringSchema.optional(),
    text: boundStringSchema,
    variant: z.enum(["info", "success", "warning", "destructive"]).optional(),
  }),
]);

export type A2UIComponent = z.infer<typeof a2uiComponentSchema>;

export const a2uiMessageSchema = z.union([
  z.object({
    version: z.literal("0.9"),
    createSurface: z.object({
      surfaceId: z.string().min(1),
      catalogId: z.string().min(1),
      rootId: z.string().min(1),
    }),
  }),
  z.object({
    version: z.literal("0.9"),
    updateComponents: z.object({
      surfaceId: z.string().min(1),
      components: z.array(a2uiComponentSchema),
    }),
  }),
  z.object({
    version: z.literal("0.9"),
    updateDataModel: z.object({
      surfaceId: z.string().min(1),
      path: z.string().optional(),
      value: z.unknown(),
    }),
  }),
  z.object({
    version: z.literal("0.9"),
    deleteSurface: z.object({
      surfaceId: z.string().min(1),
    }),
  }),
]);

export type A2UIMessage = z.infer<typeof a2uiMessageSchema>;

export const a2uiMessagesSchema = z.array(a2uiMessageSchema).min(1);

export const EXPENSE_CATALOG_ID = "https://reusable-a2ui.local/catalogs/expense-shadcn-v1";
export const DASHBOARD_SURFACE_ID = "expense-dashboard";
export const CHAT_INLINE_SURFACE_ID = "chat-inline";
