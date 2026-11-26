import { Fragment } from "react";
import { useForm } from "@tanstack/react-form";
import { ArrowDown, ArrowUp, ChevronRight, Copy, FolderInput, Plus, Trash2, X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  getComponentAncestors,
  isContainerComponent,
  isDescendant,
  type EditableSurfaceGraph,
} from "../lib/a2ui-builder";
import {
  COMPONENT_META,
  FORM_FIELD_BIND_OPTIONS,
  summarizeComponent,
} from "../lib/catalog-registry";
import {
  BoundNumberControl,
  BoundStringControl,
  BuilderSegmentedControl,
  BuilderSwitchRow,
} from "./ui-sdk-controls";

interface ComponentInspectorProps {
  node: A2UIComponent;
  graph: EditableSurfaceGraph;
  dataModel: DataModel;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
  onMoveToContainer: (nodeId: string, targetParentId: string) => void;
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
  onMoveToContainer,
  onMoveRelative,
  onDuplicate,
  onDelete,
  onRequestAddChild,
}: ComponentInspectorProps) {
  const isRoot = node.id === graph.rootId;
  const meta = COMPONENT_META[node.component];
  const Icon = meta.icon;
  const ancestors = getComponentAncestors(graph, node.id);
  const currentParentId = graph.parentById.get(node.id);
  const currentParent = currentParentId ? graph.componentsById.get(currentParentId) : undefined;

  const siblingIndex =
    currentParent && isContainerComponent(currentParent)
      ? currentParent.children.indexOf(node.id)
      : -1;
  const siblingCount =
    currentParent && isContainerComponent(currentParent) ? currentParent.children.length : 0;

  const validContainers = graph.components
    .filter(isContainerComponent)
    .filter((c) => !isDescendant(graph.componentsById, node.id, c.id));

  // TanStack Form manages and validates the selected component's schema-typed state.
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
    <div className="bg-card space-y-3 rounded-xl border p-3 shadow-xs">
      {/* Breadcrumb navigation */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 text-[11px]">
          {ancestors.map((anc, idx) => {
            const isLast = idx === ancestors.length - 1;
            const ancLabel =
              anc.id === graph.rootId ? "root" : COMPONENT_META[anc.component].shortLabel;
            return (
              <Fragment key={anc.id}>
                {idx > 0 && <ChevronRight className="text-muted-foreground size-3 shrink-0" />}
                <button
                  type="button"
                  onClick={() => onSelectNode(anc.id)}
                  className={cn(
                    "cursor-pointer truncate rounded-xs px-1 py-0.5 transition-colors",
                    isLast
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {ancLabel}
                </button>
              </Fragment>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          title="選択を解除"
          aria-label="選択を解除"
          onClick={() => onSelectNode(null)}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Selected Header & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{meta.label}</div>
            <div className="text-muted-foreground truncate font-mono text-[10px]">#{node.id}</div>
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

      {meta.isContainer && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-full gap-1.5 text-xs"
          onClick={() => onRequestAddChild(node.id)}
        >
          <Plus className="size-3.5" />
          この{meta.shortLabel}の中にパーツを追加
        </Button>
      )}

      <Separator />

      {/* Component-specific TanStack Form controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="space-y-3"
      >
        {node.component === "Column" && (
          <form.Field name="gap">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">要素間の余白 (gap)</Label>
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
                  <Label className="text-xs">グリッド余白</Label>
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
                  description="幅が足りない場合に自動で改行します"
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
                  label="カードタイトル"
                  value={field.state.value as A2UIComponent extends { title?: infer U } ? U : never}
                  dataModel={dataModel}
                  allowEmpty
                  placeholder="タイトルなし"
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
                  placeholder="補足テキスト（省略可）"
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
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h1" className="text-xs">
                        大見出し (h1)
                      </SelectItem>
                      <SelectItem value="h2" className="text-xs">
                        中見出し (h2)
                      </SelectItem>
                      <SelectItem value="h3" className="text-xs">
                        小見出し (h3)
                      </SelectItem>
                      <SelectItem value="metric" className="text-xs">
                        強調数値 (metric)
                      </SelectItem>
                      <SelectItem value="body" className="text-xs">
                        標準テキスト (body)
                      </SelectItem>
                      <SelectItem value="muted" className="text-xs">
                        補足テキスト (muted)
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
                  placeholder="テキストを入力"
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
                  <Label className="text-xs">バッジデザイン</Label>
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
                  label="バッジ文字"
                  value={field.state.value as string | { "@path": string }}
                  dataModel={dataModel}
                  placeholder="バッジテキスト"
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
              validators={{ onChange: z.string().min(1, "見出しラベルを入力してください") }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel className="text-xs">指標ラベル</FieldLabel>
                  <Input
                    value={String(field.state.value ?? "")}
                    className="h-8 text-xs"
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
                  label="下部サブテキスト（任意）"
                  value={field.state.value as string | { "@path": string } | undefined}
                  dataModel={dataModel}
                  allowEmpty
                  placeholder="補足なし"
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
                  placeholder="バッジなし"
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
                    className="h-8 text-xs"
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
                  label="現在値 (value)"
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
                  label="上限値 (max)"
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
                  placeholder="未指定時は % を自動表示"
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
                  placeholder="見出しなし"
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">表示行 ({items.length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px]"
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
                      <Plus className="size-3" />
                      行を追加
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="bg-muted/30 space-y-2 rounded-lg border p-2.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={item.label}
                            placeholder="項目名"
                            className="h-7 flex-1 text-xs"
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
                <Label className="text-xs">データ未登録時のメッセージ</Label>
                <Input
                  value={String(field.state.value ?? "")}
                  placeholder="まだ支出データがありません"
                  className="h-8 text-xs"
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
                  <Label className="text-xs">最大表示件数（空欄で全件）</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={field.state.value ? String(field.state.value) : ""}
                    placeholder="全件表示"
                    className="h-8 text-xs tabular-nums"
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

            <div className="space-y-1.5">
              <form.Field name="filterPath">
                {(field) => (
                  <BuilderSwitchRow
                    label="カテゴリ絞り込みと連動"
                    description="FilterChips の選択状態に応じて絞り込みます"
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
                  <Label className="text-xs">フィールドラベル</Label>
                  <Input
                    value={String(field.state.value ?? "")}
                    className="h-8 text-xs"
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
                  <Label className="text-xs">データ保存先 (bindPath)</Label>
                  <Select
                    value={String(field.state.value ?? "/form/title")}
                    onValueChange={(nextPath) => {
                      field.handleChange(nextPath);
                      commitPatch({ bindPath: nextPath });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs">プレースホルダー</Label>
                    <Input
                      value={String(field.state.value ?? "")}
                      className="h-8 text-xs"
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
                    label="必須入力にする"
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
                    <Label className="text-xs">単位サフィックス</Label>
                    <Input
                      value={String(field.state.value ?? "")}
                      placeholder="例：円"
                      className="h-8 text-xs"
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
                  <Label className="text-xs">表示するカテゴリ選択肢</Label>
                  <div className="flex flex-wrap gap-1">
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
                <Label className="text-xs">全件表示ボタンのラベル</Label>
                <Input
                  value={String(field.state.value ?? "すべて")}
                  className="h-8 text-xs"
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
                    className="h-8 text-xs"
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
                  <Label className="text-xs">ボタンスタイル</Label>
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
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs">
                        プライマリ (塗りつぶし)
                      </SelectItem>
                      <SelectItem value="secondary" className="text-xs">
                        セカンダリ
                      </SelectItem>
                      <SelectItem value="outline" className="text-xs">
                        アウトライン (枠線)
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
                  <div className="space-y-2">
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
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createExpense" className="text-xs">
                            入力フォームから支出を登録 (createExpense)
                          </SelectItem>
                          <SelectItem value="sendPrompt" className="text-xs">
                            AIアシスタントに質問を送信 (sendPrompt)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {act.name === "sendPrompt" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">AIに送るメッセージ</Label>
                        <Input
                          value={promptText}
                          placeholder="例：今月の食費の内訳を教えて"
                          className="h-8 text-xs"
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

        {node.component === "Divider" && (
          <p className="text-muted-foreground text-xs">
            区切り線には追加の設定項目はありません。ドラッグして好きな位置へ移動できます。
          </p>
        )}

        {/* Reparent control for non-root components */}
        {!isRoot && currentParentId && validContainers.length > 1 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <FolderInput className="size-3" />
                配置先コンテナを変更
              </Label>
              <Select
                value={currentParentId}
                onValueChange={(targetId) => {
                  if (targetId !== currentParentId) {
                    onMoveToContainer(node.id, targetId);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validContainers.map((container) => {
                    const cMeta = COMPONENT_META[container.component];
                    return (
                      <SelectItem key={container.id} value={container.id} className="text-xs">
                        {container.id === graph.rootId
                          ? "ページ最上位 (root)"
                          : `${cMeta.shortLabel} (${container.id}) · ${summarizeComponent(container, dataModel)}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
