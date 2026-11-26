import { useId } from "react";
import { a2uiComponentSchemas, type A2UIComponent } from "@/features/a2ui/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BuilderSwitchRow } from "../builder-controls";
import { useInspectorForm } from "./inspector-shared";

type ExpenseComponent = Extract<A2UIComponent, { component: "CategoryBreakdown" | "ExpenseList" }>;

interface ExpenseInspectorFieldsProps {
  node: ExpenseComponent;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}

export function ExpenseInspectorFields({ node, onUpdateNode }: ExpenseInspectorFieldsProps) {
  switch (node.component) {
    case "CategoryBreakdown":
      return <CategoryBreakdownFields node={node} onUpdateNode={onUpdateNode} />;
    case "ExpenseList":
      return <ExpenseListFields node={node} onUpdateNode={onUpdateNode} />;
  }
}

function CategoryBreakdownFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "CategoryBreakdown" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const emptyTextId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.CategoryBreakdown, onUpdateNode);

  return (
    <form.Field name="emptyText">
      {(field) => (
        <div className="space-y-1.5">
          <Label htmlFor={emptyTextId} className="text-xs">
            データ未登録時のメッセージ（任意）
          </Label>
          <Input
            id={emptyTextId}
            value={field.state.value ?? ""}
            placeholder="例：まだ支出データがありません"
            className="h-9 text-xs"
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        </div>
      )}
    </form.Field>
  );
}

function ExpenseListFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "ExpenseList" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const limitId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.ExpenseList, onUpdateNode);

  return (
    <>
      <form.Field name="limit">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={limitId} className="text-xs">
              表示件数の上限
            </Label>
            <Input
              id={limitId}
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
              onCheckedChange={(checked) =>
                field.handleChange(checked ? "/filter/category" : undefined)
              }
            />
          )}
        </form.Field>
        <form.Field name="showCategory">
          {(field) => (
            <BuilderSwitchRow
              label="カテゴリバッジを表示"
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </form.Field>
        <form.Field name="showDate">
          {(field) => (
            <BuilderSwitchRow
              label="支出日を表示"
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </form.Field>
        <form.Field name="showNote">
          {(field) => (
            <BuilderSwitchRow
              label="メモを表示"
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </form.Field>
        <form.Field name="allowDelete">
          {(field) => (
            <BuilderSwitchRow
              label="削除ボタンを表示"
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </form.Field>
      </div>
    </>
  );
}
