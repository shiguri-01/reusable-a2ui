import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import type { DataModel } from "@/features/a2ui/data-model";
import { a2uiComponentSchemas, type A2UIComponent } from "@/features/a2ui/types";
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
import {
  BoundNumberControl,
  BoundStringControl,
  BuilderSegmentedControl,
} from "../builder-controls";
import { useInspectorForm } from "./inspector-shared";

type DisplayComponent = Extract<
  A2UIComponent,
  { component: "Text" | "Badge" | "MetricCard" | "ProgressBar" | "Alert" | "KeyValueList" }
>;

interface DisplayInspectorFieldsProps {
  node: DisplayComponent;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}

export function DisplayInspectorFields({
  node,
  dataModel,
  onUpdateNode,
}: DisplayInspectorFieldsProps) {
  switch (node.component) {
    case "Text":
      return <TextFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
    case "Badge":
      return <BadgeFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
    case "MetricCard":
      return <MetricCardFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
    case "ProgressBar":
      return <ProgressBarFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
    case "Alert":
      return <AlertFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
    case "KeyValueList":
      return <KeyValueListFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />;
  }
}

function TextFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Text" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const variantId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.Text, onUpdateNode);

  return (
    <>
      <form.Field name="variant">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={variantId} className="text-xs">
              文字スタイル
            </Label>
            <Select
              value={field.state.value ?? "body"}
              onValueChange={(val) =>
                field.handleChange(val as "title" | "subtitle" | "body" | "caption" | "metric")
              }
            >
              <SelectTrigger id={variantId} className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title" className="text-xs">
                  タイトル
                </SelectItem>
                <SelectItem value="subtitle" className="text-xs">
                  サブタイトル
                </SelectItem>
                <SelectItem value="metric" className="text-xs">
                  強調数値
                </SelectItem>
                <SelectItem value="body" className="text-xs">
                  本文
                </SelectItem>
                <SelectItem value="caption" className="text-xs">
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
            value={field.state.value}
            dataModel={dataModel}
            onChange={(next) => field.handleChange(next ?? "")}
          />
        )}
      </form.Field>
    </>
  );
}

function BadgeFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Badge" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.Badge, onUpdateNode);

  return (
    <>
      <form.Field name="variant">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">デザイン</Label>
            <BuilderSegmentedControl
              size="xs"
              value={field.state.value ?? "secondary"}
              options={[
                { value: "default", label: "強調" },
                { value: "secondary", label: "標準" },
                { value: "outline", label: "枠線" },
                { value: "destructive", label: "警告" },
              ]}
              onChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="text">
        {(field) => (
          <BoundStringControl
            label="表示テキスト"
            value={field.state.value}
            dataModel={dataModel}
            onChange={(next) => field.handleChange(next ?? "")}
          />
        )}
      </form.Field>
    </>
  );
}

function MetricCardFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "MetricCard" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const labelInputId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.MetricCard, onUpdateNode);

  return (
    <>
      <form.Field
        name="label"
        validators={{ onChange: z.string().min(1, "指標ラベルを入力してください") }}
      >
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor={labelInputId} className="text-xs">
              指標ラベル
            </FieldLabel>
            <Input
              id={labelInputId}
              value={field.state.value}
              className="h-9 text-xs"
              placeholder="例：支出合計"
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name="value">
        {(field) => (
          <BoundStringControl
            label="メイン値"
            value={field.state.value}
            dataModel={dataModel}
            onChange={(next) => field.handleChange(next ?? "-")}
          />
        )}
      </form.Field>
      <form.Field name="helper">
        {(field) => (
          <BoundStringControl
            label="サブテキスト（任意）"
            value={field.state.value}
            dataModel={dataModel}
            allowEmpty
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
      <form.Field name="badge">
        {(field) => (
          <BoundStringControl
            label="右上バッジ（任意）"
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

function ProgressBarFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "ProgressBar" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const labelInputId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.ProgressBar, onUpdateNode);

  return (
    <>
      <form.Field name="label">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={labelInputId} className="text-xs">
              ラベル
            </Label>
            <Input
              id={labelInputId}
              value={field.state.value}
              className="h-9 text-xs"
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="value">
        {(field) => (
          <BoundNumberControl
            label="現在値"
            value={field.state.value}
            dataModel={dataModel}
            fallbackNumber={0}
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
      <form.Field name="max">
        {(field) => (
          <BoundNumberControl
            label="上限値"
            value={field.state.value}
            dataModel={dataModel}
            fallbackNumber={50000}
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
      <form.Field name="detail">
        {(field) => (
          <BoundStringControl
            label="右端の詳細表記（任意）"
            value={field.state.value}
            dataModel={dataModel}
            allowEmpty
            placeholder="未指定時は％を自動表示"
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
    </>
  );
}

function AlertFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Alert" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.Alert, onUpdateNode);

  return (
    <>
      <form.Field name="variant">
        {(field) => (
          <div className="space-y-1.5">
            <Label className="text-xs">種類</Label>
            <BuilderSegmentedControl
              size="xs"
              value={field.state.value ?? "info"}
              options={[
                { value: "info", label: "情報" },
                { value: "success", label: "完了" },
                { value: "warning", label: "注意" },
                { value: "destructive", label: "警告" },
              ]}
              onChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
      <form.Field name="title">
        {(field) => (
          <BoundStringControl
            label="見出し（任意）"
            value={field.state.value}
            dataModel={dataModel}
            allowEmpty
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
      <form.Field name="text">
        {(field) => (
          <BoundStringControl
            label="本文メッセージ"
            value={field.state.value}
            dataModel={dataModel}
            onChange={(next) => field.handleChange(next ?? "")}
          />
        )}
      </form.Field>
    </>
  );
}

function KeyValueListFields({
  node,
  dataModel,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "KeyValueList" }>;
  dataModel: DataModel;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.KeyValueList, onUpdateNode);

  return (
    <form.Field name="items">
      {(field) => {
        const items = field.state.value;
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
                  field.handleChange([
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
                      aria-label={`行 ${idx + 1} の項目名`}
                      className="h-8 flex-1 text-xs"
                      onChange={(e) => {
                        const next = items.map((it, i) =>
                          i === idx ? { ...it, label: e.target.value } : it,
                        );
                        field.handleChange(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                      disabled={items.length <= 1}
                      aria-label={`行 ${idx + 1} を削除`}
                      onClick={() => field.handleChange(items.filter((_, i) => i !== idx))}
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
                      field.handleChange(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </form.Field>
  );
}
