import { useState } from "react";
import { Form, useForm } from "@void/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES, getTodayIso } from "../model";

export function ExpenseCreateDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm(
    "/expenses?create",
    {
      title: "",
      amount: 0,
      category: EXPENSE_CATEGORIES[0] as string,
      spentAt: getTodayIso(),
      note: "",
    },
    {
      resetOnSuccess: true,
      onSuccess: () => setOpen(false),
    },
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          form.clearErrors();
          form.clearError();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="size-4" />
          支出を追加
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>支出を追加</DialogTitle>
        </DialogHeader>
        <Form form={form} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={Boolean(form.errors.title) || undefined}>
              <FieldLabel htmlFor="exp-title">内容</FieldLabel>
              <Input
                id="exp-title"
                name="title"
                value={form.data.title}
                onChange={(e) => form.setData("title", e.target.value)}
                placeholder="例：ランチ、電車賃"
                aria-invalid={Boolean(form.errors.title) || undefined}
                aria-describedby={form.errors.title ? "exp-title-error" : undefined}
                required
              />
              <FieldError id="exp-title-error">{form.errors.title}</FieldError>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.errors.amount) || undefined}>
                <FieldLabel htmlFor="exp-amount">金額 (円)</FieldLabel>
                <Input
                  id="exp-amount"
                  name="amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.data.amount > 0 ? String(form.data.amount) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    form.setData("amount", raw === "" ? 0 : Math.round(Number(raw)));
                  }}
                  placeholder="1000"
                  className="text-right tabular-nums"
                  aria-invalid={Boolean(form.errors.amount) || undefined}
                  aria-describedby={form.errors.amount ? "exp-amount-error" : undefined}
                  required
                />
                <FieldError id="exp-amount-error">{form.errors.amount}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.errors.category) || undefined}>
                <FieldLabel htmlFor="exp-category">カテゴリ</FieldLabel>
                <Select
                  value={form.data.category}
                  onValueChange={(value) => form.setData("category", value)}
                >
                  <SelectTrigger
                    id="exp-category"
                    aria-invalid={Boolean(form.errors.category) || undefined}
                    aria-describedby={form.errors.category ? "exp-category-error" : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id="exp-category-error">{form.errors.category}</FieldError>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.errors.spentAt) || undefined}>
                <FieldLabel htmlFor="exp-date">日付</FieldLabel>
                <Input
                  id="exp-date"
                  name="spentAt"
                  type="date"
                  value={form.data.spentAt}
                  onChange={(e) => form.setData("spentAt", e.target.value)}
                  aria-invalid={Boolean(form.errors.spentAt) || undefined}
                  aria-describedby={form.errors.spentAt ? "exp-date-error" : undefined}
                />
                <FieldError id="exp-date-error">{form.errors.spentAt}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.errors.note) || undefined}>
                <FieldLabel htmlFor="exp-note">メモ（任意）</FieldLabel>
                <Input
                  id="exp-note"
                  name="note"
                  value={form.data.note}
                  onChange={(e) => form.setData("note", e.target.value)}
                  placeholder="お店の名前など"
                  aria-invalid={Boolean(form.errors.note) || undefined}
                  aria-describedby={form.errors.note ? "exp-note-error" : undefined}
                />
                <FieldError id="exp-note-error">{form.errors.note}</FieldError>
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              <Plus className="size-4" />
              追加する
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
