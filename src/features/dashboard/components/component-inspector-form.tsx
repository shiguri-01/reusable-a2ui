import { Fragment } from "react";
import { useForm } from "@tanstack/react-form";
import { ArrowDown, ArrowUp, Copy, Plus, Slash, Trash2 } from "lucide-react";
import { z } from "zod";
import type { DataModel } from "@/features/a2ui/data-model";
import { a2uiComponentSchema, type A2UIComponent } from "@/features/a2ui/types";
import { EXPENSE_CATEGORIES } from "@/features/expenses/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getComponentAncestors,
  isContainerComponent,
  type EditableSurfaceGraph,
} from "../lib/a2ui-builder";
import {
  COMPONENT_META,
  FORM_FIELD_BIND_OPTIONS,
  getComponentDisplayParts,
} from "../lib/catalog-registry";
import {
  BoundNumberControl,
  BoundStringControl,
  BuilderSegmentedControl,
  BuilderSwitchRow,
} from "./builder-controls";

interface ComponentInspectorProps {
  node: A2UIComponent;
  graph: EditableSurfaceGraph;
  dataModel: DataModel;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
  onMoveRelative: (nodeId: string, direction: "up" | "down") => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onRequestAddChild: (parentId: string) => void;
}

const GAP_OPTIONS = [
  { value: "sm", label: "狭め" },
  { value: "md", label: "標準" },
  { value: "lg", label: "広め" },
] as const;

