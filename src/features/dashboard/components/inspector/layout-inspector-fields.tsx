import type { DataModel } from "@/features/a2ui/data-model";
import { a2uiComponentSchemas, type A2UIComponent } from "@/features/a2ui/types";
import { Label } from "@/components/ui/label";
import { BoundStringControl, BuilderSegmentedControl, BuilderSwitchRow } from "../builder-controls";
import { GAP_OPTIONS, useInspectorForm } from "./inspector-shared";

type LayoutComponent = Extract<A2UIComponent, { component: "Column" | "Row" | "Grid" | "Card" }>;

interface LayoutInspectorFieldsProps {
  node: LayoutComponent;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}

export function LayoutInspectorFields({
  node,
  dataModel,
  onUpdateNode,
}: LayoutInspectorFieldsProps) {
  switch (node.component) {
    case "Column":
      return <ColumnFields node={node} onUpdateNode={onUpdateNode} />;
    case "Grid":
      return <GridFields node={node} onUpdateNode={onUpdateNode} />;
    case "Row":
      return <RowFields node={node} onUpdateNode={onUpdateNode} />;
    case "Card":
      return <CardFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
  }
}

function ColumnFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Column" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.Column, onUpdateNode);

  return (
    <form.Field name="gap">
      {(field) => (
        <div className="space-y-1.5">
          <Label className="text-xs">ブロック間の余白</Label>
          <BuilderSegmentedControl
            value={field.state.value ?? "md"}
            options={GAP_OPTIONS}
            onChange={(val) => field.handleChange(val)}
          />
        </div>
      )}
    </form.Field>
  );
}

function GridFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Grid" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.Grid, onUpdateNode);

  return (
    <>
      <form.Field name="columns">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">カラム数</Label>
            <BuilderSegmentedControl
              value={String(field.state.value ?? 2)}
              options={[
                { value: "1", label: "1列" },
                { value: "2", label: "2列" },
                { value: "3", label: "3列" },
                { value: "4", label: "4列" },
              ]}
              onChange={(val) => field.handleChange(Number(val) as 1 | 2 | 3 | 4)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="gap">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">グリッドの余白</Label>
            <BuilderSegmentedControl
              value={field.state.value ?? "md"}
              options={GAP_OPTIONS}
              onChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
    </>
  );
}

function RowFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Row" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.Row, onUpdateNode);

  return (
    <>
      <form.Field name="gap">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">横の余白</Label>
            <BuilderSegmentedControl
              value={field.state.value ?? "md"}
              options={GAP_OPTIONS}
              onChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="align">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">縦方向の揃え</Label>
            <BuilderSegmentedControl
              value={field.state.value ?? "start"}
              options={[
                { value: "start", label: "上揃え" },
                { value: "center", label: "中央" },
                { value: "end", label: "下揃え" },
              ]}
              onChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="justify">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">横方向の配置</Label>
            <BuilderSegmentedControl
              value={field.state.value ?? "start"}
              options={[
                { value: "start", label: "左寄せ" },
                { value: "between", label: "両端揃え" },
                { value: "end", label: "右寄せ" },
              ]}
              onChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="wrap">
        {(field) => (
          <BuilderSwitchRow
            label="複数行への折り返し"
            checked={Boolean(field.state.value)}
            onCheckedChange={(checked) => field.handleChange(checked)}
          />
        )}
      </form.Field>
    </>
  );
}

function CardFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Card" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.Card, onUpdateNode);

  return (
    <>
      <form.Field name="title">
        {(field) => (
          <BoundStringControl
            label="カードタイトル（任意）"
            value={field.state.value}
            dataModel={dataModel}
            allowEmpty
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
      <form.Field name="description">
        {(field) => (
          <BoundStringControl
            label="補足説明（任意）"
            value={field.state.value}
            dataModel={dataModel}
            allowEmpty
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
    </>
  );
}
