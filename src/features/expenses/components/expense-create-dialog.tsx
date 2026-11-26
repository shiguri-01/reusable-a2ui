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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="space-y-1.5">
            <Label htmlFor="exp-title">内容</Label>
            <Input
              id="exp-title"
              name="title"
              value={form.data.title}
              onChange={(e) => form.setData("title", e.target.value)}
              placeholder="例：ランチ、電車賃"
              required
            />
            {form.errors.title && (
              <p className="text-destructive text-xs font-medium">{form.errors.title}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">金額 (円)</Label>
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
                required
              />
              {form.errors.amount && (
                <p className="text-destructive text-xs font-medium">{form.errors.amount}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-category">カテゴリ</Label>
              <Select
                value={form.data.category}
                onValueChange={(value) => form.setData("category", value)}
              >
                <SelectTrigger id="exp-category">
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
              {form.errors.category && (
                <p className="text-destructive text-xs font-medium">{form.errors.category}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">日付</Label>
              <Input
                id="exp-date"
                name="spentAt"
                type="date"
                value={form.data.spentAt}
                onChange={(e) => form.setData("spentAt", e.target.value)}
              />
              {form.errors.spentAt && (
                <p className="text-destructive text-xs font-medium">{form.errors.spentAt}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-note">メモ（任意）</Label>
              <Input
                id="exp-note"
                name="note"
                value={form.data.note}
                onChange={(e) => form.setData("note", e.target.value)}
                placeholder="お店の名前など"
              />
              {form.errors.note && (
                <p className="text-destructive text-xs font-medium">{form.errors.note}</p>
              )}
            </div>
          </div>

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