export function ComponentInspector({
  node,
  graph,
  dataModel,
  onSelectNode,
  onUpdateNode,
  onMoveRelative,
  onDuplicate,
  onDelete,
  onRequestAddChild,
}: ComponentInspectorProps) {
  const isRoot = node.id === graph.rootId;
  const { icon: Icon } = COMPONENT_META[node.component];
  const display = getComponentDisplayParts(node, dataModel);
  const ancestors = getComponentAncestors(graph, node.id);
  const currentParentId = graph.parentById.get(node.id);
  const currentParent = currentParentId ? graph.componentsById.get(currentParentId) : undefined;

  const siblingIndex =
    currentParent && isContainerComponent(currentParent)
      ? currentParent.children.indexOf(node.id)
      : -1;
  const siblingCount =
    currentParent && isContainerComponent(currentParent) ? currentParent.children.length : 0;

  const form = useForm({
    defaultValues: node,
    validators: {
      onChange: a2uiComponentSchema,
    },
  });

  const commitPatch = <T extends A2UIComponent>(patch: Partial<T>) => {
    const current = form.state.values as T;
    const candidate = { ...current, ...patch };
    const parsed = a2uiComponentSchema.safeParse(candidate);
    if (parsed.success) {
      onUpdateNode(node.id, parsed.data);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Breadcrumb navigation */}
      {ancestors.length > 1 && (
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 text-xs">
          {ancestors.map((anc, idx) => {
            const isLast = idx === ancestors.length - 1;
            const ancLabel =
              anc.id === graph.rootId
                ? "ページ全体"
                : getComponentDisplayParts(anc, dataModel).primary;
            return (
              <Fragment key={anc.id}>
                {idx > 0 && (
                  <Slash aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectNode(anc.id)}
                  className={cn(
                    "h-6 max-w-36 truncate px-1.5 text-xs",
                    isLast ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{ancLabel}</span>
                </Button>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Selected Header & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {isRoot ? "ページ全体" : display.primary}
            </div>
            {!isRoot && display.secondary && (
              <div className="text-muted-foreground truncate text-xs">{display.secondary}</div>
            )}
          </div>
        </div>

        {!isRoot && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={siblingIndex <= 0}
              title="上へ移動"
              aria-label="上へ移動"
              onClick={() => onMoveRelative(node.id, "up")}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={siblingIndex < 0 || siblingIndex >= siblingCount - 1}
              title="下へ移動"
              aria-label="下へ移動"
              onClick={() => onMoveRelative(node.id, "down")}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="複製"
              aria-label="複製"
              onClick={() => onDuplicate(node.id)}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-7"
              title="削除"
              aria-label="削除"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isContainerComponent(node) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => onRequestAddChild(node.id)}
        >
          <Plus className="size-3.5" />
          中にブロックを追加
        </Button>
      )}

      {/* Component-specific TanStack Form controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-3.5"
      >
        {node.component === "Column" && (
          <form.Field name="gap">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">ブロック間の余白</Label>
                <BuilderSegmentedControl
                  value={(field.state.value as "sm" | "md" | "lg" | undefined) ?? "md"}
                  options={GAP_OPTIONS}
                  onChange={(val) => {
                    field.handleChange(val);
                    commitPatch({ gap: val });
                  }}
                />
              </div>
            )}
          </form.Field>
        )}

        {node.component === "Grid" && (
          <>
            <form.Field name="columns">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">カラム数</Label>
                  <BuilderSegmentedControl
                    value={String((field.state.value as number | undefined) ?? 2)}
                    options={[
                      { value: "1", label: "1列" },
                      { value: "2", label: "2列" },
                      { value: "3", label: "3列" },
                      { value: "4", label: "4列" },
                    ]}
                    onChange={(val) => {
                      const cols = Number(val) as 1 | 2 | 3 | 4;
                      field.handleChange(cols);
                      commitPatch({ columns: cols });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="gap">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">グリッドの余白</Label>
                  <BuilderSegmentedControl
                    value={(field.state.value as "sm" | "md" | "lg" | undefined) ?? "md"}
                    options={GAP_OPTIONS}
                    onChange={(val) => {
                      field.handleChange(val);
                      commitPatch({ gap: val });
                    }}
                  />
                </div>
              )}
            </form.Field>
          </>
        )}

        {node.component === "Row" && (
          <>
            <form.Field name="gap">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">横の余白</Label>
                  <BuilderSegmentedControl
                    value={(field.state.value as "sm" | "md" | "lg" | undefined) ?? "md"}
                    options={GAP_OPTIONS}
                    onChange={(val) => {
                      field.handleChange(val);
                      commitPatch({ gap: val });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="align">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">縦方向の揃え</Label>
                  <BuilderSegmentedControl
                    value={(field.state.value as "start" | "center" | "end" | undefined) ?? "start"}
                    options={[
                      { value: "start", label: "上揃え" },
                      { value: "center", label: "中央" },
                      { value: "end", label: "下揃え" },
                    ]}
                    onChange={(val) => {
                      field.handleChange(val);
                      commitPatch({ align: val });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="justify">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">横方向の配置</Label>
                  <BuilderSegmentedControl
                    value={
                      (field.state.value as "start" | "between" | "end" | undefined) ?? "start"
                    }
                    options={[
                      { value: "start", label: "左寄せ" },
                      { value: "between", label: "両端揃え" },
                      { value: "end", label: "右寄せ" },
                    ]}
                    onChange={(val) => {
                      field.handleChange(val);
                      commitPatch({ justify: val });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="wrap">
              {(field) => (
                <BuilderSwitchRow
                  label="複数行への折り返し"
                  checked={Boolean(field.state.value)}
                  onCheckedChange={(checked) => {
                    field.handleChange(checked);
                    commitPatch({ wrap: checked });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "Card" && (
          <>
            <form.Field name="title">
              {(field) => (
                <BoundStringControl
                  label="カードタイトル（任意）"
                  value={field.state.value as A2UIComponent extends { title?: infer U } ? U : never}
                  dataModel={dataModel}
                  allowEmpty
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ title: next });
                  }}
                />
              )}
            </form.Field>
            <form.Field name="description">
              {(field) => (
                <BoundStringControl
                  label="補足説明（任意）"
                  value={
                    field.state.value as A2UIComponent extends { description?: infer U } ? U : never
                  }
                  dataModel={dataModel}
                  allowEmpty
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ description: next });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "Text" && (
          <>
            <form.Field name="variant">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">文字スタイル</Label>
                  <Select
                    value={(field.state.value as string | undefined) ?? "body"}
                    onValueChange={(val) => {
                      const variant = val as "h1" | "h2" | "h3" | "body" | "muted" | "metric";
                      field.handleChange(variant);
                      commitPatch({ variant });
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h1" className="text-xs">
                        大見出し
                      </SelectItem>
                      <SelectItem value="h2" className="text-xs">
                        中見出し
                      </SelectItem>
                      <SelectItem value="h3" className="text-xs">
                        小見出し
                      </SelectItem>
                      <SelectItem value="metric" className="text-xs">
                        強調数値
                      </SelectItem>
                      <SelectItem value="body" className="text-xs">
                        本文
                      </SelectItem>
                      <SelectItem value="muted" className="text-xs">
                        補足テキスト
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <form.Field name="text">
              {(field) => (
                <BoundStringControl
                  label="表示内容"
                  value={field.state.value as string | { "@path": string }}
                  dataModel={dataModel}
                  onChange={(next) => {
                    const safe = next ?? "";
                    field.handleChange(safe);
                    commitPatch({ text: safe });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "Badge" && (
          <>
            <form.Field name="variant">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">デザイン</Label>
                  <BuilderSegmentedControl
                    size="xs"
                    value={
                      (field.state.value as
                        | "default"
                        | "secondary"
                        | "outline"
                        | "destructive"
                        | undefined) ?? "secondary"
                    }
                    options={[
                      { value: "default", label: "強調" },
                      { value: "secondary", label: "標準" },
                      { value: "outline", label: "枠線" },
                      { value: "destructive", label: "警告" },
                    ]}
                    onChange={(val) => {
                      field.handleChange(val);
                      commitPatch({ variant: val });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="text">
              {(field) => (
                <BoundStringControl
                  label="表示テキスト"
                  value={field.state.value as string | { "@path": string }}
                  dataModel={dataModel}
                  onChange={(next) => {
                    const safe = next ?? "";
                    field.handleChange(safe);
                    commitPatch({ text: safe });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "MetricCard" && (
          <>
            <form.Field
              name="label"
              validators={{ onChange: z.string().min(1, "指標ラベルを入力してください") }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel className="text-xs">指標ラベル</FieldLabel>
                  <Input
                    value={String(field.state.value ?? "")}
                    className="h-9 text-xs"
                    placeholder="例：支出合計"
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      commitPatch({ label: e.target.value });
                    }}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="value">
              {(field) => (
                <BoundStringControl
                  label="メイン値"
                  value={field.state.value as string | { "@path": string }}
                  dataModel={dataModel}
                  onChange={(next) => {
                    const safe = next ?? "-";
                    field.handleChange(safe);
                    commitPatch({ value: safe });
                  }}
                />
              )}
            </form.Field>
            <form.Field name="helper">
              {(field) => (
                <BoundStringControl
                  label="サブテキスト（任意）"
                  value={field.state.value as string | { "@path": string } | undefined}
                  dataModel={dataModel}
                  allowEmpty
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ helper: next });
                  }}
                />
              )}
            </form.Field>
            <form.Field name="badge">
              {(field) => (
                <BoundStringControl
                  label="右上バッジ（任意）"
                  value={field.state.value as string | { "@path": string } | undefined}
                  dataModel={dataModel}
                  allowEmpty
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ badge: next });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "ProgressBar" && (
          <>
            <form.Field name="label">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">ラベル</Label>
                  <Input
                    value={String(field.state.value ?? "")}
                    className="h-9 text-xs"
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      commitPatch({ label: e.target.value });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="value">
              {(field) => (
                <BoundNumberControl
                  label="現在値"
                  value={field.state.value as number | { "@path": string }}
                  dataModel={dataModel}
                  fallbackNumber={0}
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ value: next });
                  }}
                />
              )}
            </form.Field>
            <form.Field name="max">
              {(field) => (
                <BoundNumberControl
                  label="上限値"
                  value={field.state.value as number | { "@path": string } | undefined}
                  dataModel={dataModel}
                  fallbackNumber={50000}
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ max: next });
                  }}
                />
              )}
            </form.Field>
            <form.Field name="detail">
              {(field) => (
                <BoundStringControl
                  label="右端の詳細表記（任意）"
                  value={field.state.value as string | { "@path": string } | undefined}
                  dataModel={dataModel}
                  allowEmpty
                  placeholder="未指定時は％を自動表示"
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ detail: next });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "Alert" && (
          <>
            <form.Field name="variant">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">種類</Label>
                  <BuilderSegmentedControl
                    size="xs"
                    value={
                      (field.state.value as
                        | "info"
                        | "success"
                        | "warning"
                        | "destructive"
                        | undefined) ?? "info"
                    }
                    options={[
                      { value: "info", label: "情報" },
                      { value: "success", label: "完了" },
                      { value: "warning", label: "注意" },
                      { value: "destructive", label: "警告" },
                    ]}
                    onChange={(val) => {
                      field.handleChange(val);
                      commitPatch({ variant: val });
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="title">
              {(field) => (
                <BoundStringControl
                  label="見出し（任意）"
                  value={field.state.value as string | { "@path": string } | undefined}
                  dataModel={dataModel}
                  allowEmpty
                  onChange={(next) => {
                    field.handleChange(next);
                    commitPatch({ title: next });
                  }}
                />
              )}
            </form.Field>
            <form.Field name="text">
              {(field) => (
                <BoundStringControl
                  label="本文メッセージ"
                  value={field.state.value as string | { "@path": string }}
                  dataModel={dataModel}
                  onChange={(next) => {
                    const safe = next ?? "";
                    field.handleChange(safe);
                    commitPatch({ text: safe });
                  }}
                />
              )}
            </form.Field>
          </>
        )}

        {node.component === "KeyValueList" && (
          <form.Field name="items">
            {(field) => {
              const items = (field.state.value ?? []) as Extract<
                A2UIComponent,
                { component: "KeyValueList" }
              >["items"];
              const updateItems = (nextItems: typeof items) => {
                field.handleChange(nextItems);
                commitPatch({ items: nextItems });
              };
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">表示行</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() =>
                        updateItems([
                          ...items,
                          {
                            label: "項目",
                            value: { "@path": "/summary/totalFormatted" },
                          },
                        ])
                      }
                    >
                      <Plus className="size-3.5" />
                      行を追加
                    </Button>
                  </div>
                  <div className="divide-y rounded-lg border">
                    {items.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={item.label}
                            placeholder="項目名"
                            className="h-8 flex-1 text-xs"
                            onChange={(e) => {
                              const next = items.map((it, i) =>
                                i === idx ? { ...it, label: e.target.value } : it,
                              );
                              updateItems(next);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                            disabled={items.length <= 1}
                            onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <BoundStringControl
                          label="値"
                          value={item.value}
                          dataModel={dataModel}
                          onChange={(nextVal) => {
                            const next = items.map((it, i) =>
                              i === idx ? { ...it, value: nextVal ?? "-" } : it,
                            );
                            updateItems(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          </form.Field>
        )}

        {node.component === "CategoryBreakdown" && (
          <form.Field name="emptyText">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">データ未登録時のメッセージ（任意）</Label>
                <Input
                  value={String(field.state.value ?? "")}
                  placeholder="例：まだ支出データがありません"
                  className="h-9 text-xs"
                  onChange={(e) => {
                    const val = e.target.value || undefined;
                    field.handleChange(val);
                    commitPatch({ emptyText: val });
                  }}
                />
              </div>
            )}
          </form.Field>
        )}

        {node.component === "ExpenseList" && (
          <>
            <form.Field name="limit">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">表示件数の上限</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={field.state.value ? String(field.state.value) : ""}
                    placeholder="空欄で全件表示"
                    className="h-9 text-xs tabular-nums"
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      const num = raw === "" ? undefined : Math.max(1, Math.round(Number(raw)));
                      field.handleChange(num);
                      commitPatch({ limit: num });
                    }}
                  />
                </div>
              )}
            </form.Field>

            <div className="divide-y">
              <form.Field name="filterPath">
                {(field) => (
                  <BuilderSwitchRow
                    label="カテゴリ絞り込みと連動"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      const nextPath = checked ? "/filter/category" : undefined;
                      field.handleChange(nextPath);
                      commitPatch({ filterPath: nextPath });
                    }}
                  />
                )}
              </form.Field>
              <form.Field name="showCategory">
                {(field) => (
                  <BuilderSwitchRow
                    label="カテゴリバッジを表示"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      commitPatch({ showCategory: checked });
                    }}
                  />
                )}
              </form.Field>
              <form.Field name="showDate">
                {(field) => (
                  <BuilderSwitchRow
                    label="支出日を表示"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      commitPatch({ showDate: checked });
                    }}
                  />
                )}
              </form.Field>
              <form.Field name="showNote">
                {(field) => (
                  <BuilderSwitchRow
                    label="メモを表示"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      commitPatch({ showNote: checked });
                    }}
                  />
                )}
              </form.Field>
              <form.Field name="allowDelete">
                {(field) => (
                  <BuilderSwitchRow
                    label="削除ボタンを表示"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      commitPatch({ allowDelete: checked });
                    }}
                  />
                )}
              </form.Field>
            </div>
          </>
        )}

        {(node.component === "TextField" ||
          node.component === "NumberField" ||
          node.component === "DateField" ||
          node.component === "SelectField") && (
          <>
            <form.Field name="label">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">ラベル</Label>
                  <Input
                    value={String(field.state.value ?? "")}
                    className="h-9 text-xs"
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      commitPatch({ label: e.target.value });
                    }}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="bindPath">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">入力データの紐付け先</Label>
                  <Select
                    value={String(field.state.value ?? "/form/title")}
                    onValueChange={(nextPath) => {
                      field.handleChange(nextPath);
                      commitPatch({ bindPath: nextPath });
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_FIELD_BIND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.path} value={opt.path} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {(node.component === "TextField" || node.component === "NumberField") && (
              <form.Field name="placeholder">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs">プレースホルダー（任意）</Label>
                    <Input
                      value={String(field.state.value ?? "")}
                      className="h-9 text-xs"
                      onChange={(e) => {
                        const val = e.target.value || undefined;
                        field.handleChange(val);
                        commitPatch({ placeholder: val });
                      }}
                    />
                  </div>
                )}
              </form.Field>
            )}

            {node.component === "TextField" && (
              <form.Field name="required">
                {(field) => (
                  <BuilderSwitchRow
                    label="必須入力"
                    checked={Boolean(field.state.value)}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      commitPatch({ required: checked });
                    }}
                  />
                )}
              </form.Field>
            )}

            {node.component === "NumberField" && (
              <form.Field name="suffix">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs">単位（任意）</Label>
                    <Input
                      value={String(field.state.value ?? "")}
                      placeholder="例：円"
                      className="h-9 text-xs"
                      onChange={(e) => {
                        const val = e.target.value || undefined;
                        field.handleChange(val);
                        commitPatch({ suffix: val });
                      }}
                    />
                  </div>
                )}
              </form.Field>
            )}
          </>
        )}

        {(node.component === "FilterChips" || node.component === "SelectField") && (
          <form.Field name="options">
            {(field) => {
              const currentOptions = (field.state.value as string[] | undefined) ?? [];
              const toggleCat = (cat: string) => {
                const exists = currentOptions.includes(cat);
                const next = exists
                  ? currentOptions.length > 1
                    ? currentOptions.filter((c) => c !== cat)
                    : currentOptions
                  : [...currentOptions, cat];
                field.handleChange(next);
                commitPatch({ options: next });
              };
              return (
                <div className="space-y-1.5">
                  <Label className="text-xs">表示するカテゴリ</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const active = currentOptions.includes(cat);
                      return (
                        <Badge
                          key={cat}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer select-none"
                          onClick={() => toggleCat(cat)}
                        >
                          {cat}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          </form.Field>
        )}

        {node.component === "FilterChips" && (
          <form.Field name="allLabel">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">全件ボタンのラベル</Label>
                <Input
                  value={String(field.state.value ?? "すべて")}
                  className="h-9 text-xs"
                  onChange={(e) => {
                    field.handleChange(e.target.value || "すべて");
                    commitPatch({ allLabel: e.target.value || "すべて" });
                  }}
                />
              </div>
            )}
          </form.Field>
        )}

        {node.component === "Button" && (
          <>
            <form.Field name="label">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">ボタンラベル</Label>
                  <Input
                    value={String(field.state.value ?? "")}
                    className="h-9 text-xs"
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      commitPatch({ label: e.target.value });
                    }}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="variant">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">スタイル</Label>
                  <Select
                    value={(field.state.value as string | undefined) ?? "default"}
                    onValueChange={(val) => {
                      const variant = val as
                        | "default"
                        | "secondary"
                        | "outline"
                        | "destructive"
                        | "ghost";
                      field.handleChange(variant);
                      commitPatch({ variant });
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs">
                        プライマリ
                      </SelectItem>
                      <SelectItem value="secondary" className="text-xs">
                        セカンダリ
                      </SelectItem>
                      <SelectItem value="outline" className="text-xs">
                        アウトライン
                      </SelectItem>
                      <SelectItem value="ghost" className="text-xs">
                        ゴースト
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="fullWidth">
              {(field) => (
                <BuilderSwitchRow
                  label="横幅いっぱいに広げる"
                  checked={Boolean(field.state.value)}
                  onCheckedChange={(checked) => {
                    field.handleChange(checked);
                    commitPatch({ fullWidth: checked });
                  }}
                />
              )}
            </form.Field>

            <form.Field name="action">
              {(field) => {
                const act = (field.state.value as Extract<
                  A2UIComponent,
                  { component: "Button" }
                >["action"]) ?? { name: "createExpense" };
                const promptText = typeof act.payload?.text === "string" ? act.payload.text : "";
                return (
                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs">クリック時の動作</Label>
                      <Select
                        value={act.name}
                        onValueChange={(nextName) => {
                          const nextAction =
                            nextName === "sendPrompt"
                              ? {
                                  name: "sendPrompt",
                                  payload: {
                                    text: promptText || "今月の支出状況を分析して",
                                  },
                                }
                              : { name: "createExpense" };
                          field.handleChange(nextAction);
                          commitPatch({ action: nextAction });
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createExpense" className="text-xs">
                            フォームの入力内容で支出を登録
                          </SelectItem>
                          <SelectItem value="sendPrompt" className="text-xs">
                            AIアシスタントに質問を送信
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {act.name === "sendPrompt" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">送信する質問文</Label>
                        <Input
                          value={promptText}
                          placeholder="例：今月の食費の内訳を教えて"
                          className="h-9 text-xs"
                          onChange={(e) => {
                            const nextAction = {
                              name: "sendPrompt",
                              payload: { text: e.target.value },
                            };
                            field.handleChange(nextAction);
                            commitPatch({ action: nextAction });
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              }}
            </form.Field>
          </>
        )}
      </form>
    </div>
  );
}
