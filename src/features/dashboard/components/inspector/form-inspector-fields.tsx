import { useId } from "react";
import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle";
import { a2uiComponentSchemas, type A2UIComponent } from "@/features/a2ui/types";
import { EXPENSE_CATEGORIES } from "@/features/expenses/model";
import { badgeVariants } from "@/components/ui/badge";
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
import { FORM_FIELD_BIND_OPTIONS } from "../../lib/catalog-registry";
import { BuilderSwitchRow } from "../builder-controls";
import { useInspectorForm } from "./inspector-shared";

type FormComponent = Extract<
  A2UIComponent,
  {
    component: "FilterChips" | "TextField" | "NumberField" | "DateField" | "SelectField" | "Button";
  }
>;

interface FormInspectorFieldsProps {
  node: FormComponent;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}

export function FormInspectorFields({ node, onUpdateNode }: FormInspectorFieldsProps) {
  switch (node.component) {
    case "TextField":
      return <TextFieldFields node={node} onUpdateNode={onUpdateNode} />;
    case "NumberField":
      return <NumberFieldFields node={node} onUpdateNode={onUpdateNode} />;
    case "DateField":
      return <DateFieldFields node={node} onUpdateNode={onUpdateNode} />;
    case "SelectField":
      return <SelectFieldFields node={node} onUpdateNode={onUpdateNode} />;
    case "FilterChips":
      return <FilterChipsFields node={node} onUpdateNode={onUpdateNode} />;
    case "Button":
      return <ButtonFields node={node} onUpdateNode={onUpdateNode} />;
  }
}

function CommonBindableFieldControls({
  label,
  bindPath,
  onLabelChange,
  onBindPathChange,
}: {
  label: string;
  bindPath: string;
  onLabelChange: (next: string) => void;
  onBindPathChange: (next: string) => void;
}) {
  const labelInputId = useId();
  const bindPathId = useId();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={labelInputId} className="text-xs">
          ラベル
        </Label>
        <Input
          id={labelInputId}
          value={label}
          className="h-9 text-xs"
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={bindPathId} className="text-xs">
          入力データの紐付け先
        </Label>
        <Select value={bindPath} onValueChange={onBindPathChange}>
          <SelectTrigger id={bindPathId} className="h-9 text-xs">
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
    </>
  );
}

function CategoryOptionsPicker({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">表示するカテゴリ</Label>
      <ToggleGroup
        multiple
        value={options}
        aria-label="表示するカテゴリ"
        onValueChange={(next, details) => {
          if (next.length === 0) {
            details.cancel();
            return;
          }
          onChange(next);
        }}
        className="flex flex-wrap gap-1.5"
      >
        {EXPENSE_CATEGORIES.map((cat) => (
          <Toggle
            key={cat}
            value={cat}
            className={cn(
              badgeVariants({ variant: "outline" }),
              "data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:border-transparent focus-visible:ring-ring/50 cursor-pointer outline-none select-none focus-visible:ring-2",
            )}
          >
            {cat}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

function TextFieldFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "TextField" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const placeholderId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.TextField, onUpdateNode);

  return (
    <>
      <form.Field name="label">
        {(labelField) => (
          <form.Field name="bindPath">
            {(bindField) => (
              <CommonBindableFieldControls
                label={labelField.state.value}
                bindPath={bindField.state.value}
                onLabelChange={(next) => labelField.handleChange(next)}
                onBindPathChange={(next) => bindField.handleChange(next)}
              />
            )}
          </form.Field>
        )}
      </form.Field>

      <form.Field name="placeholder">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={placeholderId} className="text-xs">
              プレースホルダー（任意）
            </Label>
            <Input
              id={placeholderId}
              value={field.state.value ?? ""}
              className="h-9 text-xs"
              onChange={(e) => field.handleChange(e.target.value || undefined)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="required">
        {(field) => (
          <BuilderSwitchRow
            label="必須入力"
            checked={Boolean(field.state.value)}
            onCheckedChange={(checked) => field.handleChange(checked)}
          />
        )}
      </form.Field>
    </>
  );
}

function NumberFieldFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "NumberField" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const placeholderId = useId();
  const suffixId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.NumberField, onUpdateNode);

  return (
    <>
      <form.Field name="label">
        {(labelField) => (
          <form.Field name="bindPath">
            {(bindField) => (
              <CommonBindableFieldControls
                label={labelField.state.value}
                bindPath={bindField.state.value}
                onLabelChange={(next) => labelField.handleChange(next)}
                onBindPathChange={(next) => bindField.handleChange(next)}
              />
            )}
          </form.Field>
        )}
      </form.Field>

      <form.Field name="placeholder">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={placeholderId} className="text-xs">
              プレースホルダー（任意）
            </Label>
            <Input
              id={placeholderId}
              value={field.state.value ?? ""}
              className="h-9 text-xs"
              onChange={(e) => field.handleChange(e.target.value || undefined)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="suffix">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={suffixId} className="text-xs">
              単位（任意）
            </Label>
            <Input
              id={suffixId}
              value={field.state.value ?? ""}
              placeholder="例：円"
              className="h-9 text-xs"
              onChange={(e) => field.handleChange(e.target.value || undefined)}
            />
          </div>
        )}
      </form.Field>
    </>
  );
}

function DateFieldFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "DateField" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.DateField, onUpdateNode);

  return (
    <form.Field name="label">
      {(labelField) => (
        <form.Field name="bindPath">
          {(bindField) => (
            <CommonBindableFieldControls
              label={labelField.state.value}
              bindPath={bindField.state.value}
              onLabelChange={(next) => labelField.handleChange(next)}
              onBindPathChange={(next) => bindField.handleChange(next)}
            />
          )}
        </form.Field>
      )}
    </form.Field>
  );
}

function SelectFieldFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "SelectField" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const form = useInspectorForm(node, a2uiComponentSchemas.SelectField, onUpdateNode);

  return (
    <>
      <form.Field name="label">
        {(labelField) => (
          <form.Field name="bindPath">
            {(bindField) => (
              <CommonBindableFieldControls
                label={labelField.state.value}
                bindPath={bindField.state.value}
                onLabelChange={(next) => labelField.handleChange(next)}
                onBindPathChange={(next) => bindField.handleChange(next)}
              />
            )}
          </form.Field>
        )}
      </form.Field>

      <form.Field name="options">
        {(field) => (
          <CategoryOptionsPicker
            options={field.state.value}
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>
    </>
  );
}

function FilterChipsFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "FilterChips" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const allLabelId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.FilterChips, onUpdateNode);

  return (
    <>
      <form.Field name="options">
        {(field) => (
          <CategoryOptionsPicker
            options={field.state.value}
            onChange={(next) => field.handleChange(next)}
          />
        )}
      </form.Field>

      <form.Field name="allLabel">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={allLabelId} className="text-xs">
              全件ボタンのラベル
            </Label>
            <Input
              id={allLabelId}
              value={field.state.value ?? "すべて"}
              className="h-9 text-xs"
              onChange={(e) => field.handleChange(e.target.value || "すべて")}
            />
          </div>
        )}
      </form.Field>
    </>
  );
}

function ButtonFields({
  node,
  onUpdateNode,
}: {
  node: Extract<A2UIComponent, { component: "Button" }>;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
}) {
  const labelId = useId();
  const variantId = useId();
  const actionTypeId = useId();
  const promptTextId = useId();
  const form = useInspectorForm(node, a2uiComponentSchemas.Button, onUpdateNode);

  return (
    <>
      <form.Field name="label">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={labelId} className="text-xs">
              ボタンラベル
            </Label>
            <Input
              id={labelId}
              value={field.state.value}
              className="h-9 text-xs"
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="variant">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={variantId} className="text-xs">
              スタイル
            </Label>
            <Select
              value={field.state.value ?? "default"}
              onValueChange={(val) =>
                field.handleChange(
                  val as "default" | "secondary" | "outline" | "destructive" | "ghost",
                )
              }
            >
              <SelectTrigger id={variantId} className="h-9 text-xs">
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
                <SelectItem value="destructive" className="text-xs">
                  警告（赤）
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
            onCheckedChange={(checked) => field.handleChange(checked)}
          />
        )}
      </form.Field>

      <form.Field name="action">
        {(field) => {
          const act = field.state.value;
          const eventName = act.event.name;
          const promptText =
            typeof act.event.context?.text === "string" ? act.event.context.text : "";

          return (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor={actionTypeId} className="text-xs">
                  クリック時の動作
                </Label>
                <Select
                  value={eventName}
                  onValueChange={(nextName) => {
                    const nextAction =
                      nextName === "sendPrompt"
                        ? {
                            event: {
                              name: "sendPrompt",
                              context: {
                                text: promptText || "今月の支出状況を分析して",
                              },
                            },
                          }
                        : { event: { name: "createExpense" } };
                    field.handleChange(nextAction);
                  }}
                >
                  <SelectTrigger id={actionTypeId} className="h-9 text-xs">
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

              {eventName === "sendPrompt" && (
                <div className="space-y-1.5">
                  <Label htmlFor={promptTextId} className="text-xs">
                    送信する質問文
                  </Label>
                  <Input
                    id={promptTextId}
                    value={promptText}
                    placeholder="例：今月の食費の内訳を教えて"
                    className="h-9 text-xs"
                    onChange={(e) =>
                      field.handleChange({
                        event: {
                          name: "sendPrompt",
                          context: { text: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          );
        }}
      </form.Field>
    </>
  );
}
